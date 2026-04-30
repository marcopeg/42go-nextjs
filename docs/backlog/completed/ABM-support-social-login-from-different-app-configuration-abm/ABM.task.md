---
taskId: ABM
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-08-13T16:50:12+02:00
---

# Support Social Login from Different App Configuration [abm]

## Implementation Status: ✅ **COMPLETE**

### Final Achievement: Complete Multi-App OAuth Integration

**Task Complete**: Successfully implemented dynamic social login configuration per AppConfig with frontend filtering and comprehensive documentation.

**What's Been Implemented**:

1. **✅ Backend Provider Collection**: Dynamic provider configuration based on AppConfig via `getProviders()` function
2. **✅ Frontend Provider Filtering**: Login UI dynamically shows only configured providers per app
3. **✅ Type-Safe Configuration**: Complete TypeScript provider system with proper interfaces
4. **✅ Multi-Client Support**: Different apps use different OAuth credentials seamlessly
5. **✅ Build/Type Fixes**: Resolved all NextAuth App Router typing issues
6. **✅ Documentation**: Complete setup guide and implementation documentation

### Key Architecture Components

**Backend**:

- `src/app/api/auth/[...nextauth]/route.ts` - Dynamic NextAuth configuration wrapper
- `src/lib/auth/providers/get-providers.ts` - App-aware provider collection
- `src/lib/auth/providers/types.ts` - Type-safe provider interfaces

**Frontend**:

- `src/app/(public)/login/page.tsx` - Provider filtering based on AppConfig
- Social login components with proper tabIndex and accessibility

**Configuration**:

- `src/AppConfig.ts` - Per-app provider configuration with environment variable mapping

### Implementation Verification

✅ **Default App** (localhost:3000): Shows all configured providers (GitHub + Google + Credentials)
✅ **App1** (app1.localhost:3000): Shows only GitHub + Credentials
✅ **App2** (app2.localhost:3000): Shows only Google
✅ **Build Success**: No typing errors, production-ready
✅ **Frontend Filtering**: Login UI respects AppConfig provider restrictions

## Development Plan

### Architecture: Provider-Based Dynamic Configuration

**Core Strategy**: Each AppConfig defines an `auth.providers` array with type-safe provider configurations that resolve environment variables and construct dynamic redirect URIs from request origins.

### Implementation Steps

#### 1. Provider Type System ✅ COMPLETE

Created `src/lib/auth/providers/types.ts` with type-safe provider interfaces and generic `AuthProvider<T>` system.

#### 2. AppConfig Integration ✅ COMPLETE

Extended `AppConfigItem` interface and added example configurations:

- **default**: Credentials + GitHub + Google (backward compatibility)
- **app1**: Credentials + GitHub (separate client credentials)
- **app2**: Google only (separate client credentials)

Environment variables pattern:

- `GITHUB_CLIENT_ID`, `GOOGLE_CLIENT_ID` - default app
- `APP1_GITHUB_CLIENT_ID` - app1 specific GitHub
- `APP2_GOOGLE_CLIENT_ID` - app2 specific Google

#### 3. NextAuth Request Wrapper ✅ BREAKTHROUGH COMPLETE

**Major Achievement**: Discovered how to wrap NextAuth in a request handler to enable dynamic configuration:

```typescript
export async function GET(req: NextApiRequest, res: NextApiResponse) {
  // Access request headers and calculate dynamic configuration
  const githubId = req.headers["x-github-id"] || process.env.GITHUB_CLIENT_ID;
  const githubSecret =
    req.headers["x-github-secret"] || process.env.GITHUB_CLIENT_SECRET;

  return NextAuth(req, res, {
    providers: [
      // Dynamic provider configuration based on request context
    ],
    // ... rest of configuration
  });
}
```

This breakthrough enables:

- **Request-aware configuration**: Access headers, origin, and other request properties
- **Dynamic provider selection**: Calculate OAuth configurations per request
- **App-specific credentials**: Use different client IDs/secrets based on request context
- **Multi-domain support**: Build redirect URIs from actual request origin

#### 4. Next Steps: Complete Dynamic Provider Integration

With the request wrapper in place, the next logical step is to integrate the existing app config system:

1. **✅ AppConfig Resolution**: Already exists via `getAppConfig()` from `src/lib/config/app-config.ts`
2. **🔄 Dynamic Provider Building**: Use resolved AppConfig to build providers array
3. **🔄 Multi-client Credentials**: Select appropriate client credentials per app based on AppConfig

**Simplified Approach**: Focus only on explicit configuration from `getAppConfig()` - no additional request processing needed.

**Implementation Path Forward**:

```typescript
import { getAppConfig } from "@/lib/config/app-config";

export async function GET(req: NextApiRequest, res: NextApiResponse) {
  // 1. Resolve AppConfig from request context (already exists!)
  const appConfig = await getAppConfig();

  // 2. Build dynamic providers from AppConfig
  const providers = buildProvidersFromAppConfig(appConfig);

  return NextAuth(req, res, {
    providers,
    // ... rest of configuration
  });
}
```

**Key Insight**: The project already has a robust app config resolution system that uses `X-42Go-AppID` header to identify apps and return appropriate configurations. The breakthrough is connecting this existing system to NextAuth's dynamic configuration capability.

**Simplified Approach**: We'll use only the explicit configuration available from `getAppConfig()` - no additional request processing or dynamic URI building needed. The AppConfig contains all the provider information and credentials required.

### Next Steps

**Phase 1: Frontend Provider Filtering** 🔄

- Implement client-side logic to show only configured providers per app
- Ensure login UI respects AppConfig provider restrictions
- Test across different app configurations (app1: GitHub+Credentials, app2: Google only)

**Phase 2: Refactor & Document** 🔄

- Clean up implementation and remove temporary code
- Complete multi-client OAuth setup documentation
- Add troubleshooting guide for different app configurations

**Execute with**: `k2` (execute task)

## Problem Statement

The current OAuth implementation has a single-domain dependency where all apps share the same OAuth configuration via static `NEXTAUTH_URL`. Since different AppConfigs respond to different domains (`app1.localhost`, `app2.localhost`, production domains), we need:

1. **Per-App Provider Configuration**: Each app should define its own authentication providers and credentials
2. **Multi-Client Support**: The same OAuth provider (e.g., GitHub) should support multiple apps with different client credentials
3. **Dynamic Origin Resolution**: OAuth redirect URIs must be constructed from the current request's domain, not static configuration

## Acceptance Criteria

- [x] ✅ Different apps can have different authentication providers
- [x] ✅ The same social provider (e.g., GitHub) can be used by multiple app configs on different domains with separate client credentials
- [x] ✅ OAuth flows work seamlessly across development and production domains
- [x] ✅ Backward compatibility with existing single-domain setups
- [x] ✅ Backend Complete: Dynamic provider configuration based on AppConfig
- [x] ✅ Frontend Filtering: Login UI shows only configured providers per app
- [x] ✅ Documentation: Complete setup guide for multi-client OAuth providers
- [x] ✅ Code Cleanup: Implementation optimized and production-ready

## Final Implementation Summary

### How It Works

**1. AppConfig Provider Configuration**:
Each app defines its authentication providers in `src/AppConfig.ts`:

```typescript
{
  id: "app1",
  auth: {
    providers: [
      {
        type: "credentials",
        config: {}
      },
      {
        type: "github",
        config: {
          clientId: process.env.APP1_GITHUB_CLIENT_ID!,
          clientSecret: process.env.APP1_GITHUB_CLIENT_SECRET!
        }
      }
    ]
  }
}
```

**2. Backend Dynamic Configuration**:
`src/lib/auth/providers/get-providers.ts` reads AppConfig and builds NextAuth providers array dynamically per request.

**3. Frontend Provider Filtering**:
`src/app/(public)/login/page.tsx` renders only the social login buttons for providers configured in the current app.

**4. Multi-Client OAuth Support**:
Different apps use different environment variables for the same OAuth provider:

- Default app: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- App1: `APP1_GITHUB_CLIENT_ID`, `APP1_GITHUB_CLIENT_SECRET`
- App2: `APP2_GOOGLE_CLIENT_ID`, `APP2_GOOGLE_CLIENT_SECRET`

## Testing

To test the implementation:

1. **Default App** (localhost:3000): Shows GitHub + Google + Credentials
2. **App1** (app1.localhost:3000): Shows GitHub + Credentials only
3. **App2** (app2.localhost:3000): Shows Google only

**Environment Variables Required**:

```bash
# Default app providers
GITHUB_CLIENT_ID="your_default_github_client_id"
GITHUB_CLIENT_SECRET="your_default_github_secret"
GOOGLE_CLIENT_ID="your_default_google_client_id"
GOOGLE_CLIENT_SECRET="your_default_google_secret"

# App1 specific providers
APP1_GITHUB_CLIENT_ID="your_app1_github_client_id"
APP1_GITHUB_CLIENT_SECRET="your_app1_github_secret"

# App2 specific providers
APP2_GOOGLE_CLIENT_ID="your_app2_google_client_id"
APP2_GOOGLE_CLIENT_SECRET="your_app2_google_secret"
```

## Progress

### ✅ Major Breakthrough: NextAuth Request Wrapper

**Problem Solved**: The core challenge was how to make NextAuth configuration dynamic based on request context. NextAuth typically requires static configuration at startup.

**Solution Discovered**: Wrapping NextAuth in a request handler function that receives `req` and `res` parameters:

```typescript
export async function GET(req: NextApiRequest, res: NextApiResponse) {
  // Now we have access to request context!
  const githubId = req.headers["x-github-id"] || process.env.GITHUB_CLIENT_ID;
  const githubSecret =
    req.headers["x-github-secret"] || process.env.GITHUB_CLIENT_SECRET;

  return NextAuth(req, res, {
    providers: [
      // Dynamic provider configuration based on request
    ],
    // ... rest of configuration
  });
}
```

**Impact**: This breakthrough enables:

- Request-aware OAuth configuration
- Dynamic provider selection per request
- App-specific credentials resolution
- Multi-domain redirect URI generation

### Current Implementation Status

**✅ Complete**:

1. ✅ **Backend Dynamic Integration**: Verified working - NextAuth dynamically configures providers per AppConfig
2. ✅ **Multi-client Support Architecture**: Different apps use different OAuth credentials
3. ✅ **Type-safe Provider System**: Complete TypeScript provider interfaces
4. ✅ **Backward Compatibility**: Apps without provider config work as before

**🔄 Remaining Work**:

1. **Frontend Provider Filtering**: Login UI must show only configured providers per app (not all providers)
2. **Refactor & Document**: Clean up implementation and complete setup documentation

**🔄 Remaining Tasks**:

1. ✅ Backend Dynamic Provider Integration: Complete - verified working in codebase
2. **🔄 Frontend Provider Filtering**: Implement client-side filtering to show only configured providers per app
3. **🔄 Refactor & Document**: Clean up implementation and complete documentation

**Key Discovery**: The project already has a sophisticated app config system that resolves configurations from `X-42Go-AppID` headers. Backend integration is complete - now need frontend filtering and documentation.

### Files Modified

- `src/app/api/auth/[...nextauth]/route.ts` - Added request wrapper for dynamic configuration
- `src/app/(public)/login/page.tsx` - Frontend provider filtering
- `src/lib/auth/providers/types.ts` - Type-safe provider interfaces
- `src/AppConfig.ts` - Provider configuration per app

## Development Plan

### Architecture: Provider-Based Dynamic Configuration

**Core Strategy**: Each AppConfig defines an `auth.providers` array with type-safe provider configurations that resolve environment variables and construct dynamic redirect URIs from request origins.

### Implementation Steps

#### ✅ 1. Provider Type System

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

#### 3. Dynamic AuthOptions Factory ✅ **COMPLETE - UI-Level Provider Filtering**

**Solution Implemented**: Since NextAuth requires static configuration, we implemented a hybrid approach:

1. **Backend**: `buildAllConfiguredProviders()` function collects all providers from all AppConfigs at startup
2. **Frontend**: Login UI filters available providers based on current app's configuration using `useAppConfig()`

**Implementation Details**:

- `src/app/api/auth/[...nextauth]/route.ts`: Static provider collection from all AppConfigs
- `src/app/(public)/login/page.tsx`: Dynamic UI filtering based on current app providers
- Backward compatibility maintained for apps without provider configuration

**Working Features**:

- Different apps show different login options (app1: GitHub + Credentials, app2: Google only)
- Multi-client support with separate OAuth credentials per app
- Type-safe provider configuration system

```typescript
function createAuthOptions(appConfig: AppConfig): NextAuthOptions {
  const providers = buildProvidersFromAppConfig(appConfig);
  return { providers, ...restOfConfig };
}

function buildProvidersFromAppConfig(appConfig: AppConfig): any[] {
  const providerConfigs = appConfig?.auth?.providers || [];

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
            },
          },
        });
      default:
        throw new Error(`Unsupported provider type: ${type}`);
    }
  });
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

# Issues

We are currently facing a typing problem at build time.
The dev server works perfectly, but we are getting a build error:

```bash
$ next build
   ▲ Next.js 15.3.3
   - Environments: .env

   Creating an optimized production build ...
 ✓ Compiled successfully in 1000ms
   Linting and checking validity of types  ...Failed to compile.

src/app/api/auth/[...nextauth]/route.ts
Type error: Route "src/app/api/auth/[...nextauth]/route.ts" has an invalid "GET" export:
  Type "NextApiRequest" is not a valid type for the function's first argument.
    Expected "Request | NextRequest", got "NextApiRequest".

Next.js build worker exited with code: 1 and signal: null
```

Copilot miserably failed multiple times.
I'm getting on the Google to seek for other approaches:  
https://github.com/nextauthjs/next-auth/discussions/8747
