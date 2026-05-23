import { NextResponse, type NextRequest } from 'next/server';

/**
 * Canonical home URLs — **matcher must be `/index.html` only**.
 *
 * - **`/` → `/index.html`** happens in **`next.config.ts`** `rewrites.beforeFiles`
 *   (never here). Middleware `rewrite('/') → /index.html` caused Next to re-invoke
 *   middleware on `/index.html`, which collided with `redirects()` or an
 *   `/index.html`→`/` rule and produced **ERR_TOO_MANY_REDIRECTS**.
 *
 * - **`next.config` `redirects()`** for `/index.html`→`/` was also unsafe in **dev**:
 *   it can apply after the internal rewrite and loop the same way.
 *
 * This file only handles **explicit browser requests** to `/index.html` → **`/`** (`308`).
 * Spec: **`specs/urls-and-canonical-paths.md`**, pipeline: **`specs/build-and-request-pipeline.md`**.
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path.toLowerCase() === '/index.html') {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/index.html'],
};
