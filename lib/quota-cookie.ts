import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

/** HttpOnly cookie carrying the signed visitor id, day, and completion count. */
export const QUOTA_COOKIE_NAME = 'wiki_quota_vid';

/** Successful assistant completions allowed per visitor per UTC day. */
export const QUOTA_DAILY_CAP = 50;

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const COUNT = /^\d{1,6}$/;

export function mintVisitorId(): string {
  return randomUUID();
}

export function utcCalendarDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Payload is `visitorId|yyyy-mm-dd|count`. None of those three fields can contain
 * a dot, so `lastIndexOf('.')` still cleanly separates payload from signature.
 */
function payloadOf(visitorId: string, day: string, count: number): string {
  return `${visitorId}|${day}|${count}`;
}

function sign(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
}

export function formatQuotaCookieValue(
  visitorId: string,
  day: string,
  count: number,
  secret: string,
): string {
  const payload = payloadOf(visitorId, day, count);
  return `${payload}.${sign(secret, payload)}`;
}

export type QuotaCookie =
  | { ok: true; visitorId: string; day: string; count: number }
  | { ok: false };

/**
 * Verifies integrity only. A visitor can still discard the cookie for a fresh
 * bucket, or restore an older copy to roll the count back — the same limitation
 * the previous KV-backed design had for cleared cookies. Burst protection is the
 * edge rate-limit rule; the hard cost ceiling is the provider spend cap.
 */
export function verifyQuotaCookieValue(raw: string | undefined, secret: string): QuotaCookie {
  if (!raw?.trim()) return { ok: false };
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw.trim());
  } catch {
    return { ok: false };
  }

  const dot = decoded.lastIndexOf('.');
  if (dot <= 0 || dot === decoded.length - 1) return { ok: false };

  const payload = decoded.slice(0, dot);
  const sigHex = decoded.slice(dot + 1);
  if (!/^[0-9a-f]{64}$/i.test(sigHex)) return { ok: false };

  const [visitorId, day, countRaw, ...rest] = payload.split('|');
  if (rest.length > 0) return { ok: false };
  if (!visitorId || !day || !countRaw) return { ok: false };
  if (!UUID_V4.test(visitorId) || !ISO_DAY.test(day) || !COUNT.test(countRaw)) {
    return { ok: false };
  }

  const expected = sign(secret, payload);
  try {
    const a = Buffer.from(sigHex, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  } catch {
    return { ok: false };
  }

  return { ok: true, visitorId, day, count: Number(countRaw) };
}

export function parseCookieHeader(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  const parts = header.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name && rest.length > 0) return rest.join('=').trim();
  }
  return undefined;
}

export function buildQuotaSetCookieHeader(
  visitorId: string,
  day: string,
  count: number,
  secret: string,
): string {
  const value = encodeURIComponent(formatQuotaCookieValue(visitorId, day, count, secret));
  const secure = process.env.NODE_ENV === 'production';
  const maxAge = 400 * 24 * 60 * 60;
  const attrs = [
    `${QUOTA_COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}
