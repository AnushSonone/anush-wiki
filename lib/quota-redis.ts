import { Redis } from '@upstash/redis';

function pairFromEnv(urlEnv: string, tokenEnv: string): { url: string; token: string } | null {
  const url = process.env[urlEnv]?.trim();
  const token = process.env[tokenEnv]?.trim();
  if (!url || !token) return null;
  return { url, token };
}

/** Supports Vercel KV (`KV_REST_*`) and Upstash Redis (`UPSTASH_REDIS_REST_*`). */
export function getQuotaRedis(): Redis | null {
  const pair =
    pairFromEnv('KV_REST_API_URL', 'KV_REST_API_TOKEN')
    ?? pairFromEnv('UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN');
  if (!pair) return null;
  return new Redis({ url: pair.url, token: pair.token });
}

export function isQuotaBypassDev(): boolean {
  return (
    process.env.NODE_ENV === 'development'
    && (process.env.QUOTA_DISABLED_LOCAL === '1'
      || process.env.QUOTA_DISABLED_LOCAL === 'true'
      || process.env.QUOTA_DISABLED_LOCAL === 'yes')
  );
}
