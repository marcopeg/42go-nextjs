# Implement Dynamic Authentication Strategy [abb]

## ✅ COMPLETED BY TASK [abm]

**This task was completed as part of [abm] Support social login from different app configuration** ([🔗](./abm-support-social-login-different-app-configuration.md))

**Implementation Achieved**:

- ✅ **Dynamic Authentication Factory**: `getProviders()` function creates authentication configurations based on AppConfig
- ✅ **Per-App Provider Control**: Each app defines its own authentication providers via `auth.providers` array
- ✅ **Feature Flag-like Behavior**: Authentication providers work as configurable features per app
- ✅ **Scalable Architecture**: Easy addition of new providers without code changes
- ✅ **Centralized Configuration**: All auth settings controlled via AppConfig
- ✅ **Type Safety**: Complete TypeScript support for dynamic authentication

**Key Architecture Delivered**:

- Authentication options factory that accepts AppConfig
- Extended AppConfig interface with `auth.providers` configuration
- Modified NextAuth API route with dynamic authentication options
- Conditional enabling/disabling of authentication providers per app
- Backward compatibility with existing authentication flows

---

## Original Task Description

Implement a factory-based authentication system that allows different apps to have different authentication providers based on their AppConfig. This will enable per-app control over which authentication methods are available (credentials, GitHub, Google, etc.) similar to feature flags.

## Acceptance Criteria

- [ ] Create authentication options factory that accepts AppConfig
- [ ] Extend AppConfig interface to include authentication provider configuration
- [ ] Modify NextAuth API route to use dynamic authentication options
- [ ] Support conditional enabling/disabling of authentication providers per app
- [ ] Maintain existing TypeScript type safety for all authentication flows
- [ ] Ensure backward compatibility with current credentials authentication
- [ ] Document the new authentication configuration structure

## Development Plan

### Objective

Replace the static `authOptions` export with a dynamic factory function that creates authentication configurations based on the current app's configuration. This enables:

1. **Per-app provider control**: Different apps can enable different auth methods
2. **Feature flag-like behavior**: Authentication providers as configurable features
3. **Scalable architecture**: Easy addition of new providers without code changes
4. **Centralized configuration**: All auth settings controlled via AppConfig

### Implementation Strategy

#### Phase 1: Authentication Factory Architecture

1. **Create Auth Options Factory**:

   - Move current `authOptions` logic to `createAuthOptions(appConfig: AppConfig)`
   - Accept AppConfig parameter for dynamic provider selection
   - Return configured `NextAuthOptions` object based on app settings

2. **Extend AppConfig Interface**:
   - Add `auth.providers` configuration section
   - Support individual provider enable/disable flags
   - Include provider-specific configuration (client IDs, secrets, etc.)
   - Add authentication feature flags (multiProvider, accountLinking, etc.)

#### Phase 2: Dynamic Provider Selection

1. **Conditional Provider Loading**:

   - Build providers array based on AppConfig settings
   - Include credentials provider only if enabled for the app
   - Add social providers (GitHub, Google) conditionally
   - Support future provider additions without code changes

2. **Provider Configuration**:
   - Use app-specific client IDs and secrets from AppConfig
   - Implement provider validation at runtime
   - Handle missing provider configurations gracefully

#### Phase 3: API Route Integration

1. **Modify NextAuth API Route**:

   - Extract app configuration from request context
   - Use factory function to create dynamic auth options
   - Maintain request-response compatibility

2. **Request Context Integration**:
   - Access app configuration in API route handler
   - Use existing middleware app resolution system
   - Ensure proper error handling for config retrieval

### Files to Create/Modify

1. **New Files**:

   - `src/lib/auth/authOptionsFactory.ts` - Factory function implementation
   - `src/lib/auth/types.ts` - Authentication-specific type definitions

2. **Modified Files**:
   - `src/AppConfig.ts` - Extended with authentication configuration
   - `src/app/api/auth/[...nextauth]/route.ts` - Dynamic auth options usage
   - `src/lib/auth/authOptions.ts` - Refactor to use factory pattern

### AppConfig Structure Design

```typescript
interface AppConfig {
  // ...existing config...
  auth: {
    providers: {
      credentials: {
        enabled: boolean;
      };
      github?: {
        enabled: boolean;
        clientId: string;
        clientSecret: string;
      };
      google?: {
        enabled: boolean;
        clientId: string;
        clientSecret: string;
      };
      // Future: email, apple, facebook, etc.
    };
    features: {
      multiProvider: boolean; // Allow multiple providers
      accountLinking: boolean; // Link accounts across providers
      twoFactor: boolean; // Enable 2FA support
    };
    // Session and JWT configuration per app
    session: {
      maxAge: number;
      updateAge: number;
    };
  };
}
```

### Security Considerations

- **Provider Validation**: Validate provider configurations at startup
- **Secret Management**: Secure handling of provider client secrets
- **Error Handling**: Don't expose configuration details in errors
- **Request Isolation**: Ensure app configs don't leak between requests

### Benefits

1. **Scalability**: Easy addition of new apps with different auth requirements
2. **Flexibility**: Per-app authentication customization without code changes
3. **Maintainability**: Centralized authentication configuration
4. **Security**: App-specific authentication controls and validation
5. **Developer Experience**: Clear configuration structure and type safety

### Future Enhancements

- Dynamic provider configuration updates without restart
- A/B testing for authentication flows
- Analytics integration for authentication events
- Provider fallback and redundancy strategies
