import { NextResponse, type NextRequest } from 'next/server';

/**
 * Canonical static paths — keep matchers narrow; home rewrite stays in
 * `next.config.ts` `rewrites.beforeFiles` (see comments in repo history).
 *
 * Spec: **`specs/urls-and-canonical-paths.md`**, **`specs/build-and-request-pipeline.md`**.
 */
/**
 * Hosts allowed to reach the assistant API. Vercel always assigns generated
 * `*.vercel.app` deployment URLs and they cannot be deleted, so without this an
 * abuser could skip the edge rate-limit rule by calling the origin directly.
 * Deployment Protection covers the same gap; this survives it being switched off.
 */
const ASSISTANT_HOSTS = new Set(['anush.wiki', 'www.anush.wiki', '127.0.0.1', 'localhost']);

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const lower = path.toLowerCase();

  if (lower.startsWith('/api/chat')) {
    const host = (request.headers.get('host') || '').split(':')[0].toLowerCase();
    if (!ASSISTANT_HOSTS.has(host)) {
      return NextResponse.json(
        { error: 'assistant_wrong_host', reply: 'the assistant is temporarily offline.' },
        { status: 403 },
      );
    }
    return NextResponse.next();
  }

  if (lower === '/index.html') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url, 308);
  }

  if (lower === '/about.html') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url, 308);
  }

  if (lower === '/blog/index.html') {
    const url = request.nextUrl.clone();
    url.pathname = '/blog/';
    return NextResponse.redirect(url, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/index.html', '/about.html', '/blog/index.html', '/api/chat/:path*', '/api/chat'],
};
