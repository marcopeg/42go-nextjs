import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

// React/Turbopack dev tooling needs eval and live HMR connections.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  isDevelopment
    ? "connect-src 'self' ws: wss: http: https:"
    : "connect-src 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Enable standalone output for optimized production builds
  output: "standalone",

  // Official Next.js solution for external packages like Knex
  // This prevents Next.js from trying to bundle all Knex dialects
  // https://github.com/vercel/next.js/issues/52091#issuecomment-1623722996
  serverExternalPackages: ["knex"],

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
