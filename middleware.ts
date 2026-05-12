import { NextResponse, type NextRequest } from 'next/server';

/** Serve static wiki `public/index.html` at `/` (App Router alone would 404 without a React page). */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/index.html';
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
