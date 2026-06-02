import type { NextConfig } from 'next';

const isDevelopment = process.env.NODE_ENV === 'development';

const getBuildCpus = () => {
  const value = Number(process.env.NEXT_BUILD_CPUS);
  return Number.isInteger(value) && value > 0 ? value : undefined;
};

const getContentImageRemotePatterns = () => {
  const patterns = process.env.CONTENT_IMAGE_REMOTE_PATTERNS?.trim();
  if (!patterns) return [];

  return patterns
    .split(/[\s,]+/)
    .map((pattern) => pattern.trim())
    .filter(Boolean)
    .flatMap((pattern) => {
      try {
        const url = new URL(pattern);
        if (url.pathname === "/") url.pathname = "/**";
        return [url];
      } catch {
        return [];
      }
    });
};

// React/Turbopack dev tooling needs eval and live HMR connections.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: https:${isDevelopment ? " http:" : ""}`,
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
    remotePatterns: getContentImageRemotePatterns(),
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
