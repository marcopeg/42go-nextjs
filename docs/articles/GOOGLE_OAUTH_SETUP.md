# Google OAuth Setup Guide

This guide provides step-by-step instructions for setting up Google OAuth authentication for both development and production environments.

## Overview

Google OAuth integration allows users to sign in with their Google accounts using OpenID Connect. This implementation follows the same patterns as the existing GitHub OAuth integration.

## Prerequisites

- Google Cloud Platform account
- Project with Google Cloud Console access
- Basic understanding of OAuth 2.0 flows

## Development Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter project name (e.g., "42Go NextJS Dev")
4. Click **Create**

### Step 2: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type → **Create**
3. Fill in required fields:
   - **App name**: "42Go NextJS" (or your app name)
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. **Scopes**: Add the following scopes:
   - `openid`
   - `profile`
   - `email`
5. **Test users**: Add your email for testing
6. Click **Save and Continue** through all steps

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Choose **Web application**
4. **Name**: "42Go NextJS Dev Client"
5. **Authorized redirect URIs**: Add:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

### Step 4: Update Environment Variables

1. Copy the credentials to your `.env.local` file:

   ```bash
   GOOGLE_CLIENT_ID="your-google-client-id-here"
   GOOGLE_CLIENT_SECRET="your-google-client-secret-here"
   ```

2. Ensure other NextAuth.js variables are set:
   ```bash
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   ```

### Step 5: Test the Integration

1. Start your development server: `make app.start`
2. Navigate to `/login`
3. You should see a "Sign in with Google" button
4. Click it and test the OAuth flow

## Production Setup

### Step 1: Create Production Project (Recommended)

For security, create a separate Google Cloud project for production:

1. Follow the same steps as development setup
2. Use a production-appropriate project name
3. Use your production domain in all configurations

### Step 2: Configure Production OAuth

1. In **OAuth consent screen**:

   - **App domain**: Your production domain
   - **Authorized domains**: Add your production domain
   - **Privacy Policy URL**: Add if required
   - **Terms of Service URL**: Add if required

2. In **OAuth 2.0 Client IDs**:
   - **Authorized redirect URIs**:
     ```
     https://yourdomain.com/api/auth/callback/google
     ```

### Step 3: Production Environment Variables

```bash
GOOGLE_CLIENT_ID="your-production-google-client-id"
GOOGLE_CLIENT_SECRET="your-production-google-client-secret"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-production-secret-key"
```

## Security Considerations

### OAuth Scopes

This implementation uses minimal scopes:

- `openid`: Required for OpenID Connect
- `profile`: User's basic profile information
- `email`: User's email address

### Client Secret Security

- **Never commit** client secrets to version control
- Use environment variables in all environments
- Rotate secrets periodically in production
- Consider using secret management services for production

### Domain Restrictions

- Always configure authorized redirect URIs exactly
- Use HTTPS in production environments
- Validate redirect URIs match your application domains

## Troubleshooting

### Common Issues

**Error: "redirect_uri_mismatch"**

- Verify the redirect URI in Google Console matches exactly: `http://localhost:3000/api/auth/callback/google` (dev) or `https://yourdomain.com/api/auth/callback/google` (prod)
- Check for trailing slashes or extra characters
- Ensure the URI scheme (http vs https) matches

**Error: "invalid_client"**

- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
- Check for extra spaces or characters in environment variables
- Ensure credentials are from the correct Google Cloud project

**Error: "access_denied"**

- User cancelled the OAuth flow (normal behavior)
- Check OAuth consent screen configuration
- Verify app is not restricted to specific users in production

**Error: "invalid_request"**

- Verify OAuth consent screen is properly configured
- Ensure all required scopes are configured
- Check that redirect URI format is correct

### Debug Steps

1. **Check Environment Variables**:

   ```bash
   echo $GOOGLE_CLIENT_ID
   echo $GOOGLE_CLIENT_SECRET
   ```

2. **Verify Console Configuration**:

   - Double-check redirect URIs
   - Confirm OAuth consent screen is published
   - Verify scopes are properly configured

3. **Check Application Logs**:
   - Look for NextAuth.js debug messages
   - Check browser network tab for OAuth requests
   - Review server logs for authentication errors

### Test Users

During development with "External" user type:

- Add test user emails in OAuth consent screen
- Only added users can sign in during testing phase
- Publish the app to allow all users

## Integration Notes

### Profile Mapping

Google OAuth profile data is mapped to our user schema:

```typescript
{
  id: profile.sub,        // Google's unique user ID
  name: profile.name,     // Full name
  email: profile.email,   // Email address
  image: profile.picture  // Profile picture URL
}
```

### Account Linking

- Users with existing accounts (credentials or GitHub) can link Google accounts
- Email-based linking automatically connects accounts with the same email
- Multiple OAuth providers can be linked to a single user account

### Session Management

- Uses JWT sessions for performance
- OAuth tokens stored in database for future API access
- Follows the same session patterns as GitHub OAuth

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [NextAuth.js Google Provider](https://next-auth.js.org/providers/google)
- [Google Cloud Console](https://console.cloud.google.com/)

---

_Remember: Chuck Norris doesn't need Google OAuth - Google OAuth needs Chuck Norris. But for the rest of us, this setup ensures secure and seamless authentication._
