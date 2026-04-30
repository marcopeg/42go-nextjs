# GitHub OAuth Setup Guide

This guide provides step-by-step instructions for setting up GitHub OAuth authentication for both development and production environments.

## Prerequisites

- GitHub account
- Access to your project's repository or organization settings
- NextAuth.js configured in your project (already done in this codebase)

## Development Environment Setup

### Step 1: Create GitHub OAuth App for Development

1. **Navigate to GitHub Settings**:

   - Go to [GitHub.com](https://github.com)
   - Click your profile picture in the top right
   - Select "Settings" from the dropdown

2. **Access Developer Settings**:

   - Scroll down in the left sidebar
   - Click "Developer settings" at the bottom

3. **Create New OAuth App**:

   - Click "OAuth Apps" in the left sidebar
   - Click "New OAuth App" button

4. **Fill in Application Details**:

   ```
   Application name: Your App Name (Dev)
   Homepage URL: http://localhost:3000
   Application description: Your app description (optional)
   Authorization callback URL: http://localhost:3000/api/auth/callback/github
   ```

5. **Register Application**:
   - Click "Register application"
   - Note down the "Client ID" displayed
   - Click "Generate a new client secret"
   - Copy the "Client Secret" (you won't see it again!)

### Step 2: Configure Development Environment

1. **Create Local Environment File**:

   ```bash
   cp .env.example .env.local
   ```

2. **Update .env.local with GitHub Credentials**:

   ```bash
   # NextAuth.js Configuration
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secure-random-string-here"

   # GitHub OAuth Configuration
   GITHUB_CLIENT_ID="your-github-client-id-from-step-1"
   GITHUB_CLIENT_SECRET="your-github-client-secret-from-step-1"

   # Database (keep your existing database config)
   PGSTRING="your-database-connection-string"
   ```

3. **Generate NEXTAUTH_SECRET** (if you don't have one):
   ```bash
   openssl rand -base64 32
   ```

### Step 3: Test Development Setup

1. **Start Development Server**:

   ```bash
   make app.start
   # or if make is not available:
   npm run dev
   ```

2. **Test OAuth Flow**:
   - Navigate to `http://localhost:3000/login`
   - You should see a "Sign in with GitHub" button
   - Click it to test the OAuth flow
   - You should be redirected to GitHub for authorization
   - After authorization, you should be redirected back to your app

## Production Environment Setup

### Step 1: Create GitHub OAuth App for Production

1. **Follow the same steps as development**, but with these differences:

   ```
   Application name: Your App Name (Production)
   Homepage URL: https://yourdomain.com
   Application description: Your app description (optional)
   Authorization callback URL: https://yourdomain.com/api/auth/callback/github
   ```

   **Important**: Replace `yourdomain.com` with your actual production domain.

### Step 2: Configure Production Environment

1. **Set Environment Variables in Your Production Environment**:

   The exact method depends on your hosting platform:

   **Vercel**:

   ```bash
   vercel env add GITHUB_CLIENT_ID
   vercel env add GITHUB_CLIENT_SECRET
   vercel env add NEXTAUTH_SECRET
   vercel env add NEXTAUTH_URL
   ```

   **Heroku**:

   ```bash
   heroku config:set GITHUB_CLIENT_ID=your-production-client-id
   heroku config:set GITHUB_CLIENT_SECRET=your-production-client-secret
   heroku config:set NEXTAUTH_SECRET=your-secure-random-string
   heroku config:set NEXTAUTH_URL=https://yourdomain.com
   ```

   **Docker/Self-hosted**:

   - Add to your `.env` file or docker-compose environment variables
   - Never commit production secrets to version control

### Step 3: Verify Production Setup

1. **Deploy your application** with the new environment variables
2. **Test the OAuth flow** on your production domain
3. **Verify callback URL** is working correctly
4. **Check logs** for any OAuth-related errors

## Security Considerations

### Environment Variables Security

- **Never commit** `.env.local` or production environment files to version control
- Use different OAuth apps for **development and production**
- **Rotate secrets regularly** in production
- Store production secrets in secure environment variable systems

### GitHub OAuth App Security

- **Restrict callback URLs** to only your domains
- **Use HTTPS** in production (required by GitHub)
- **Monitor OAuth app usage** in GitHub settings
- **Revoke unused OAuth apps** to minimize attack surface

## Troubleshooting

### Common Issues

1. **"OAuth App not found" Error**:

   - Verify `GITHUB_CLIENT_ID` is correct
   - Ensure the OAuth app exists in your GitHub settings

2. **"Redirect URI mismatch" Error**:

   - Check that callback URL in GitHub app matches your domain
   - Development: `http://localhost:3000/api/auth/callback/github`
   - Production: `https://yourdomain.com/api/auth/callback/github`

3. **"Invalid client secret" Error**:

   - Verify `GITHUB_CLIENT_SECRET` is correct
   - Generate a new client secret if needed

4. **"NEXTAUTH_URL not set" Error**:
   - Ensure `NEXTAUTH_URL` environment variable is set
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`

### Debug Mode

Enable NextAuth.js debug mode for detailed logging:

```bash
# Add to your .env.local
NEXTAUTH_DEBUG=true
```

### Testing Callback URLs

You can test if your callback URL is accessible:

```bash
# Development
curl http://localhost:3000/api/auth/callback/github

# Production
curl https://yourdomain.com/api/auth/callback/github
```

Both should return a NextAuth.js response (not a 404).

## Multiple Environments

If you need additional environments (staging, testing), create separate OAuth apps for each:

- **Development**: `http://localhost:3000/api/auth/callback/github`
- **Staging**: `https://staging.yourdomain.com/api/auth/callback/github`
- **Production**: `https://yourdomain.com/api/auth/callback/github`

Each environment should have its own `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.

## Next Steps

After completing this setup:

1. **Test the complete user flow** from login to logout
2. **Implement user profile management** for GitHub-authenticated users
3. **Add error handling** for OAuth failures
4. **Consider account linking** if users might have both credential and GitHub accounts
5. **Monitor OAuth usage** and user adoption

For additional social providers (Google, Facebook, Apple), follow similar patterns with provider-specific OAuth app creation and environment configuration.
