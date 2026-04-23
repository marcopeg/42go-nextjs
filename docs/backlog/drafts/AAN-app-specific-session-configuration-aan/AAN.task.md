---
taskId: AAN
status: draft
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
---

# App-Specific Session Configuration [aan]

Implement configurable session management per AppConfig to enable different session durations and refresh intervals for different applications. This is particularly important for RBAC systems where different apps may require different security levels.

**Prerequisites**: None (independent story that enhances authentication system)

## Requirements Analysis

Current system has fixed global session configuration:

- **Fixed Session Duration**: 30 days for all apps
- **Fixed Refresh Interval**: 30 minutes for all apps
- **No App-Specific Control**: Cannot customize session behavior per app

Different apps may need different security postures:

- **High-Security Apps**: Shorter sessions, frequent refresh
- **Standard Apps**: Balanced approach
- **Public Apps**: Longer sessions for better UX

## Enhanced AppConfig Interface

### Current Auth Configuration

```ts
interface AppConfigItem {
  auth?: {
    providers: TAuthProviders; // Only provider selection
  };
}
```

### Enhanced Auth Configuration

```ts
interface AppConfigItem {
  auth?: {
    providers: TAuthProviders;
    session?: {
      // NEW
      maxAge?: number; // Session max duration (seconds)
      updateAge?: number; // Refresh interval (seconds)
      rbacRefreshInterval?: number; // RBAC permission refresh (ms)
      strategy?: "jwt" | "database"; // Session strategy (future)
    };
  };
}
```

## Implementation Strategy

### Option 1: Dynamic NextAuth Configuration (Recommended)

Modify NextAuth handler to read app-specific session config:

```ts
// src/app/api/auth/[...nextauth]/route.ts
async function handler(req: NextRequest, context: any) {
  const appConfig = await getAppConfigFromRequest(req);

  const sessionConfig = {
    strategy: "jwt" as const,
    maxAge: appConfig.auth?.session?.maxAge ?? 30 * 24 * 60 * 60, // Default 30 days
    updateAge: appConfig.auth?.session?.updateAge ?? 30 * 60, // Default 30 minutes
  };

  return NextAuth(req, context, {
    providers: await getProviders(),
    session: sessionConfig,
    callbacks: { signIn, jwt, session },
  });
}
```

### Option 2: Hybrid Approach (Simpler)

Keep NextAuth global, add app-specific permission refresh in JWT callback:

```ts
// In JWT callback
jwt: async ({ token, user, trigger }) => {
  const appConfig = await getCurrentAppConfig(); // From request context

  // App-specific permission refresh logic
  const rbacRefresh =
    appConfig.auth?.session?.rbacRefreshInterval ?? 5 * 60 * 1000; // 5min default

  if (
    !token.permissions ||
    Date.now() - (token.permissionsUpdatedAt || 0) > rbacRefresh
  ) {
    token.permissions = await getUserPermissions(token.userId, appConfig.name);
    token.permissionsUpdatedAt = Date.now();
  }

  return token;
};
```

## Configuration Examples

### High-Security App (Admin/Banking)

```ts
const adminApp: AppConfigItem = {
  name: "admin",
  auth: {
    providers: ["credentials"],
    session: {
      maxAge: 8 * 60 * 60, // 8 hours max session
      updateAge: 5 * 60, // 5 minutes refresh
      rbacRefreshInterval: 2 * 60 * 1000, // 2 minutes RBAC refresh
    },
  },
};
```

### Standard App (Business Tools)

```ts
const businessApp: AppConfigItem = {
  name: "business",
  auth: {
    providers: ["credentials", "github", "google"],
    session: {
      maxAge: 7 * 24 * 60 * 60, // 7 days max session
      updateAge: 15 * 60, // 15 minutes refresh
      rbacRefreshInterval: 5 * 60 * 1000, // 5 minutes RBAC refresh
    },
  },
};
```

### Public App (Marketing/Docs)

```ts
const publicApp: AppConfigItem = {
  name: "public",
  auth: {
    providers: ["github", "google"],
    session: {
      maxAge: 30 * 24 * 60 * 60, // 30 days max session (default)
      updateAge: 60 * 60, // 1 hour refresh
      rbacRefreshInterval: 15 * 60 * 1000, // 15 minutes RBAC refresh
    },
  },
};
```

## Goals

- [ ] Extend AppConfig interface to support session configuration
- [ ] Implement dynamic session configuration reading in NextAuth handler
- [ ] Add app-specific session defaults with sensible fallbacks
- [ ] Create utility functions for session config management
- [ ] Add validation for session configuration values
- [ ] Update existing app configurations with session settings
- [ ] Add documentation for session configuration options
- [ ] Create unit tests for session configuration logic
- [ ] Implement session config validation middleware
- [ ] Add session configuration to admin interface (future)

## Acceptance Criteria

### Interface & Types

- [ ] AppConfig interface supports optional `auth.session` configuration
- [ ] TypeScript types properly defined for all session options
- [ ] Backward compatibility maintained for apps without session config
- [ ] Default values provided for all session configuration options

### Dynamic Configuration

- [ ] NextAuth handler reads app-specific session configuration
- [ ] Session duration and refresh intervals work per app
- [ ] App resolution works correctly in NextAuth context
- [ ] Error handling for invalid session configurations

### RBAC Integration

- [ ] App-specific RBAC permission refresh intervals
- [ ] Permission refresh works independently of NextAuth refresh
- [ ] RBAC refresh configuration validates properly
- [ ] Permission cache invalidation respects app-specific settings

### Developer Experience

- [ ] Clear documentation for session configuration options
- [ ] Example configurations for different security levels
- [ ] Validation messages for invalid session configurations
- [ ] TypeScript IntelliSense works for session config

### Testing & Quality

- [ ] Unit tests for session configuration parsing
- [ ] Integration tests with different app session settings
- [ ] Tests verify app isolation in session management
- [ ] Performance tests for session configuration lookup

## Development Plan

### Phase 1: Interface Enhancement

**1.1 Type Definitions** (`src/42go/auth/types.ts`)

```ts
interface SessionConfig {
  maxAge?: number; // Session max duration (seconds)
  updateAge?: number; // Refresh interval (seconds)
  rbacRefreshInterval?: number; // RBAC permission refresh (ms)
  strategy?: "jwt" | "database"; // Session strategy (future extensibility)
}

interface AuthConfig {
  providers: TAuthProviders;
  session?: SessionConfig;
}
```

**1.2 AppConfig Enhancement** (`src/AppConfig.ts`)

- Update interface to include session configuration
- Add default session configurations for existing apps
- Validate session configuration values

### Phase 2: Dynamic Configuration Implementation

**2.1 Session Config Utilities** (`src/42go/auth/lib/session-config.ts`)

```ts
export const getSessionConfig = async (
  req: NextRequest
): Promise<SessionConfig> => {
  const appConfig = await getAppConfigFromRequest(req);

  return {
    maxAge: appConfig.auth?.session?.maxAge ?? 30 * 24 * 60 * 60,
    updateAge: appConfig.auth?.session?.updateAge ?? 30 * 60,
    rbacRefreshInterval:
      appConfig.auth?.session?.rbacRefreshInterval ?? 5 * 60 * 1000,
    strategy: appConfig.auth?.session?.strategy ?? "jwt",
  };
};

export const validateSessionConfig = (config: SessionConfig): boolean => {
  // Validation logic for session configuration
  return (
    config.maxAge > 0 && config.updateAge > 0 && config.rbacRefreshInterval > 0
  );
};
```

**2.2 NextAuth Handler Update** (`src/app/api/auth/[...nextauth]/route.ts`)

- Integrate session configuration reading
- Apply app-specific session settings
- Add error handling for configuration issues

### Phase 3: RBAC Integration

**3.1 Enhanced JWT Callback** (`src/42go/auth/lib/callbacks.ts`)

```ts
export const jwt = async ({ token, user, trigger }) => {
  // Get app-specific session configuration
  const sessionConfig = await getSessionConfigFromToken(token);

  // Handle RBAC permission refresh with app-specific intervals
  if (shouldRefreshPermissions(token, sessionConfig)) {
    token.permissions = await refreshUserPermissions(token.userId, token.appId);
    token.permissionsUpdatedAt = Date.now();
  }

  return token;
};
```

**3.2 Permission Refresh Logic** (`src/42go/auth/lib/permission-refresh.ts`)

- App-specific permission refresh intervals
- Cache management for permission data
- Integration with RBAC system

### Phase 4: Documentation & Testing

**4.1 Configuration Documentation** (`docs/articles/SESSION_CONFIGURATION.md`)

- Session configuration options explained
- Security best practices per app type
- Example configurations
- Migration guide for existing apps

**4.2 Testing Suite**

- Unit tests for session configuration utilities
- Integration tests with multiple app configurations
- Performance tests for configuration lookup
- Security tests for session isolation

## Architecture Decisions

### App-Specific vs Global Configuration

- **Decision**: Support app-specific session configuration with global defaults
- **Rationale**: Different apps have different security requirements
- **Implementation**: Read app config in NextAuth handler, fall back to defaults

### Configuration Storage

- **Decision**: Store session config in AppConfig structure
- **Rationale**: Keeps all app configuration in one place
- **Alternative**: Separate session configuration file (rejected for simplicity)

### Backward Compatibility

- **Decision**: Make session configuration optional with sensible defaults
- **Rationale**: Existing apps should continue working without changes
- **Implementation**: Default values for all session configuration options

## Security Considerations

### Session Duration Limits

```ts
const SESSION_LIMITS = {
  maxAge: {
    min: 5 * 60, // 5 minutes minimum
    max: 90 * 24 * 60 * 60, // 90 days maximum
  },
  updateAge: {
    min: 60, // 1 minute minimum
    max: 24 * 60 * 60, // 24 hours maximum
  },
  rbacRefreshInterval: {
    min: 30 * 1000, // 30 seconds minimum
    max: 60 * 60 * 1000, // 1 hour maximum
  },
};
```

### Configuration Validation

- Prevent extremely short sessions that could cause UX issues
- Prevent extremely long sessions that could be security risks
- Ensure refresh intervals are shorter than session durations
- Validate RBAC refresh intervals are reasonable

## Integration with Existing Systems

### NextAuth Integration

- Modify existing NextAuth configuration
- Maintain compatibility with current callback structure
- Preserve existing provider configuration

### RBAC System Integration

- Connect with planned RBAC stories [aai] through [aam]
- Provide foundation for app-specific permission refresh
- Enable different security postures per application

## Future Enhancements

### Admin Interface

- UI for managing session configurations per app
- Session monitoring and analytics
- Dynamic session configuration updates

### Advanced Features

- Conditional session configuration based on user roles
- Geographic or device-based session policies
- Session activity monitoring and alerts

## Next Steps

This story provides the foundation for app-specific session management that will enhance the RBAC system's security and flexibility.

After completion, the RBAC stories [aai] through [aam] can leverage app-specific session configuration for optimal permission refresh intervals.
