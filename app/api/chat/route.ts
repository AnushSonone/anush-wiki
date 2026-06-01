import { createOpenAI } from '@ai-sdk/openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateText } from 'ai';
import type { LanguageModel } from 'ai';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  buildQuotaSetCookieHeader,
  mintVisitorId,
  parseCookieHeader,
  QUOTA_COOKIE_NAME,
  verifyQuotaCookieValue,
} from '../../../lib/quota-cookie';
import { loadResumePdfPlain, loadWikiPlainSnapshot } from '../../../lib/published-context';
import { quotaKey, releaseReservedSlot, reserveCompletionSlot, utcCalendarDate } from '../../../lib/quota-kv';
import { getQuotaRedis, isQuotaBypassDev } from '../../../lib/quota-redis';

export const runtime = 'nodejs';

/** Max completion tokens — keeps headroom for two full sentences; brevity comes from system prompt, not a tight cap (avoids mid-word cutoffs). */
const ASSISTANT_MAX_OUTPUT_TOKENS = 1024;

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

function clip(input: string, max: number) {
  if (input.length <= max) return input;
  return `${input.slice(0, max)}…`;
}

/** Plain widget surface — unwrap accidental markdown emphasis from model output. */
function stripAssistantMarkdownArtifacts(text: string): string {
  let s = text;
  for (let i = 0; i < 8; i++) {
    const next = s
      .replace(/\*\*([\s\S]*?)\*\*/g, '$1')
      .replace(/__([\s\S]*?)__/g, '$1');
    if (next === s) break;
    s = next;
  }
  return s;
}

/** Visitor-visible `reply` strings stay lowercase — specs/feature-assistant-chat.md. */
function withVisitorLowercaseReply<B extends Record<string, unknown>>(body: B): B {
  if (typeof body.reply !== 'string') return body;
  return {
    ...body,
    reply: body.reply.trim().toLocaleLowerCase('en-US'),
  };
}

/** JSON helper for payloads that MAY include assistant `reply` text. */
function jsonAssistant(payload: Record<string, unknown>, init?: ResponseInit) {
  return Response.json(withVisitorLowercaseReply(payload), init);
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
      maxOutputTokens: ASSISTANT_MAX_OUTPUT_TOKENS,
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

  /** Gemini requires `history` to begin with role `user`; client may open with assistant-only greeting. */
  while (history.length > 0 && history[0].role === 'model') {
    history.shift();
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const chat = model.startChat({ history });
      const result = await chat.sendMessage(last.content);
      return result.response.text();
    } catch (e) {
      lastErr = e;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 450));
    }
  }
  throw lastErr;
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

/** Prime HttpOnly quota cookie before POST (Phase A). GET does not require KV. */
export async function GET(req: Request) {
  const disabled =
    process.env.DISABLE_CHAT === '1' || process.env.DISABLE_CHAT === 'true' || process.env.DISABLE_CHAT === 'yes';

  if (disabled) {
    return jsonAssistant(
      { error: 'assistant_offline', reply: 'the assistant is temporarily offline.' },
      { status: 503 },
    );
  }

  if (isQuotaBypassDev()) {
    return new Response(null, { status: 204 });
  }

  const secret = process.env.QUOTA_COOKIE_SECRET?.trim();
  if (!secret) {
    return jsonAssistant(
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
    return jsonAssistant(
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
    return jsonAssistant({
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
      return jsonAssistant(
        {
          error: 'quota_misconfigured',
          reply: 'assistant quota is not configured on this server.',
        },
        { status: 503 },
      );
    }

    quotaRedis = getQuotaRedis();
    if (!quotaRedis) {
      return jsonAssistant(
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
      return jsonAssistant(
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
      return jsonAssistant(
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

  const baseSystem = await loadTextFile(8000, 'lib', 'assistant-system-prompt.txt');
  const wikiSnapshot = await loadWikiPlainSnapshot(14_000);
  const resumePdfPlain = await loadResumePdfPlain(8_000);

  const systemWithContext = [
    baseSystem || 'you help visitors understand this wiki. prefer accurate, humble answers.',
    'output contract (every assistant turn): if wiki/pdf text includes any grounded count, date range, rank, dollar, percent, duration, scale, client size, or similar figure that fits the visitor\'s answer, sentence one opens with those numerals (not tucked after narrative lead-ins). otherwise open with concrete name/date fact. stay within two finished sentences, each ending cleanly; prefer one sentence for vibes-only prompts; never trail mid-clause or start sentence three.',
    'live wiki (plain text from src/**/*.html on disk — redeploy picks up git changes):\n' + wikiSnapshot,
    'résumé pdf extract (plain text):\n' + resumePdfPlain,
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
        maxOutputTokens: ASSISTANT_MAX_OUTPUT_TOKENS,
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
    return jsonAssistant(
      {
        reply: `the model provider returned an error — try later or verify GOOGLE_* / OPENAI_* configuration.${suffix}`,
      },
      { status: 502 },
    );
  }

  const reply =
    stripAssistantMarkdownArtifacts((textOut || '').trim()) || '(empty model response)';
  return jsonAssistant({ reply });
}
