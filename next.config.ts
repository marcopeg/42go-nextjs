import type { NextConfig } from 'next';

const isDevelopment = process.env.NODE_ENV === 'development';
const defaultLingoCafeAssetsBasePath = 'https://assets.lingocafe.app';

const getBuildCpus = () => {
  const value = Number(process.env.NEXT_BUILD_CPUS);
  return Number.isInteger(value) && value > 0 ? value : undefined;
};

const getLingoCafeAssetsRemotePattern = () => {
  const basePath = process.env.LC_ASSETS_BASE_PATH?.trim() || defaultLingoCafeAssetsBasePath;

  try {
    const url = new URL(basePath);
    const pathname = url.pathname.replace(/\/+$/, '');

    return new URL(`${url.origin}${pathname || ''}/**`);
  } catch {
    return new URL('https://assets.lingocafe.app/**');
  }
};

// React/Turbopack dev tooling needs eval and live HMR connections.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  isDevelopment ? "connect-src 'self' ws: wss: http: https:" : "connect-src 'self'",
  "frame-ancestors 'none'",
].join('; ');

const buildCpus = getBuildCpus();

const nextConfig: NextConfig = {
  allowedDevOrigins: ['42go.ngrok.app', 'lc42go.ngrok.app', 'nt42go.ngrok.app', 'ql42go.ngrok.app'],

  ...(buildCpus ? { experimental: { cpus: buildCpus } } : {}),

  // Enable standalone output for optimized production builds
  output: 'standalone',

  // Official Next.js solution for external packages like Knex
  // This prevents Next.js from trying to bundle all Knex dialects
  // https://github.com/vercel/next.js/issues/52091#issuecomment-1623722996
  serverExternalPackages: ['knex'],

  images: {
    remotePatterns: [getLingoCafeAssetsRemotePattern()],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
