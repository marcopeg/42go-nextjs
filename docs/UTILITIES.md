# Utility Functions

This document describes high-level utility functions used throughout the application.

## Authentication and Authorization

### `withAuth`

A higher-order function that protects routes with authentication and authorization. It's similar to NestJS decorators but uses a functional approach.

```typescript
export const GET = withAuth({
  grants: ['users:list'],
  roles: ['admin'],
})(async req => {
  // Your route handler code
});
```

#### Parameters

- `options`: Access control options
  - `grants`: Array of grant IDs required to access the resource
  - `roles`: Array of role IDs required to access the resource
  - `roleStrategy`: Strategy for role matching (ALL or ANY, defaults to ALL)

#### Behavior

1. Checks if the user is authenticated
2. If not authenticated, returns a 401 Unauthorized response
3. If authenticated, checks for required grants and roles
4. If grants/roles check fails, returns a 403 Forbidden response
5. If all checks pass, executes the route handler

#### Example Usage

```typescript
// Protect a route that requires both authentication and specific grants
export const GET = withAuth({
  grants: ['users:list'],
  roles: ['backoffice'],
})(async () => {
  // Only users with 'users:list' grant and 'backoffice' role can access this
  return NextResponse.json({ data: 'protected data' });
});

// Protect a route that only requires authentication
export const POST = withAuth({})(async () => {
  // Any authenticated user can access this
  return NextResponse.json({ data: 'protected data' });
});
```

## Environment Protection

### `withEnv`

A higher-order function that protects routes based on environment settings. It's similar to `withAuth` but for environment-based protection.

```typescript
export const GET = withEnv({
  environments: ['development', 'test'],
  strategy: EnvMatchStrategy.ANY,
  requiredFlags: {
    FOO: '123',
  },
  skipFlags: ['DISABLE_DEV_API'],
})(async req => {
  // Your route handler code
});
```

#### Parameters

- `options`: Environment options
  - `environments`: Array of allowed environments (e.g., ['development', 'test'])
  - `strategy`: Matching strategy for environments (ALL or ANY, defaults to ANY)
  - `requiredFlags`: Object mapping environment variables to required values
  - `skipFlags`: Array of environment variables that must be unset or 'false'

#### Behavior

1. Checks if the current environment is allowed based on the strategy
2. If environment check fails, returns a 404 Not Available response
3. Checks if any skip flags are set (unset flags are considered as "false")
4. If skip flags check fails, returns a 404 Not Available response
5. Checks if required flags match their expected values
6. If required flags check fails, returns a 404 Not Available response
7. If all checks pass, executes the route handler

#### Example Usage

```typescript
// Protect a route that's only available in development
export const GET = withEnv({
  environments: ['development'],
})(async () => {
  // Only accessible in development environment
  return NextResponse.json({ data: 'dev only data' });
});

// Protect a route that's available in multiple environments with flags
export const POST = withEnv({
  environments: ['development', 'test'],
  requiredFlags: {
    FEATURE_FLAG: 'enabled',
  },
  skipFlags: ['DISABLE_FEATURE'],
})(async () => {
  // Accessible in development/test with specific flags
  return NextResponse.json({ data: 'feature enabled data' });
});
```

## Client-Side Environment Feature Flags

### `withEnv`

A Higher-Order Component (HOC) that conditionally renders components based on environment settings. It's similar to the backend `withEnv` but for client-side components.

```tsx
const ProtectedComponent = withEnv({
  environments: ['development', 'test'],
  strategy: EnvMatchStrategy.ANY,
  requiredFlags: {
    NEXT_PUBLIC_FEATURE_FLAG: 'enabled',
  },
  skipFlags: ['NEXT_PUBLIC_DISABLE_FEATURE'],
  fallback: <div>This feature is not available in your environment</div>,
})(MyComponent);
```

#### Parameters

- `options`: Environment options
  - `environments`: Array of allowed environments (e.g., ['development', 'test'])
  - `strategy`: Matching strategy for environments (ALL or ANY, defaults to ANY)
  - `requiredFlags`: Object mapping environment variables to required values
  - `skipFlags`: Array of environment variables that must be unset or 'false'
  - `fallback`: Optional component to render when conditions are not met

#### Behavior

1. Checks if the current environment is allowed based on the strategy
2. Checks if any skip flags are set (unset flags are considered as "false")
3. Checks if required flags match their expected values
4. If all checks pass, renders the component
5. If any check fails, renders the fallback component or nothing

### `useEnv`

A React hook that returns a boolean indicating if a feature is enabled based on environment settings.

```tsx
function MyComponent() {
  const isFeatureEnabled = useEnv({
    environments: ['development', 'test'],
    requiredFlags: {
      NEXT_PUBLIC_FEATURE_FLAG: 'enabled',
    },
  });

  if (!isFeatureEnabled) {
    return <div>Feature not available</div>;
  }

  return <div>Feature content</div>;
}
```

#### Parameters

- `options`: Environment options (same as `withEnv`)

#### Behavior

- Returns `true` if all environment checks pass
- Returns `false` if any check fails

#### Example Usage

```tsx
// Conditionally render a component based on environment
const BetaFeature = withEnv({
  environments: ['development', 'test'],
  requiredFlags: {
    NEXT_PUBLIC_BETA_FEATURES: 'enabled',
  },
  fallback: <div>This beta feature is not available yet</div>,
})(MyBetaComponent);

// Conditionally render parts of a component
function MyComponent() {
  const isDevUI = useEnv({
    environments: ['development'],
  });

  return (
    <div>
      <h1>My Component</h1>
      {isDevUI && <div className="debug-panel">Debug Information</div>}
    </div>
  );
}
```

## Best Practices

1. Use `withAuth` for protecting routes that require authentication and/or specific permissions
2. Use `withEnv` for protecting routes that should only be available in specific environments
3. Use `withEnv` HOC for conditionally rendering components based on environment settings
4. Use `useEnv` hook for conditional logic within components
5. Combine these utilities when needed for maximum security and flexibility
6. Always provide clear error messages in the responses
7. Use appropriate HTTP status codes for different types of access denials
8. Consider using wildcards in grants for more flexible permission management
9. Keep environment-specific routes separate from production routes
10. Prefix all client-side environment variables with `NEXT_PUBLIC_`
