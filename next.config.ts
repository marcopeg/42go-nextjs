import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,

  // Disable React Strict Mode to prevent double rendering in development
  // This will reduce the number of duplicate API calls (like /api/auth/session)
  reactStrictMode: false,
};

export default nextConfig;
