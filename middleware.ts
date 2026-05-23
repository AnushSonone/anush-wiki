import { NextResponse, type NextRequest } from 'next/server';

/**
 * Canonical static paths — keep matchers narrow; home rewrite stays in
 * `next.config.ts` `rewrites.beforeFiles` (see comments in repo history).
 *
 * Spec: **`specs/urls-and-canonical-paths.md`**, **`specs/build-and-request-pipeline.md`**.
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const lower = path.toLowerCase();

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
  matcher: ['/index.html', '/about.html', '/blog/index.html'],
};
