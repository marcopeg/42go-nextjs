import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for optimized production builds
  output: "standalone",

  // Official Next.js solution for external packages like Knex
  // This prevents Next.js from trying to bundle all Knex dialects
  // https://github.com/vercel/next.js/issues/52091#issuecomment-1623722996
  serverExternalPackages: ["knex"],
};

export default nextConfig;
