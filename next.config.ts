import type { NextConfig } from 'next';
import { BLOG_POST_SLUGS, blogPostCanonicalPath } from './lib/blog-post-slugs';

const nextConfig: NextConfig = {
  /** Dev-only: webpack’s default eval-based source maps trip Chrome Issues (“CSP blocks eval”) even when your HTML sends no CSP. This keeps maps without `eval()`. */
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.devtool = 'cheap-module-source-map';
    }
    return config;
  },
  outputFileTracingIncludes: {
    '/api/chat/widget/route': ['./assistant/chat-widget.js'],
    '/api/chat/route': ['./lib/assistant-system-prompt.txt', './src/**/*'],
  },
  /**
   * Static wiki routes use mirrored `.html` in `public/` (no root `app/page.tsx`).
   * - `/` → `/index.html`
   * - `/blog` and `/blog/` → `/blog/index.html` (otherwise `/blog` hits the App Router and 404s)
   * - `/blog/<slug>` → `/blog/<slug>.html` (clean post URLs; `.html` bookmarks 308 in middleware)
   *
   * Keep `/` rewrite here rather than middleware to avoid `/` vs `/index.html` redirect-loop regressions.
   */
  async rewrites() {
    const blogPostRewrites = BLOG_POST_SLUGS.map((slug) => ({
      source: blogPostCanonicalPath(slug),
      destination: `/blog/${slug}.html`,
    }));

    return {
      beforeFiles: [
        { source: '/', destination: '/index.html' },
        { source: '/blog', destination: '/blog/index.html' },
        { source: '/blog/', destination: '/blog/index.html' },
        ...blogPostRewrites,
      ],
    };
  },
  /** Blog post legacy bookmarks → clean `/blog/<slug>` (see `lib/blog-post-slugs.ts`). */
  async redirects() {
    const blogRedirects = BLOG_POST_SLUGS.flatMap((slug) => {
      const canonical = blogPostCanonicalPath(slug);
      return [
        { source: `/blog/${slug}.html`, destination: canonical, permanent: true },
        { source: `/${slug}.html`, destination: canonical, permanent: true },
        { source: `/${slug}`, destination: canonical, permanent: true },
        { source: `/writing/${slug}`, destination: canonical, permanent: true },
      ];
    });

    return [
      ...blogRedirects,
      { source: '/public/about/:file', destination: '/about/:file', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
