# Google Authentication Setup

This guide explains how to set up Google OAuth authentication for your application in both development and production environments.

## Overview

Google OAuth allows users to sign in to your application using their Google accounts. This feature is implemented as an optional authentication method that can be enabled by setting the appropriate environment variables.

## Prerequisites

- A Google account
- Access to Google Cloud Console

## Setting Up Google OAuth

### 1. Create a Google OAuth Application

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" and select "OAuth client ID"
5. If prompted, configure the OAuth consent screen:
   - Choose "External" or "Internal" user type (External for public apps)
   - Fill in the required information (app name, user support email, developer contact information)
   - Add the necessary scopes (typically `.../auth/userinfo.email` and `.../auth/userinfo.profile`)
   - Add test users if using External user type with testing status
6. Return to the Credentials page and create an OAuth client ID:
   - Select "Web application" as the application type
   - Give your OAuth client a name
   - Add authorized JavaScript origins and redirect URIs (see below)

### 2. Configure Redirect URIs

#### For Development

- **Authorized JavaScript origins**: `http://localhost:3000`
- **Authorized redirect URIs**: `http://localhost:3000/api/auth/callback/google`

#### For Production

- **Authorized JavaScript origins**: `https://your-production-domain.com`
- **Authorized redirect URIs**: `https://your-production-domain.com/api/auth/callback/google`

> **Note**: For production, you might want to create a separate OAuth client with the production redirect URI.

### 3. Get Your Client ID and Secret

After creating the OAuth client, Google will provide you with:

- **Client ID**: A public identifier for your app
- **Client Secret**: A secret key that should be kept secure

### 4. Configure Environment Variables

Add the following variables to your `.env` file (for development) or to your production environment:

```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_GOOGLE_ENABLED=true
```

> **Important**: Never commit your `.env` file containing the actual secrets to version control. The `.env.example` file in the repository shows the required variables without actual values.

## Database Configuration

This application uses a custom PostgreSQL schema named `auth` for all authentication-related tables. The OAuth providers like Google require the following tables to be properly set up:

- `auth.users` - Stores user information
- `auth.accounts` - Stores OAuth account information (including Google)
- `auth.sessions` - Stores session information
- `auth.verification_tokens` - Stores tokens for email verification

These tables should be created automatically when you run the database migrations. If you're experiencing issues with Google authentication related to database errors (like "relation 'account' does not exist"), make sure:

1. You've run the latest migrations
2. The database user has access to the `auth` schema
3. The DrizzleAdapter in `src/lib/auth/auth-options.ts` is properly configured to use the custom schema tables

## How It Works

1. When the environment variables are properly set, the Google login button will automatically appear on the login page.
2. The `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are used on the server side to authenticate with Google.
3. The `NEXT_PUBLIC_GOOGLE_ENABLED` variable is used on the client side to determine whether to show the Google login button.
4. This behavior effectively acts as a feature flag, allowing you to enable or disable Google authentication as needed.

## Testing the Integration

1. Set up the environment variables as described above
2. Start your application
3. Navigate to the login page
4. You should see a "Sign in with Google" button
5. Click the button and follow the Google authentication flow

## Troubleshooting

### Common Issues

1. **Google login button not appearing**:

   - Verify that `NEXT_PUBLIC_GOOGLE_ENABLED` is set to `"true"` in your environment variables
   - Verify that both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correctly set in your environment variables
   - Restart your application after setting the variables

2. **Authentication errors**:

   - Check that your redirect URI exactly matches what you configured in the Google OAuth client
   - Verify that your Client ID and Secret are correct
   - Make sure your OAuth consent screen is properly configured with the necessary scopes

3. **Redirect URI Mismatch**:

   - This usually means the redirect URI in your Google OAuth client settings doesn't match the actual redirect URI used by your application

4. **Hydration errors**:

   - If you see React hydration errors, make sure `NEXT_PUBLIC_GOOGLE_ENABLED` is properly set to the same value on both server and client

5. **Database errors**:
   - If you see errors like "relation 'account' does not exist", make sure your database migrations have been run and the custom schema tables are properly configured in the DrizzleAdapter

## Security Considerations

- Always keep your Client Secret secure and never expose it in client-side code
- Use HTTPS for production environments to protect authentication data
- Regularly rotate your Client Secret for enhanced security
- Configure the OAuth consent screen with only the necessary scopes

## Additional Resources

- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [NextAuth.js Google Provider Documentation](https://next-auth.js.org/providers/google)
- [DrizzleAdapter Documentation](https://authjs.dev/reference/adapter/drizzle)
