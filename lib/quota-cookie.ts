import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

/** HttpOnly cookie carrying signed visitor id for Phase A quotas. */
export const QUOTA_COOKIE_NAME = 'wiki_quota_vid';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function mintVisitorId(): string {
  return randomUUID();
}

function signVisitorId(secret: string, visitorId: string): string {
  return createHmac('sha256', secret).update(visitorId, 'utf8').digest('hex');
}

/** `visitorId` + `.` + hex HMAC (visitor id must be UUID v4; no dots inside id). */
export function formatQuotaCookieValue(visitorId: string, secret: string): string {
  return `${visitorId}.${signVisitorId(secret, visitorId)}`;
}

export function verifyQuotaCookieValue(
  raw: string | undefined,
  secret: string,
): { ok: true; visitorId: string } | { ok: false } {
  if (!raw?.trim()) return { ok: false };
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw.trim());
  } catch {
    return { ok: false };
  }
  const dot = decoded.lastIndexOf('.');
  if (dot <= 0 || dot === decoded.length - 1) return { ok: false };
  const visitorId = decoded.slice(0, dot);
  const sigHex = decoded.slice(dot + 1);
  if (!UUID_V4.test(visitorId) || !/^[0-9a-f]{64}$/i.test(sigHex)) return { ok: false };
  const expected = signVisitorId(secret, visitorId);
  try {
    const a = Buffer.from(sigHex, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false };
  } catch {
    return { ok: false };
  }
  return { ok: true, visitorId };
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

export function buildQuotaSetCookieHeader(visitorId: string, secret: string): string {
  const value = encodeURIComponent(formatQuotaCookieValue(visitorId, secret));
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
