import type { NextConfig } from "next";

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
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none';",
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
