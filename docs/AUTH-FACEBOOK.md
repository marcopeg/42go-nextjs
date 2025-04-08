# Facebook Authentication Setup

This guide explains how to set up Facebook OAuth authentication for your application in both development and production environments.

## Overview

Facebook OAuth allows users to sign in to your application using their Facebook accounts. This feature is implemented as an optional authentication method that can be enabled by setting the appropriate environment variables.

## Prerequisites

- A Facebook account
- Access to Facebook Developer Portal

## Setting Up Facebook OAuth

### 1. Create a Facebook App

1. Go to the [Facebook Developer Portal](https://developers.facebook.com/)
2. Click on "My Apps" and then "Create App"
3. Select the app type (most likely "Consumer" for standard web applications)
4. Fill in the required information:
   - App Name
   - App Contact Email
   - Business Account (optional)
5. Click "Create App" to proceed

### 2. Configure Facebook Login

1. From your app dashboard, click "Add Product" in the left sidebar
2. Find "Facebook Login" and click "Set Up"
3. Select "Web" as the platform
4. Enter your website URL (e.g., `http://localhost:3000` for development)
5. Click "Save" and then "Continue"
6. Navigate to the "Facebook Login" > "Settings" in the sidebar
7. Add the following OAuth Redirect URIs:

#### For Development

- `http://localhost:3000/api/auth/callback/facebook`

#### For Production

- `https://your-production-domain.com/api/auth/callback/facebook`

8. Under "Valid OAuth Redirect URIs", add the callback URLs
9. Save your changes

### 3. Configure App Settings

1. Go to "Settings" > "Basic" in the sidebar
2. Note your App ID and App Secret (you'll need these for your environment variables)
3. Add your Privacy Policy URL and Terms of Service URL if required
4. Fill in any other required fields
5. Save your changes

### 4. Get Your Client ID and Secret

From the "Settings" > "Basic" page, you'll need:

- **App ID**: This is your Client ID
- **App Secret**: This is your Client Secret

### 5. Configure Environment Variables

Add the following variables to your `.env` file (for development) or to your production environment:

```
FACEBOOK_CLIENT_ID=your_app_id
FACEBOOK_CLIENT_SECRET=your_app_secret
NEXT_PUBLIC_FACEBOOK_ENABLED=true
```

> **Important**: Never commit your `.env` file containing the actual secrets to version control. The `.env.example` file in the repository shows the required variables without actual values.

## Database Configuration

This application uses a custom PostgreSQL schema named `auth` for all authentication-related tables. The OAuth providers like Facebook require the following tables to be properly set up:

- `auth.users` - Stores user information
- `auth.accounts` - Stores OAuth account information (including Facebook)
- `auth.sessions` - Stores session information
- `auth.verification_tokens` - Stores tokens for email verification

These tables should be created automatically when you run the database migrations. If you're experiencing issues with Facebook authentication related to database errors (like "relation 'account' does not exist"), make sure:

1. You've run the latest migrations
2. The database user has access to the `auth` schema
3. The DrizzleAdapter in `src/lib/auth/auth-options.ts` is properly configured to use the custom schema tables

## How It Works

1. When the environment variables are properly set, the Facebook login button will automatically appear on the login page.
2. The `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` are used on the server side to authenticate with Facebook.
3. The `NEXT_PUBLIC_FACEBOOK_ENABLED` variable is used on the client side to determine whether to show the Facebook login button.
4. This behavior effectively acts as a feature flag, allowing you to enable or disable Facebook authentication as needed.

## Testing the Integration

1. Set up the environment variables as described above
2. Start your application
3. Navigate to the login page
4. You should see a "Sign in with Facebook" button
5. Click the button and follow the Facebook authentication flow

## Troubleshooting

### Common Issues

1. **Facebook login button not appearing**:

   - Verify that `NEXT_PUBLIC_FACEBOOK_ENABLED` is set to `"true"` in your environment variables
   - Verify that both `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` are correctly set in your environment variables
   - Restart your application after setting the variables

2. **Authentication errors**:

   - Check that your redirect URI exactly matches what you configured in the Facebook app
   - Verify that your App ID and App Secret are correct
   - Make sure your Facebook app is properly configured with the necessary permissions

3. **Redirect URI Mismatch**:

   - This usually means the redirect URI in your Facebook app settings doesn't match the actual redirect URI used by your application

4. **Hydration errors**:

   - If you see React hydration errors, make sure `NEXT_PUBLIC_FACEBOOK_ENABLED` is properly set to the same value on both server and client

5. **Database errors**:

   - If you see errors like "relation 'account' does not exist", make sure your database migrations have been run and the custom schema tables are properly configured in the DrizzleAdapter

6. **App Review Required**:
   - Facebook may require your app to go through App Review before certain features or permissions can be used in production
   - For development and testing with your own account, you can use the app without going through review

## Security Considerations

- Always keep your App Secret secure and never expose it in client-side code
- Use HTTPS for production environments to protect authentication data
- Regularly rotate your App Secret for enhanced security
- Request only the permissions your application actually needs

## Additional Resources

- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login/)
- [Facebook Developer Portal](https://developers.facebook.com/)
- [NextAuth.js Facebook Provider Documentation](https://next-auth.js.org/providers/facebook)
- [DrizzleAdapter Documentation](https://authjs.dev/reference/adapter/drizzle)
