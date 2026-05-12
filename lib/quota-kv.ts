import type { Redis } from '@upstash/redis';

/** Successful assistant completions allowed per visitor per UTC day (spec). */
export const QUOTA_DAILY_CAP = 50;

/** TTL for quota keys after last touch (48h covers UTC rollover). */
export const QUOTA_KEY_TTL_SECONDS = 172800;

const RESERVE_SCRIPT = `
local n = tonumber(redis.call('GET', KEYS[1]))
if n == nil then n = 0 end
local cap = tonumber(ARGV[1])
if n >= cap then return -1 end
redis.call('INCR', KEYS[1])
local ttl = redis.call('TTL', KEYS[1])
if ttl == nil or ttl < 0 then
  redis.call('EXPIRE', KEYS[1], tonumber(ARGV[2]))
end
return n + 1
`;

export function quotaKey(visitorId: string, utcYyyyMmDd: string): string {
  return `quota:${visitorId}:${utcYyyyMmDd}`;
}

export function utcCalendarDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Atomically reserve one completion slot if under cap. Caller must DECR on inference failure. */
export async function reserveCompletionSlot(
  redis: Redis,
  key: string,
): Promise<{ ok: true; count: number } | { ok: false }> {
  const raw = await redis.eval(RESERVE_SCRIPT, [key], [
    String(QUOTA_DAILY_CAP),
    String(QUOTA_KEY_TTL_SECONDS),
  ]);
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (n === -1) return { ok: false };
  return { ok: true, count: n };
}

export async function releaseReservedSlot(redis: Redis, key: string): Promise<void> {
  await redis.decr(key);
}
