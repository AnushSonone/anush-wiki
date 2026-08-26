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
  QUOTA_DAILY_CAP,
  utcCalendarDate,
  verifyQuotaCookieValue,
} from '../../../lib/quota-cookie';
import { loadKnowledgeBase } from '../../../lib/published-context';
import { selectChunks } from '../../../lib/knowledge-router';

export const runtime = 'nodejs';

/**
 * Visible reply budget. Replies are one or two short sentences (well under 100
 * tokens); thinkingBudget: 0 below keeps Gemini 2.5 from spending this cap on
 * thinking, so 256 is headroom rather than a ceiling that truncates answers.
 */
const ASSISTANT_MAX_OUTPUT_TOKENS = 256;

/** Visitor turns kept for the model; the router reads the last few user turns of these. */
const HISTORY_TURNS = 8;
const HISTORY_TURN_CHARS = 600;

/** Dev-only escape hatch so localhost does not need a signed cookie. */
function isQuotaBypassDev(): boolean {
  return (
    process.env.NODE_ENV === 'development'
    && (process.env.QUOTA_DISABLED_LOCAL === '1'
      || process.env.QUOTA_DISABLED_LOCAL === 'true'
      || process.env.QUOTA_DISABLED_LOCAL === 'yes')
  );
}

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
      /** Per-turn cost in the logs; free-tier budgeting. No visitor text here. */
      const usage = result.response.usageMetadata;
      console.info(
        '[api/chat] tokens',
        `prompt=${usage?.promptTokenCount ?? '?'}`,
        `output=${usage?.candidatesTokenCount ?? '?'}`,
      );
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

/** Persona prompt, read once per process. All behaviour rules live in that file. */
let personaPromise: Promise<string> | undefined;

function loadPersona(): Promise<string> {
  personaPromise ??= loadTextFile(4000, 'lib', 'assistant-system-prompt.txt').then(
    (text) => text || 'you help visitors understand this wiki. prefer accurate, humble answers.',
  );
  return personaPromise;
}

/**
 * System prompt for one turn: persona + the one-line topic index + only the notes
 * the router picked from the visitor's recent messages. Small talk gets no notes,
 * so there is nothing to recite; a fact question gets one or two small chunks.
 */
async function buildSystemContext(userTurns: string[]): Promise<string> {
  const [persona, kb] = await Promise.all([loadPersona(), loadKnowledgeBase()]);
  const chunks = selectChunks(userTurns, kb);
  const notes = chunks.length
    ? 'notes pulled for this turn (answer only from these):\n'
      + chunks.map((c) => `[${c.title}]\n${c.text}`).join('\n\n')
    : 'no notes pulled this turn. if they ask about anush, offer a topic from the index or ask which one.';
  return [persona, kb.index, notes].join('\n\n');
}

/** Prime the HttpOnly quota cookie before POST. */
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
    headers.append(
      'Set-Cookie',
      buildQuotaSetCookieHeader(mintVisitorId(), utcCalendarDate(), 0, secret),
    );
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

/** Set on the response only when a reply actually came back from the model. */
type QuotaCommit = { visitorId: string; day: string; next: number; secret: string };

export async function POST(req: Request) {
  let quotaCommit: QuotaCommit | undefined;

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

      const today = utcCalendarDate();
      /** Counter is per UTC day; a cookie carrying an older day starts over. */
      const used = verified.day === today ? verified.count : 0;
      if (used >= QUOTA_DAILY_CAP) {
        return jsonAssistant(
          {
            error: 'quota_exhausted',
            reply:
              `you have reached the daily limit for this assistant (${QUOTA_DAILY_CAP} replies per utc day). try again after midnight utc.`,
          },
          { status: 429 },
        );
      }

      /** Only a completed reply consumes quota, so the cookie is written on success. */
      quotaCommit = { visitorId: verified.visitorId, day: today, next: used + 1, secret };
    }

    const safeTurns = parsed.messages.slice(-HISTORY_TURNS).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: clip(m.content, HISTORY_TURN_CHARS),
    }));

    const systemWithContext = await buildSystemContext(
      safeTurns.filter((m) => m.role === 'user').map((m) => m.content),
    );

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
      /** No completion, so no quota is consumed — the cookie is simply not rewritten. */
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

    const headers = new Headers();
    if (quotaCommit) {
      headers.append(
        'Set-Cookie',
        buildQuotaSetCookieHeader(
          quotaCommit.visitorId,
          quotaCommit.day,
          quotaCommit.next,
          quotaCommit.secret,
        ),
      );
    }
    return jsonAssistant({ reply }, { headers });
  } catch (cause) {
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
