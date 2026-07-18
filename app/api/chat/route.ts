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

/**
 * Visible reply budget. Gemini 2.5 counts *thinking* tokens against this cap too —
 * keep headroom high and set thinkingBudget: 0 below so short wiki answers are not
 * truncated mid-clause (finishReason MAX_TOKENS).
 */
const ASSISTANT_MAX_OUTPUT_TOKENS = 2048;

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

/** Log-only — never append provider/stack text to visitor-facing replies. */
function logUpstreamFailure(cause: unknown) {
  if (cause instanceof Error) {
    console.error('[api/chat] upstream failure', clip(cause.message, 400));
    return;
  }
  console.error('[api/chat] upstream failure', cause);
}

async function geminiViaGoogleSdk(
  apiKey: string,
  modelId: string,
  systemWithContext: string,
  turns: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  /** thinkingConfig is supported by Gemini 2.5+; older SDK typings omit it. */
  const generationConfig = {
    maxOutputTokens: ASSISTANT_MAX_OUTPUT_TOKENS,
    temperature: 0.6,
    thinkingConfig: { thinkingBudget: 0 },
  };
  const model = genAI.getGenerativeModel({
    model: modelId,
    systemInstruction: systemWithContext,
    // Cast: @google/generative-ai typings lag Gemini 2.5 thinkingConfig.
    generationConfig: generationConfig as typeof generationConfig & {
      maxOutputTokens: number;
      temperature: number;
    },
  });

  const last = turns[turns.length - 1];
  if (!last || last.role !== 'user') {
    return '(nothing to answer. send a user message first.)';
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
      const text = (result.response.text() || '').trim();
      if (!text) {
        throw new Error('empty_model_text');
      }
      return text;
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
        reply: 'the assistant is temporarily offline.',
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
  let quotaRedis = null as ReturnType<typeof getQuotaRedis>;
  let qKey: string | undefined;
  let reservedSlot = false;

  try {
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
      return jsonAssistant(
        { error: 'invalid_body', reply: 'that message could not be read. try sending it again.' },
        { status: 422 },
      );
    }

    const googleKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
      ?? process.env.GEMINI_API_KEY?.trim();

    const openaiKey = process.env.OPENAI_API_KEY?.trim();

    if (!googleKey && !openaiKey) {
      return jsonAssistant(
        {
          error: 'model_unconfigured',
          reply: 'the assistant is temporarily offline.',
        },
        { status: 503 },
      );
    }

    const bypassQuota = isQuotaBypassDev();

    if (!bypassQuota) {
      const secret = process.env.QUOTA_COOKIE_SECRET?.trim();
      if (!secret) {
        return jsonAssistant(
          {
            error: 'quota_misconfigured',
            reply: 'the assistant is temporarily offline.',
          },
          { status: 503 },
        );
      }

      quotaRedis = getQuotaRedis();
      if (!quotaRedis) {
        return jsonAssistant(
          {
            error: 'quota_store_unconfigured',
            reply: 'the assistant is temporarily offline.',
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
        reservedSlot = false;
      }
      logUpstreamFailure(cause);
      return jsonAssistant(
        {
          error: 'upstream_unavailable',
          reply: 'the model is busy right now. try again in a moment.',
        },
        { status: 502 },
      );
    }

    const reply =
      stripAssistantMarkdownArtifacts((textOut || '').trim()) || '(empty model response)';
    return jsonAssistant({ reply });
  } catch (cause) {
    if (reservedSlot && quotaRedis && qKey) {
      await releaseReservedSlot(quotaRedis, qKey).catch(() => {});
    }
    console.error('[api/chat] unexpected failure', cause instanceof Error ? clip(cause.message, 400) : cause);
    return jsonAssistant(
      {
        error: 'assistant_unavailable',
        reply: 'the assistant hit a snag. reload and try again.',
      },
      { status: 500 },
    );
  }
}
