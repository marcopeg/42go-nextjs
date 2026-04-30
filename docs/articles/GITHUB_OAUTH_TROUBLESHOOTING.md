# GitHub OAuth Troubleshooting Guide

This guide covers common issues and solutions when implementing GitHub OAuth authentication with NextAuth.js.

## Environment Configuration Issues

### Missing Environment Variables

**Error**: `500 Internal Server Error` or blank GitHub sign-in button

**Symptoms**:

- Console error: `Configuration error: Missing CLIENT_ID`
- GitHub button doesn't appear or is non-functional

**Solution**:

1. Ensure all required environment variables are set:
   ```bash
   GITHUB_CLIENT_ID="your-client-id"
   GITHUB_CLIENT_SECRET="your-client-secret"
   NEXTAUTH_URL="http://localhost:3000"  # or your domain
   NEXTAUTH_SECRET="your-random-secret"
   ```
2. Restart your development server after adding variables
3. For production, verify environment variables are set in your deployment platform

### Invalid NextAuth URL

**Error**: `redirect_uri_mismatch` from GitHub

**Symptoms**:

- OAuth callback fails with GitHub error
- URL in browser doesn't match configured callback URL

**Solution**:

1. Check `NEXTAUTH_URL` matches your actual domain:
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`
2. Ensure no trailing slash in `NEXTAUTH_URL`
3. Update GitHub OAuth app callback URL to match

## GitHub OAuth App Configuration

### Callback URL Mismatch

**Error**: `redirect_uri_mismatch`

**Symptoms**:

- Redirected to GitHub error page after clicking "Authorize"
- GitHub shows callback URL doesn't match

**Solution**:

1. Check GitHub OAuth app settings:
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Select your OAuth app
   - Verify "Authorization callback URL" matches:
     - Development: `http://localhost:3000/api/auth/callback/github`
     - Production: `https://yourdomain.com/api/auth/callback/github`
2. Update callback URL if incorrect
3. Ensure protocol (http/https) matches

### Wrong Application Type

**Error**: Various OAuth errors

**Symptoms**:

- Inconsistent OAuth behavior
- Unexpected permission scopes

**Solution**:

1. Ensure you created an "OAuth App" not a "GitHub App"
2. For OAuth Apps, go to: Settings > Developer settings > OAuth Apps
3. If you created a GitHub App by mistake, create a new OAuth App instead

## Database and Account Linking Issues

### Database Connection Errors

**Error**: `500 Internal Server Error` during OAuth callback

**Symptoms**:

- OAuth flow starts but fails during callback
- Console error about database connection

**Solution**:

1. Verify database connection string is correct
2. Ensure database is running and accessible
3. Check database has required tables:
   ```sql
   -- Required tables for OAuth
   auth.users
   auth.accounts
   auth.sessions (optional for JWT)
   auth.verification_tokens (optional)
   ```
4. Run migrations if tables don't exist

### Account Linking Conflicts

**Error**: `OAuthAccountNotLinked`

**Symptoms**:

- User gets error when trying to sign in with GitHub
- GitHub account already linked to different user

**Solutions**:

1. **User has existing account with same email**:
   - User should sign in with credentials first
   - Then link GitHub account from account settings (if implemented)
2. **GitHub account linked to different user**:

   - Check database for duplicate account links:
     ```sql
     SELECT * FROM auth.accounts WHERE provider = 'github' AND provider_account_id = 'github-user-id';
     ```
   - Remove orphaned account links if necessary

3. **Email mismatch**:
   - Ensure GitHub account has verified email
   - Check GitHub email visibility settings

### User Creation Failures

**Error**: `OAuthCreateAccount`

**Symptoms**:

- New GitHub users can't create accounts
- Database constraint violations

**Solution**:

1. Check database constraints on `auth.users` table
2. Verify email uniqueness constraints
3. Ensure user ID generation doesn't conflict:
   ```typescript
   // Our user ID format: usr_{timestamp}_{random}
   const newUserId = `usr_${Date.now()}_${Math.random()
     .toString(36)
     .substring(2)}`;
   ```

## Development Environment Issues

### HTTPS Requirements

**Error**: OAuth flow doesn't work in development

**Symptoms**:

- GitHub OAuth works in production but not locally
- Cookies not being set properly

**Solution**:

1. For development, HTTP is fine with localhost
2. Ensure `NEXTAUTH_URL` uses `http://localhost:3000`
3. If testing with custom domains, you may need HTTPS:
   ```bash
   # Use a tool like ngrok for HTTPS tunneling
   npx ngrok http 3000
   ```

### Session Storage Issues

**Error**: User not staying logged in

**Symptoms**:

- OAuth flow completes but user not authenticated
- Session expires immediately

**Solution**:

1. Check JWT configuration in `authOptions.ts`:
   ```typescript
   session: {
     strategy: "jwt",
     maxAge: 30 * 24 * 60 * 60, // 30 days
   }
   ```
2. Verify `NEXTAUTH_SECRET` is set and consistent
3. Check browser cookie settings (should allow localhost cookies)

## Production Deployment Issues

### Environment Variable Exposure

**Error**: Client-side errors about missing variables

**Symptoms**:

- Variables work in development but not production
- Build-time vs runtime variable issues

**Solution**:

1. Ensure environment variables are set in deployment platform
2. Don't prefix auth variables with `NEXT_PUBLIC_` (they should be server-side only)
3. Verify variables are available during both build and runtime

### Domain Configuration

**Error**: OAuth callback fails in production

**Symptoms**:

- Works in development but fails in production
- Redirect URI mismatch in production

**Solution**:

1. Update GitHub OAuth app with production callback URL
2. Verify `NEXTAUTH_URL` is set to production domain
3. Ensure HTTPS is properly configured
4. Check domain DNS and SSL certificate

## Common Error Codes

### NextAuth.js Error Codes

- `OAuthSignin`: Error during OAuth sign-in initiation
- `OAuthCallback`: Error during OAuth callback processing
- `OAuthCreateAccount`: Failed to create account after OAuth
- `EmailCreateAccount`: Email constraint violation during account creation
- `Callback`: General callback processing error
- `OAuthAccountNotLinked`: Account linking conflict
- `EmailSignin`: Credential authentication error
- `CredentialsSignin`: Invalid username/password
- `SessionRequired`: Authorization required for protected route

### GitHub API Error Codes

- `redirect_uri_mismatch`: Callback URL doesn't match OAuth app configuration
- `incorrect_client_credentials`: Invalid client ID or secret
- `bad_verification_code`: OAuth authorization code is invalid or expired
- `access_denied`: User denied OAuth authorization

## Debugging Tools

### Enable Debug Mode

Add to your environment for detailed logging:

```bash
NEXTAUTH_DEBUG=true
```

### Check OAuth Flow

1. **Network Tab**: Monitor OAuth redirects and API calls
2. **Console Logs**: Check for JavaScript errors during authentication
3. **Database Logs**: Monitor database queries during account creation/linking
4. **GitHub API**: Test OAuth app credentials with GitHub's API directly

### Useful Database Queries

```sql
-- Check user accounts
SELECT * FROM auth.users WHERE email = 'user@example.com';

-- Check OAuth account links
SELECT * FROM auth.accounts WHERE user_id = 'user-id';

-- Check for duplicate GitHub accounts
SELECT provider_account_id, COUNT(*)
FROM auth.accounts
WHERE provider = 'github'
GROUP BY provider_account_id
HAVING COUNT(*) > 1;
```

## Getting Help

1. **NextAuth.js Documentation**: https://next-auth.js.org/
2. **GitHub OAuth Documentation**: https://docs.github.com/en/developers/apps/building-oauth-apps
3. **Project Documentation**: Check `docs/GITHUB_OAUTH_SETUP.md` for setup instructions

---

_For additional support, check the project's Memory Bank documentation in the `PROJECT/` directory._
