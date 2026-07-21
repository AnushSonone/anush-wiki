import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Control plane origin (same env as next.config rewrites). */
const RAFT_CP_URL = (process.env.RAFT_CP_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');

type RouteCtx = { params: Promise<{ path: string[] }> };

/**
 * Proxy /api/raft/* → RAFT_CP_URL/api/*.
 * Rewrites alone buffer SSE in Next dev; EventSource then never gets a complete
 * `data: …\n\n` frame and the HUD stays on "connecting…". Streaming this body
 * through a Route Handler fixes local (and keeps prod behavior identical).
 */
async function proxy(req: NextRequest, pathSegments: string[]) {
  const subpath = pathSegments.map(encodeURIComponent).join('/');
  const target = `${RAFT_CP_URL}/api/${subpath}${req.nextUrl.search}`;

  const headers = new Headers();
  const accept = req.headers.get('accept');
  if (accept) headers.set('accept', accept);
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: 'no-store',
    redirect: 'manual',
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = req.body;
    // Required when streaming a request body in Node fetch.
    (init as RequestInit & { duplex?: 'half' }).duplex = 'half';
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'upstream unreachable';
    return new Response(message, { status: 502 });
  }

  const out = new Headers();
  const pass = ['content-type', 'cache-control'];
  for (const key of pass) {
    const v = upstream.headers.get(key);
    if (v) out.set(key, v);
  }

  const isEventStream = (out.get('content-type') || '').includes('text/event-stream');
  if (isEventStream) {
    out.set('cache-control', 'no-cache, no-transform');
    out.set('connection', 'keep-alive');
    out.set('x-accel-buffering', 'no');
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: out,
  });
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
