# Add login support with NextAuth.js library [aaah]

We need to implement a way to support different login strategies:

- username / password
- social login
- otp-based login (otp sent via mail or text)

# Acceptance Criteria

- [ ] Understand and choose the proper library
- [ ] Understand the library capabilities
- [ ] Make sure that each supported login strategy is optional and can be opted in/out by env vars (hard opt-out if no config is provided) and per AppConfig (soft opt-in for each configured app among the strategies that are available via env vars)

## Development Plan

This task requires implementing a robust authentication system using NextAuth.js that supports multiple login strategies while being configurable per app. Chuck Norris doesn't need authentication, but mortals do, so let's build them the finest system known to mankind!

### Phase 1: Library Research and Selection

**The Reconnaissance Mission**

1. **Install NextAuth.js and Core Dependencies**

   - `next-auth@beta` - Core NextAuth.js v5 (latest version)
   - `@auth/core` - Core authentication primitives
   - `@auth/knex-adapter` - Database adapter for our existing Knex setup
   - `@auth/google-provider` - Google OAuth provider
   - `@auth/github-provider` - GitHub OAuth provider
   - `@auth/facebook-provider` - Facebook OAuth provider
   - `@auth/nodemailer-provider` - Email-based authentication (magic links)
   - `bcrypt` - Password hashing (already in devDependencies)

2. **Evaluate Additional Libraries for Enhanced OTP**
   - `speakeasy` - TOTP/HOTP implementation for app-based 2FA
   - `nodemailer` - Email sending for magic links and OTP
   - `twilio` - SMS sending for OTP (optional)

### Phase 2: Core Authentication Infrastructure

**Building the Foundation of Power**

1. **Create Authentication Configuration System**

   - Extend `AppConfig` interface to include auth strategies configuration
   - Create environment variable schema for auth providers
   - Implement strategy availability checks based on env vars

2. **Database Schema Enhancement**

   - ✅ **Existing Schema Perfect**: The existing `auth` schema migration (`20240320_auth.js`) is fully compatible with NextAuth.js
   - ✅ **All Required Tables Present**: `users`, `accounts`, `sessions`, `verification_tokens`
   - ✅ **Enhanced Features**: Already includes `password` field and audit timestamps
   - **Additional Tables to Create**:
     - `auth.otp_tokens` - Custom SMS OTP implementation
     - `auth.user_profiles` - Extended user information (optional)

3. **Core Authentication Services**
   - Create `src/lib/auth/` directory structure
   - Configure NextAuth.js with custom Knex adapter pointing to `auth` schema
   - Leverage existing database schema (no migration needed!)
   - Implement custom credentials provider using existing `password` field
   - Configure session management with existing tables

### Phase 3: Strategy Implementation

**The Arsenal of Authentication**

1. **Credentials Provider (Username/Password)**

   - Implement custom credentials provider
   - Password hashing and validation with bcrypt
   - User registration and login flow
   - Account linking capabilities

2. **OAuth Providers (Google, GitHub, Facebook)**

   - Configure OAuth providers with environment variables
   - Automatic account creation and linking
   - Profile data mapping and synchronization

3. **Email Provider & Magic Links**

   - Configure Nodemailer provider for passwordless login
   - Magic link generation and validation
   - Email template customization

4. **Enhanced OTP Strategy (Custom Implementation)**
   - TOTP/HOTP implementation with speakeasy
   - SMS OTP sending service (optional)
   - Time-based token expiration and validation
   - QR code generation for authenticator apps

### Phase 4: API Routes and Middleware

**The Enforcement Squad**

1. **NextAuth.js API Routes**

   - `/api/auth/[...nextauth]` - Automatic NextAuth.js API routes
     - Handles login, logout, callbacks, session management
     - Supports all configured providers automatically
     - Built-in CSRF protection and security measures

2. **Custom Authentication Extensions**

   - `/api/auth/register` - Custom user registration endpoint
   - `/api/auth/otp/request` - Request SMS OTP
   - `/api/auth/otp/verify` - Verify SMS OTP
   - `/api/auth/profile` - User profile management

3. **Authentication Middleware**
   - Leverage NextAuth.js middleware for route protection
   - Custom middleware for role-based access control
   - App-specific authentication requirements

### Phase 5: Frontend Integration

**The User Interface of Champions**

1. **Authentication Components**

   - Login form component with multiple provider options
   - Registration form component
   - OAuth provider buttons (Google, GitHub, Facebook)
   - Magic link request component
   - OTP input component for SMS verification
   - User profile/logout component
   - TOTP setup component with QR codes

2. **Authentication Context & Hooks**
   - Use NextAuth.js React hooks (`useSession`, `signIn`, `signOut`)
   - Custom hooks for extended functionality
   - Session state management throughout the app
   - Real-time session updates

### Phase 6: Configuration Integration

**Making it App-Specific**

1. **App Config Integration**

   - Add auth provider configuration to `AppConfig`
   - Configure which providers are available per app
   - App-specific authentication requirements and flows
   - Custom styling and branding per app

2. **Dynamic Provider Loading**
   - Load only configured providers per app
   - Environment variable validation per provider
   - Graceful degradation when providers unavailable
   - App-specific callback URLs and configurations

### Files to Create/Modify:

**New Files:**

- `src/lib/auth/auth-config.ts` - NextAuth.js configuration
- `src/lib/auth/providers/` - Custom provider implementations
- `src/lib/auth/adapters/knex-adapter.ts` - Custom Knex adapter for `auth` schema
- `src/lib/auth/utils.ts` - Authentication utilities
- `src/components/auth/` - Authentication UI components
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth.js API routes
- `src/app/api/auth/register/route.ts` - Custom registration endpoint
- `src/app/api/auth/otp/` - Custom OTP endpoints
- `knex/migrations/[timestamp]_add_otp_tokens.js` - Additional OTP table (optional)

**Modified Files:**

- `src/AppConfig.ts` - Add auth provider configuration interface
- `src/middleware.ts` - Add NextAuth.js middleware
- `package.json` - Add NextAuth.js dependencies
- `src/app/layout.tsx` - Add NextAuth.js SessionProvider

**Existing Schema (No Changes Needed):**

- ✅ `knex/migrations/20240320_auth.js` - Already perfect for NextAuth.js!

### Environment Variables Required:

```bash
# NextAuth.js Secret (required)
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000  # Your app URL

# OAuth Providers (optional - enables providers when present)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
FACEBOOK_CLIENT_ID=your-facebook-client-id
FACEBOOK_CLIENT_SECRET=your-facebook-client-secret

# Email Provider (optional - enables magic links)
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@yourapp.com

# SMS/OTP Services (optional)
TWILIO_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone
```

This plan creates a Chuck Norris-level authentication system using NextAuth.js that's flexible, secure, and configurable. Each app can choose which authentication methods to enable, while the system gracefully handles missing configurations. The implementation will be more powerful than a roundhouse kick and more modern than Chuck Norris mastering the latest technology!

### **Key Advantages of NextAuth.js Approach:**

- ⚡ **Next.js Native**: Perfect integration with our existing Next.js architecture
- 🔧 **Less Boilerplate**: Automatic API routes and session management
- 🗄️ **Database Agnostic**: Works seamlessly with our existing Knex setup
- 🛡️ **Security First**: Built-in CSRF protection, secure cookies, JWT handling
- 🎨 **Customizable**: Still allows full customization while providing sensible defaults
- 📱 **Modern Patterns**: Supports modern authentication flows and serverless environments
