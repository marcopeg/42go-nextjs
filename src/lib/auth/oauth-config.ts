/**
 * Utility functions for OAuth configuration
 */

/**
 * Check if GitHub OAuth is enabled by verifying if the required environment variables are set
 * This function is used on the server side
 */
export function isGitHubOAuthEnabled(): boolean {
  return Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET);
}

/**
 * Update your .env file to include:
 * NEXT_PUBLIC_GITHUB_ENABLED="true" when GitHub OAuth is properly configured
 */
