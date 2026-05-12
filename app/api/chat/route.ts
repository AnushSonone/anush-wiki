import { createOpenAI } from '@ai-sdk/openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateText } from 'ai';
import type { LanguageModel } from 'ai';
import { constants as fsConstants, promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  buildQuotaSetCookieHeader,
  mintVisitorId,
  parseCookieHeader,
  QUOTA_COOKIE_NAME,
  verifyQuotaCookieValue,
} from '../../../lib/quota-cookie';
import { quotaKey, releaseReservedSlot, reserveCompletionSlot, utcCalendarDate } from '../../../lib/quota-kv';
import { getQuotaRedis, isQuotaBypassDev } from '../../../lib/quota-redis';

export const runtime = 'nodejs';

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(8000),
      }),
    )
    .max(24),
});

/** Corpus filenames only — avoids traversal via malicious names (spec). */
const CORPUS_TXT_RE = /^[a-z0-9][a-z0-9_-]*\.txt$/;

function clip(input: string, max: number) {
  if (input.length <= max) return input;
  return `${input.slice(0, max)}…`;
}

function safeProviderDetail(cause: unknown): string | undefined {
  if (cause instanceof Error) return clip(cause.message, 400);
  return undefined;
}

async function geminiViaGoogleSdk(
  apiKey: string,
  modelId: string,
  systemWithContext: string,
  turns: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: systemWithContext,
    generationConfig: {
      maxOutputTokens: 512,
      temperature: 0.6,
    },
  });

  const last = turns[turns.length - 1];
  if (!last || last.role !== 'user') {
    return '(nothing to answer — send a user message first.)';
  }

  const history = turns.slice(0, -1).map((m) => ({
    role: m.role === 'user' ? ('user' as const) : ('model' as const),
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(last.content);
  return result.response.text();
}

async function loadTextFile(limit: number, ...segments: string[]) {
  const filePath = path.join(process.cwd(), ...segments);
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return clip(raw.trim(), limit);
  } catch (e: unknown) {
    const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as NodeJS.ErrnoException).code) : '';
    if (code !== 'ENOENT') throw e;
    return '';
  }
}

async function loadCorpusSnippet(maxChars: number): Promise<string> {
  const dir = path.join(process.cwd(), 'assistant', 'knowledge');
  try {
    await fs.access(dir, fsConstants.R_OK);
  } catch {
    return '';
  }

  const names = await fs.readdir(dir);
  const files = names
    .filter((n) => CORPUS_TXT_RE.test(n))
    .sort((a, b) => a.localeCompare(b));

  let out = '';
  for (const name of files) {
    const fp = path.join(dir, name);
    const chunk = clip((await fs.readFile(fp, 'utf8')).trim(), 4000);
    if (!chunk) continue;
    out += `--- ${name} ---\n${chunk}\n\n`;
    if (out.length >= maxChars) break;
  }

  return clip(out.trim(), maxChars);
}

/** Prime HttpOnly quota cookie before POST (Phase A). GET does not require KV. */
export async function GET(req: Request) {
  const disabled =
    process.env.DISABLE_CHAT === '1' || process.env.DISABLE_CHAT === 'true' || process.env.DISABLE_CHAT === 'yes';

  if (disabled) {
    return Response.json(
      { error: 'assistant_offline', reply: 'the assistant is temporarily offline.' },
      { status: 503 },
    );
  }

  if (isQuotaBypassDev()) {
    return new Response(null, { status: 204 });
  }

  const secret = process.env.QUOTA_COOKIE_SECRET?.trim();
  if (!secret) {
    return Response.json(
      {
        error: 'quota_misconfigured',
        reply: 'assistant quota is not configured on this server.',
      },
      { status: 503 },
    );
  }

  const rawCookie = parseCookieHeader(req.headers.get('cookie'), QUOTA_COOKIE_NAME);
  const verified = verifyQuotaCookieValue(rawCookie, secret);

  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  if (!verified.ok) {
    const visitorId = mintVisitorId();
    headers.append('Set-Cookie', buildQuotaSetCookieHeader(visitorId, secret));
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

export async function POST(req: Request) {
  const disabled =
    process.env.DISABLE_CHAT === '1' || process.env.DISABLE_CHAT === 'true' || process.env.DISABLE_CHAT === 'yes';

  if (disabled) {
    return Response.json(
      { error: 'assistant_offline', reply: 'the assistant is temporarily offline.' },
      { status: 503 },
    );
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 422 });
  }

  const googleKey =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
    ?? process.env.GEMINI_API_KEY?.trim();

  const openaiKey = process.env.OPENAI_API_KEY?.trim();

  if (!googleKey && !openaiKey) {
    return Response.json({
      reply:
        'no model api key on the server — set GOOGLE_GENERATIVE_AI_API_KEY (gemini) or OPENAI_API_KEY in .env.local (never commit secrets).',
    });
  }

  const bypassQuota = isQuotaBypassDev();
  let quotaRedis = null as ReturnType<typeof getQuotaRedis>;
  let qKey: string | undefined;
  let reservedSlot = false;

  if (!bypassQuota) {
    const secret = process.env.QUOTA_COOKIE_SECRET?.trim();
    if (!secret) {
      return Response.json(
        {
          error: 'quota_misconfigured',
          reply: 'assistant quota is not configured on this server.',
        },
        { status: 503 },
      );
    }

    quotaRedis = getQuotaRedis();
    if (!quotaRedis) {
      return Response.json(
        {
          error: 'quota_store_unconfigured',
          reply: 'assistant quota store is not configured.',
        },
        { status: 503 },
      );
    }

    const rawCookie = parseCookieHeader(req.headers.get('cookie'), QUOTA_COOKIE_NAME);
    const verified = verifyQuotaCookieValue(rawCookie, secret);
    if (!verified.ok) {
      return Response.json(
        {
          error: 'assistant_cookies_required',
          reply:
            'this assistant needs first-party cookies for fair daily limits. allow cookies for this site, reload, then try again.',
        },
        { status: 403 },
      );
    }

    qKey = quotaKey(verified.visitorId, utcCalendarDate());
    const slot = await reserveCompletionSlot(quotaRedis, qKey);
    if (!slot.ok) {
      return Response.json(
        {
          error: 'quota_exhausted',
          reply:
            'you have reached the daily limit for this assistant (50 replies per utc day). try again after midnight utc.',
        },
        { status: 429 },
      );
    }
    reservedSlot = true;
  }

  const corpusRevision = await loadTextFile(32, 'assistant', 'CORPUS_REVISION');
  const baseSystem = await loadTextFile(8000, 'assistant', 'system-prompt.txt');
  const corpus = await loadCorpusSnippet(6200);

  const systemWithContext = [
    baseSystem || 'you help visitors understand this wiki. prefer accurate, humble answers.',
    corpusRevision ? `corpus_revision: ${corpusRevision}` : '',
    'published excerpts (facts about the author must agree with these; if missing, abstain):\n'
      + (corpus || '(no excerpts loaded.)'),
  ]
    .filter(Boolean)
    .join('\n\n');

  const safeTurns = parsed.messages.slice(-18).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: clip(m.content, 8000),
  }));

  const showDetail =
    process.env.NODE_ENV === 'development'
    || process.env.DEBUG_CHAT_ERRORS === '1'
    || process.env.DEBUG_CHAT_ERRORS === 'true';

  let textOut: string;
  try {
    if (googleKey) {
      const modelId = process.env.GOOGLE_AI_MODEL?.trim() || 'gemini-2.5-flash';
      textOut = await geminiViaGoogleSdk(googleKey, modelId, systemWithContext, safeTurns);
    } else {
      const openai = createOpenAI({ apiKey: openaiKey as string });
      const openaiModel = openai.chat(process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini');
      const { text } = await generateText({
        model: openaiModel as unknown as LanguageModel,
        system: systemWithContext,
        messages: safeTurns,
        maxOutputTokens: 512,
        temperature: 0.6,
        maxRetries: 1,
      });
      textOut = text;
    }
  } catch (cause) {
    if (reservedSlot && quotaRedis && qKey) {
      await releaseReservedSlot(quotaRedis, qKey).catch(() => {});
    }
    console.error('[api/chat] upstream failure', cause);
    const detail = safeProviderDetail(cause);
    const suffix = showDetail && detail ? ` (${detail})` : '';
    return Response.json(
      {
        reply: `the model provider returned an error — try later or verify GOOGLE_* / OPENAI_* configuration.${suffix}`,
      },
      { status: 502 },
    );
  }

  const reply = (textOut || '').trim() || '(empty model response)';
  return Response.json({ reply });
}
