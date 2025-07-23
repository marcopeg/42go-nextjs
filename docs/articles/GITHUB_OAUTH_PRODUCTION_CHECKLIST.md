# GitHub OAuth Production Deployment Checklist

Use this checklist to ensure your GitHub OAuth implementation is ready for production deployment.

## Pre-Deployment Setup

### 1. GitHub OAuth Application Configuration

- [ ] **Create Production OAuth App**

  - Go to GitHub Settings > Developer settings > OAuth Apps
  - Click "New OAuth App"
  - Use production domain for all URLs

- [ ] **Configure OAuth App Settings**

  - [ ] Application name: `Your App Name (Production)`
  - [ ] Homepage URL: `https://yourdomain.com`
  - [ ] Authorization callback URL: `https://yourdomain.com/api/auth/callback/github`
  - [ ] Application description: Clear description of your app's purpose

- [ ] **Record OAuth Credentials**
  - [ ] Copy Client ID for production environment variables
  - [ ] Generate and copy Client Secret
  - [ ] Store credentials securely (password manager, secret management system)

### 2. Environment Variables Configuration

- [ ] **Set Required Variables in Production**

  ```bash
  GITHUB_CLIENT_ID="prod-client-id"
  GITHUB_CLIENT_SECRET="prod-client-secret"
  NEXTAUTH_URL="https://yourdomain.com"
  NEXTAUTH_SECRET="secure-random-production-secret"
  ```

- [ ] **Generate Secure NextAuth Secret**

  ```bash
  # Generate a strong random secret
  openssl rand -base64 32
  ```

- [ ] **Verify Environment Variable Access**
  - [ ] Variables are set in deployment platform (Vercel, Netlify, etc.)
  - [ ] Variables are available during both build and runtime
  - [ ] No environment variables are exposed to client-side

### 3. Database Configuration

- [ ] **Production Database Setup**

  - [ ] PostgreSQL database is running and accessible
  - [ ] Database connection string is configured
  - [ ] Database has required authentication tables

- [ ] **Run Database Migrations**

  ```bash
  npm run migrate
  ```

- [ ] **Verify Database Schema**
  - [ ] `auth.users` table exists with correct columns
  - [ ] `auth.accounts` table exists for OAuth account storage
  - [ ] Foreign key relationships are properly configured
  - [ ] Database user has appropriate permissions

## Deployment Verification

### 4. SSL and Domain Configuration

- [ ] **HTTPS Configuration**

  - [ ] SSL certificate is valid and properly configured
  - [ ] Domain redirects HTTP to HTTPS
  - [ ] No mixed content warnings

- [ ] **Domain Verification**
  - [ ] Production domain is accessible
  - [ ] DNS records are properly configured
  - [ ] Domain matches OAuth app configuration exactly

### 5. Application Testing

- [ ] **Build and Deploy**

  - [ ] Application builds successfully in production environment
  - [ ] No TypeScript or linting errors
  - [ ] All dependencies are properly installed

- [ ] **Basic OAuth Flow Test**
  - [ ] Visit production login page
  - [ ] Click "Continue with GitHub" button
  - [ ] Verify redirect to GitHub authorization page
  - [ ] Complete OAuth authorization
  - [ ] Verify successful callback and login

### 6. End-to-End Testing

- [ ] **New User Registration**

  - [ ] Test GitHub OAuth with new user (not linked to existing account)
  - [ ] Verify user account is created in database
  - [ ] Verify user can access protected pages after OAuth login

- [ ] **Existing User Account Linking**

  - [ ] Test GitHub OAuth with existing user (same email as existing account)
  - [ ] Verify GitHub account is linked to existing user
  - [ ] Verify user data is updated with GitHub profile information

- [ ] **Error Handling**
  - [ ] Test OAuth cancellation (user clicks "Cancel" on GitHub)
  - [ ] Verify error message is displayed appropriately
  - [ ] Test with invalid OAuth configuration (temporarily break setup)
  - [ ] Verify graceful error handling

## Security Verification

### 7. Security Checklist

- [ ] **OAuth Security**

  - [ ] Client secret is not exposed in client-side code
  - [ ] OAuth scopes are minimal (`read:user user:email`)
  - [ ] CSRF protection is enabled (automatic with NextAuth.js)

- [ ] **Session Security**

  - [ ] JWT tokens are HTTP-only cookies
  - [ ] Session expiration is properly configured (30 days max)
  - [ ] Session refresh is working (30 minutes)

- [ ] **Database Security**
  - [ ] OAuth tokens are stored securely in database
  - [ ] Database connection uses SSL in production
  - [ ] Database user has minimal required permissions

### 8. Monitoring and Logging

- [ ] **Error Monitoring**

  - [ ] Error tracking is configured (Sentry, etc.)
  - [ ] OAuth errors are properly logged
  - [ ] Database errors are monitored

- [ ] **Performance Monitoring**
  - [ ] OAuth flow performance is acceptable (<5 seconds)
  - [ ] Database queries are optimized
  - [ ] No memory leaks in authentication flow

## Post-Deployment Tasks

### 9. Documentation Updates

- [ ] **Update Documentation**

  - [ ] Production setup instructions are documented
  - [ ] Environment variable requirements are documented
  - [ ] Troubleshooting guide is accessible to team

- [ ] **Team Communication**
  - [ ] Team is notified about OAuth availability
  - [ ] Support team has access to troubleshooting documentation
  - [ ] Rollback plan is documented

### 10. Ongoing Maintenance

- [ ] **Regular Security Reviews**

  - [ ] OAuth app permissions reviewed quarterly
  - [ ] Environment variables rotated regularly
  - [ ] Database access audited

- [ ] **Monitoring Setup**
  - [ ] OAuth success/failure rates monitored
  - [ ] User registration patterns tracked
  - [ ] Error rates within acceptable thresholds

## Rollback Plan

### 11. Emergency Procedures

- [ ] **Rollback Strategy**

  - [ ] Previous deployment can be restored quickly
  - [ ] OAuth can be disabled via feature flag if needed
  - [ ] Database migrations can be reversed if necessary

- [ ] **Emergency Contacts**
  - [ ] GitHub OAuth app admin contact information
  - [ ] Database administrator contact information
  - [ ] Deployment platform support information

## Sign-off

- [ ] **Development Team**: Functionality tested and approved
- [ ] **Security Team**: Security review completed and approved
- [ ] **Operations Team**: Deployment and monitoring verified
- [ ] **Product Team**: User experience validated

---

**Deployment Date**: ******\_\_\_******  
**Deployed By**: ******\_\_\_******  
**Reviewed By**: ******\_\_\_******

_Keep this checklist for future OAuth provider integrations (Google, Facebook, Apple, etc.)_
