# Support Social Login from Different App Configuration [abm]

## Problem Statement

The current OAuth implementation has a single-domain dependency where all apps share the same OAuth configuration via static `NEXTAUTH_URL`. Since different AppConfigs respond to different domains (`app1.localhost`, `app2.localhost`, production domains), we need:

1. **Per-App Provider Configuration**: Each app should define its own authentication providers and credentials
2. **Multi-Client Support**: The same OAuth provider (e.g., GitHub) should support multiple apps with different client credentials
3. **Dynamic Origin Resolution**: OAuth redirect URIs must be constructed from the current request's domain, not static configuration

## Acceptance Criteria

- [ ] Different apps can have different authentication providers
- [ ] The same social provider (e.g., GitHub) can be used by multiple app configs on different domains with separate client credentials
- [ ] OAuth flows work seamlessly across development and production domains
- [ ] Backward compatibility with existing single-domain setups
- [ ] Complete documentation for multi-client OAuth provider setup

## Development Plan

### Architecture: Provider-Based Dynamic Configuration

**Core Strategy**: Each AppConfig defines an `auth.providers` array with type-safe provider configurations that resolve environment variables and construct dynamic redirect URIs from request origins.

### Implementation Steps

#### 1. Provider Type System

```typescript
type AuthProviderType = "credentials" | "github" | "google";

interface AuthProvider<T extends AuthProviderType = AuthProviderType> {
  type: T;
  config: ProviderConfig<T>;
}

interface CredentialsProviderConfig {
  // No configuration needed - provider behavior is hardcoded
  // This interface exists for type safety and explicit enabling
}

interface GitHubProviderConfig {
  clientId: string;
  clientSecret: string;
  domain?: string; // Optional override for redirect URI
}

interface GoogleProviderConfig {
  clientId: string;
  clientSecret: string;
  domain?: string; // Optional override for redirect URI
  prompt?: "select_account" | "consent" | "none";
}
```

#### 2. AppConfig Integration

```typescript
interface AppConfigItem {
  // ...existing fields...
  auth?: {
    providers: AuthProvider[];
  };
}

// Example configuration
const availableApps = {
  app1: {
    auth: {
      providers: [
        {
          type: "credentials" as const,
          config: {}, // No config needed, but explicit enabling required
        },
        {
          type: "github" as const,
          config: {
            clientId: process.env.APP1_GITHUB_CLIENT_ID!,
            clientSecret: process.env.APP1_GITHUB_CLIENT_SECRET!,
          },
        },
      ],
    },
  },
  app2: {
    auth: {
      providers: [
        {
          type: "google" as const,
          config: {
            clientId: process.env.APP2_GOOGLE_CLIENT_ID!,
            clientSecret: process.env.APP2_GOOGLE_CLIENT_SECRET!,
            prompt: "select_account",
          },
        },
      ],
    },
  },
};
```

#### 3. Dynamic AuthOptions Factory

```typescript
function createAuthOptions(
  appConfig: AppConfig,
  request: NextRequest
): NextAuthOptions {
  const providers = buildProvidersFromConfig(
    appConfig?.auth?.providers || [],
    request
  );
  return { providers, ...restOfConfig };
}

function buildProvidersFromConfig(
  providerConfigs: AuthProvider[],
  request: NextRequest
): any[] {
  return providerConfigs.map(({ type, config }) => {
    switch (type) {
      case "credentials":
        return CredentialsProvider({
          // Hardcoded credentials configuration from existing authOptions
          name: "Credentials",
          credentials: {
            username: { label: "Username", type: "text" },
            password: { label: "Password", type: "password" },
          },
          // ... existing authorize logic
        });
      case "github":
        return GitHubProvider({
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          authorization: {
            params: {
              scope: "read:user user:email",
              redirect_uri: buildRedirectUri(request, "github", config.domain),
            },
          },
        });
      case "google":
        return GoogleProvider({
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          authorization: {
            params: {
              scope: "openid profile email",
              prompt: config.prompt || "select_account",
              redirect_uri: buildRedirectUri(request, "google", config.domain),
            },
          },
        });
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }
  });
}

function buildRedirectUri(
  request: NextRequest,
  provider: string,
  domainOverride?: string
): string {
  const origin = domainOverride || request.nextUrl.origin;
  return `${origin}/api/auth/callback/${provider}`;
}
```

### Files to Create/Modify

**Core Architecture**:

- `src/AppConfig.ts` - Add `auth.providers` interface
- `src/lib/auth/authOptions.ts` - Convert to factory function
- `src/app/api/auth/[...nextauth]/route.ts` - Use dynamic auth options

**Provider System**:

- `src/lib/auth/providers/types.ts` - Provider type definitions
- `src/lib/auth/providers/factory.ts` - Provider factory with type safety
- `src/lib/auth/providers/github.ts` - GitHub provider builder
- `src/lib/auth/providers/google.ts` - Google provider builder

**UI Integration**:

- `src/components/auth/DynamicLoginForm.tsx` - Renders providers based on app config
- `src/lib/auth/getAppProviders.ts` - Client-side provider resolver

### Environment Variables

```bash
# App1 (Credentials + GitHub OAuth)
APP1_GITHUB_CLIENT_ID="github_client_for_app1"
APP1_GITHUB_CLIENT_SECRET="github_secret_for_app1"

# App2 (Google OAuth only)
APP2_GOOGLE_CLIENT_ID="google_client_for_app2"
APP2_GOOGLE_CLIENT_SECRET="google_secret_for_app2"

# App3 (Credentials only - no additional env vars needed)
# (No environment variables needed for credentials-only apps)
```

### Connection to Task [abj]

This extends the conditional provider concept from [abj] with app-config-level control and multi-client support per app.

## OAuth Provider Multi-Client Documentation Research

### GitHub OAuth

**Multiple Redirect URIs**: ✅ **Supported**

- GitHub OAuth apps support multiple callback URLs in a single application
- **Recommendation**: Use single GitHub OAuth app per AppConfig with multiple redirect URIs
- **Setup**: Add all domains to "Authorization callback URL" field:
  ```
  http://localhost:3000/api/auth/callback/github
  http://app1.localhost:3000/api/auth/callback/github
  https://app1.yourdomain.com/api/auth/callback/github
  ```

**Multiple Client Strategy**: ✅ **Recommended**

- For different apps with different domains, create separate GitHub OAuth applications
- Each AppConfig gets its own `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
- Allows independent management and different scopes per app

### Google OAuth

**Multiple Redirect URIs**: ✅ **Supported**

- Google OAuth clients support multiple "Authorized redirect URIs"
- **Recommendation**: Use single Google OAuth client per AppConfig with multiple redirect URIs
- **Setup**: Add all domains to "Authorized redirect URIs":
  ```
  http://localhost:3000/api/auth/callback/google
  http://app1.localhost:3000/api/auth/callback/google
  https://app1.yourdomain.com/api/auth/callback/google
  ```

**Multiple Client Strategy**: ✅ **Recommended**

- For different apps, create separate Google OAuth clients
- Each AppConfig gets its own `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Enables different consent screens and branding per app

### LinkedIn OAuth

**Multiple Redirect URIs**: ✅ **Supported**

- LinkedIn allows multiple redirect URLs per application
- **Setup**: Add URLs in "Authorized redirect URLs for your app"

**Multiple Client Strategy**: ✅ **Recommended**

- Create separate LinkedIn apps for different domains/brands
- Required for different company pages or branding

### X (Twitter) OAuth

**Multiple Redirect URIs**: ⚠️ **Limited**

- Twitter OAuth 1.0a: Single callback URL per app
- Twitter OAuth 2.0: Multiple redirect URIs supported
- **Recommendation**: Use OAuth 2.0 with multiple redirect URIs or separate apps

**Multiple Client Strategy**: ✅ **Required for OAuth 1.0a**

- OAuth 1.0a requires separate apps for different callback URLs
- OAuth 2.0 allows single app with multiple redirect URIs

### Facebook OAuth

**Multiple Redirect URIs**: ✅ **Supported**

- Facebook allows multiple "Valid OAuth Redirect URIs"
- **Setup**: Add URLs in App Settings > Facebook Login > Valid OAuth Redirect URIs

**Multiple Client Strategy**: ✅ **Recommended**

- Different apps enable different Facebook features and permissions
- Required for different business verification levels

### Apple Sign In

**Multiple Redirect URIs**: ✅ **Supported**

- Apple Sign In supports multiple return URLs per Service ID
- **Setup**: Configure in Apple Developer Console > Services

**Multiple Client Strategy**: ✅ **Recommended**

- Different Service IDs for different apps/domains
- Required for different app bundle identifiers

## Implementation Recommendation

**Primary Strategy**: **Multiple OAuth Applications per AppConfig**

- Each AppConfig that needs OAuth gets its own client credentials for each provider
- Within each OAuth application, configure multiple redirect URIs for all environments (dev, staging, prod)
- This provides maximum flexibility, security isolation, and branding control

**Fallback Strategy**: **Single OAuth App with Multiple Redirects**

- For simple cases where apps share branding and requirements
- Configure all possible redirect URIs in a single OAuth application
- Use domain override in AppConfig when needed
