# GitHub Authentication Setup

This guide explains how to set up GitHub OAuth authentication for your application in both development and production environments.

## Overview

GitHub OAuth allows users to sign in to your application using their GitHub accounts. This feature is implemented as an optional authentication method that can be enabled by setting the appropriate environment variables.

## Prerequisites

- A GitHub account
- Access to create OAuth applications in GitHub

## Setting Up GitHub OAuth

### 1. Create a GitHub OAuth Application

1. Go to your GitHub account settings
2. Navigate to "Developer settings" > "OAuth Apps" > "New OAuth App"
3. Fill in the application details:
   - **Application name**: Your application name (e.g., "My App - Development")
   - **Homepage URL**: Your application's homepage URL
   - **Application description**: (Optional) A description of your application
   - **Authorization callback URL**: This is the URL where GitHub will redirect users after authentication

### 2. Configure Callback URLs

#### For Development

- **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`

#### For Production

- **Authorization callback URL**: `https://your-production-domain.com/api/auth/callback/github`

> **Note**: For production, you might want to create a separate OAuth application with the production callback URL.

### 3. Get Your Client ID and Secret

After creating the OAuth application, GitHub will provide you with:

- **Client ID**: A public identifier for your app
- **Client Secret**: A secret key that should be kept secure

### 4. Configure Environment Variables

Add the following variables to your `.env` file (for development) or to your production environment:

```
GITHUB_ID=your_client_id
GITHUB_SECRET=your_client_secret
NEXT_PUBLIC_GITHUB_ENABLED=true
```

> **Important**: Never commit your `.env` file containing the actual secrets to version control. The `.env.example` file in the repository shows the required variables without actual values.

## Database Configuration

This application uses a custom PostgreSQL schema named `auth` for all authentication-related tables. The OAuth providers like GitHub require the following tables to be properly set up:

- `auth.users` - Stores user information
- `auth.accounts` - Stores OAuth account information (including GitHub)
- `auth.sessions` - Stores session information
- `auth.verification_tokens` - Stores tokens for email verification

These tables should be created automatically when you run the database migrations. If you're experiencing issues with GitHub authentication related to database errors (like "relation 'account' does not exist"), make sure:

1. You've run the latest migrations
2. The database user has access to the `auth` schema
3. The DrizzleAdapter in `src/lib/auth/auth-options.ts` is properly configured to use the custom schema tables

## How It Works

1. When the environment variables are properly set, the GitHub login button will automatically appear on the login page.
2. The `GITHUB_ID` and `GITHUB_SECRET` are used on the server side to authenticate with GitHub.
3. The `NEXT_PUBLIC_GITHUB_ENABLED` variable is used on the client side to determine whether to show the GitHub login button.
4. This behavior effectively acts as a feature flag, allowing you to enable or disable GitHub authentication as needed.

## Testing the Integration

1. Set up the environment variables as described above
2. Start your application
3. Navigate to the login page
4. You should see a "Sign in with GitHub" button
5. Click the button and follow the GitHub authentication flow

## Troubleshooting

### Common Issues

1. **GitHub login button not appearing**:

   - Verify that `NEXT_PUBLIC_GITHUB_ENABLED` is set to `"true"` in your environment variables
   - Verify that both `GITHUB_ID` and `GITHUB_SECRET` are correctly set in your environment variables
   - Restart your application after setting the variables

2. **Authentication errors**:

   - Check that your callback URL exactly matches what you configured in the GitHub OAuth application
   - Verify that your Client ID and Secret are correct

3. **Redirect URI Mismatch**:

   - This usually means the callback URL in your GitHub OAuth application settings doesn't match the actual callback URL used by your application

4. **Hydration errors**:

   - If you see React hydration errors, make sure `NEXT_PUBLIC_GITHUB_ENABLED` is properly set to the same value on both server and client

5. **Database errors**:
   - If you see errors like "relation 'account' does not exist", make sure your database migrations have been run and the custom schema tables are properly configured in the DrizzleAdapter

## Security Considerations

- Always keep your Client Secret secure and never expose it in client-side code
- Use HTTPS for production environments to protect authentication data
- Regularly rotate your Client Secret for enhanced security

## Additional Resources

- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps/creating-an-oauth-app)
- [NextAuth.js GitHub Provider Documentation](https://next-auth.js.org/providers/github)
- [DrizzleAdapter Documentation](https://authjs.dev/reference/adapter/drizzle)
