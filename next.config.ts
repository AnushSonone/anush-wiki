import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /** Dev-only: webpack’s default eval-based source maps trip Chrome Issues (“CSP blocks eval”) even when your HTML sends no CSP. This keeps maps without `eval()`. */
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.devtool = 'cheap-module-source-map';
    }
    return config;
  },
  outputFileTracingIncludes: {
    '/api/chat/widget/route': ['./assistant/**/*'],
    '/api/chat/route': ['./assistant/**/*', './src/**/*'],
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
