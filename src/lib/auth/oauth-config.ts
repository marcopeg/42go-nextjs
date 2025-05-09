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
 * Check if Google OAuth is enabled by verifying if the required environment variables are set
 * This function is used on the server side
 */
export function isGoogleOAuthEnabled(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Check if Facebook OAuth is enabled by verifying if the required environment variables are set
 * This function is used on the server side
 */
export function isFacebookOAuthEnabled(): boolean {
  return Boolean(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET);
}

/**
 * Check if password authentication is enabled
 * This function is used on the server side
 */
export function isPasswordAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PASSWORD_AUTH_ENABLED !== 'false';
}

/**
 * Update your .env file to include:
 * NEXT_PUBLIC_GITHUB_ENABLED="true" when GitHub OAuth is properly configured
 */
