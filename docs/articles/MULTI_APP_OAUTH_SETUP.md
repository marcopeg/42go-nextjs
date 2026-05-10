# Multi-App OAuth Configuration

Complete guide for setting up OAuth providers across multiple app configurations in 42Go Next.

## Overview

42Go Next supports **per-app OAuth configuration**, allowing different applications to use different social login providers with separate client credentials. This enables multi-tenant scenarios where each app has its own branding, OAuth applications, and user authentication flows.

## Key Features

- **Per-App Provider Selection**: Each app defines which OAuth providers to enable
- **Multi-Client Support**: Same provider (e.g., GitHub) with different client credentials per app
- **Dynamic Frontend Filtering**: Login UI shows only configured providers for current app
- **Environment-Based Configuration**: Secure credential management via environment variables
- **Production Ready**: Full support for development, staging, and production environments

## Architecture

### Request Flow

1. **App Resolution**: `src/proxy.ts` resolves the current app and forwards `X-42Go-AppID`
2. **Provider Configuration**: `getAppInfo()` / `getAppConfig()` returns the app-specific provider list
3. **Backend Provider Building**: `getProviders()` constructs the NextAuth providers array
4. **Credentials Request Binding**: credentials `authorize(credentials, req)` resolves the app ID from the actual NextAuth callback request headers before querying `auth.users`
5. **JWT Session Stamping**: the JWT callback stores app-scoped `roles`, `grants`, and `appId` in the session snapshot
6. **Frontend Filtering**: Login page renders only configured provider buttons

### Core Components

- **AppConfig**: Defines providers per app (`src/AppConfig.ts`)
- **Provider Builder**: Dynamic NextAuth provider construction (`src/42go/auth/lib/providers/get-providers.ts`)
- **Auth Callbacks**: App-scoped OAuth linking and JWT RBAC stamping (`src/42go/auth/lib/callbacks.ts`)
- **Login UI**: App-aware provider filtering (`src/app/(public)/login/page.tsx`)

## Configuration Guide

### 1. AppConfig Provider Definition

Define authentication providers in each app config, then register the app in `src/AppConfig.ts`:

```typescript
// src/config/default/config.ts
import type { TAppConfigItem } from "@/AppConfig";

export default {
  name: "Default",
  auth: {
    providers: [
      { type: "credentials", config: {} },
      {
        type: "github",
        config: {
          clientId: process.env.GITHUB_CLIENT_ID!,
          clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        },
      },
      {
        type: "google",
        config: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        },
      },
    ],
  },
  features: ["page:docs", "api:profile"],
} satisfies TAppConfigItem;
```

```typescript
// src/config/app1/config.ts
import type { TAppConfigItem } from "@/AppConfig";

export default {
  name: "App 1",
  auth: {
    providers: [
      { type: "credentials", config: {} },
      {
        type: "github",
        config: {
          clientId: process.env.APP1_GITHUB_CLIENT_ID!,
          clientSecret: process.env.APP1_GITHUB_CLIENT_SECRET!,
        },
      },
    ],
  },
  features: ["page:dashboard", "api:profile"],
} satisfies TAppConfigItem;
```

```typescript
// src/AppConfig.ts
import type { TAppConfigItem } from "@/AppConfig";
import DefaultApp from "./config/default/config";
import App1App from "./config/app1/config";

export const apps = {
  default: DefaultApp,
  app1: App1App,
} as const satisfies Record<string, TAppConfigItem>;
```

### 2. Environment Variables

Set up OAuth credentials for each app configuration:

```bash
# Default app providers
GITHUB_CLIENT_ID="github_client_id_for_default_app"
GITHUB_CLIENT_SECRET="github_client_secret_for_default_app"
GOOGLE_CLIENT_ID="google_client_id_for_default_app"
GOOGLE_CLIENT_SECRET="google_client_secret_for_default_app"

# App1 specific providers
APP1_GITHUB_CLIENT_ID="github_client_id_for_app1"
APP1_GITHUB_CLIENT_SECRET="github_client_secret_for_app1"

# App2 specific providers
APP2_GOOGLE_CLIENT_ID="google_client_id_for_app2"
APP2_GOOGLE_CLIENT_SECRET="google_client_secret_for_app2"
```

### 3. OAuth Application Setup

Create separate OAuth applications for each app configuration:

#### GitHub OAuth Apps

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create **separate OAuth Apps** for each app configuration:

   - **Default App**: `42go-next-default`
   - **App1**: `42go-next-app1`
   - **App2**: Not needed (App2 uses Google only)

3. Configure **Authorization callback URLs** for each environment:

   ```
   # Default App
   http://localhost:3000/api/auth/callback/github
   https://yourdomain.com/api/auth/callback/github

   # App1
   http://app1.localhost:3000/api/auth/callback/github
   https://app1.yourdomain.com/api/auth/callback/github
   ```

#### Google OAuth Apps

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create **separate OAuth 2.0 Client IDs** for each app:

   - **Default App**: `42go-next-default-web-client`
   - **App2**: `42go-next-app2-web-client`

3. Configure **Authorized redirect URIs**:

   ```
   # Default App
   http://localhost:3000/api/auth/callback/google
   https://yourdomain.com/api/auth/callback/google

   # App2
   http://app2.localhost:3000/api/auth/callback/google
   https://app2.yourdomain.com/api/auth/callback/google
   ```

## Testing Setup

### Development Testing

1. **Configure Local Domains**:

   ```bash
   # Add to /etc/hosts
   127.0.0.1 app1.localhost
   127.0.0.1 app2.localhost
   ```

2. **Test Different Apps**:
   - **Default** (`http://localhost:3000/login`): Shows GitHub + Google + Credentials
   - **App1** (`http://app1.localhost:3000/login`): Shows GitHub + Credentials only
   - **App2** (`http://app2.localhost:3000/login`): Shows Google only

### Verification Checklist

- [ ] Each app shows only configured providers in login UI
- [ ] OAuth redirects work correctly for each domain
- [ ] Credentials login creates a session with `session.user.appId` matching the current app
- [ ] Client session roles/grants match `auth.roles_users` and `auth.roles_grants` for that same `app_id`
- [ ] User authentication does not leak roles or grants across app switches
- [ ] Environment variables load correctly for each app
- [ ] Build succeeds without TypeScript errors

### App-Scoped RBAC Session Check

Use the auth session endpoint or the profile `TestRBAC` block to confirm the JWT snapshot is scoped correctly.
For LingoCafe, a valid John backoffice session should show:

```json
{
  "user": {
    "id": "6ef549b6-4c58-4c80-8dce-a89b249dda58",
    "appId": "lingocafe",
    "roles": ["backoffice"],
    "grants": ["users:list"]
  }
}
```

If `/api/test/app-id` resolves the correct app but `/api/auth/session` still shows the old app ID after auth code
changes, restart the app process before re-testing. Long-running dev processes can keep stale NextAuth route
modules loaded.

## Production Deployment

### Domain Configuration

1. **Update OAuth Applications** with production redirect URIs
2. **Set Production Environment Variables** in deployment platform
3. **Configure DNS** for app subdomains (app1.yourdomain.com, app2.yourdomain.com)
4. **Test OAuth Flows** across all production domains

### Security Considerations

- **Separate OAuth Applications**: Use different OAuth apps per environment (dev/staging/prod)
- **Environment Variable Security**: Never commit client secrets to version control
- **Redirect URI Validation**: Keep OAuth redirect URIs as specific as possible
- **HTTPS Only**: Always use HTTPS for production OAuth flows

## Advanced Configuration

### Adding New Providers

1. **Install Provider Package**: `npm install next-auth-provider-{name}`
2. **Add Provider Type**: Update `AuthProviderType` in `src/42go/auth/lib/providers/types.ts`
3. **Implement Provider Builder**: Add case in `src/42go/auth/lib/providers/get-providers.ts`
4. **Create Login Component**: Add button component in `src/components/auth/login-strategies/`
5. **Update Login Page**: Add provider mapping in `src/app/(public)/login/page.tsx`

### Custom Provider Configuration

```typescript
// Example: LinkedIn provider configuration
{
  type: "linkedin",
  config: {
    clientId: process.env.LINKEDIN_CLIENT_ID!,
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
    scope: "r_liteprofile r_emailaddress"
  }
}
```

### Conditional Provider Enabling

```typescript
// Example: Enable GitHub only in production
{
  type: "github",
  config: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!
  },
  enabled: process.env.NODE_ENV === "production"
}
```

## Troubleshooting

### Common Issues

**OAuth Callback Errors**:

- Verify redirect URIs match exactly in OAuth application settings
- Check environment variables are set correctly for current app
- Ensure NextAuth URL configuration matches deployment domain

**Provider Not Showing**:

- Verify provider is included in AppConfig for current app
- Check environment variables are defined and accessible
- Confirm provider type spelling matches exactly

**Build Errors**:

- Ensure all environment variables have fallback values or proper null checks
- Verify TypeScript types match provider configuration structure

### Debug Mode

Enable debug logging in development:

```bash
NEXTAUTH_DEBUG=true
```

This provides detailed OAuth flow information in server logs.

## Related Documentation

- [GitHub OAuth Setup](./GITHUB_OAUTH_SETUP.md) - Detailed GitHub OAuth configuration
- [Google OAuth Setup](./GOOGLE_OAUTH_SETUP.md) - Detailed Google OAuth configuration
- [App Config Guide](./APP_CONFIG.md) - Complete app configuration documentation
- [Authentication Architecture](../memory-bank/ARCHITECTURE.md#authentication-architecture) - Technical implementation details

---

**Next Steps**: With multi-app OAuth configuration complete, consider implementing [RBAC (Role-Based Access Control)](../backlog/BACKLOG.md) for advanced user permission management.
