import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,

  // Disable React Strict Mode to prevent double rendering in development
  // This will reduce the number of duplicate API calls (like /api/auth/session)
  // reactStrictMode: false,

  // Enable MDX support
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],

  // Enable standalone mode for production
  output:
    process.env.NEXT_BUILD_OUTPUT === 'standalone'
      ? 'standalone'
      : process.env.NEXT_BUILD_OUTPUT === 'export'
        ? 'export'
        : undefined,
};

export default nextConfig;
