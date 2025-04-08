# Environment Feature Flags

This document describes how to use environment-based feature flags in the application.

## Overview

Environment feature flags allow you to conditionally enable or disable features based on the current environment (development, test, production) and environment variables. This is useful for:

- Enabling beta features only in development or test environments
- Showing different UI elements based on the environment
- Implementing feature toggles that can be controlled via environment variables

## Available Utilities

### `withEnv` HOC

A Higher-Order Component (HOC) that conditionally renders components based on environment settings.

```tsx
import { withEnv } from '@/lib/env/use-env';

const BetaFeature = withEnv({
  environments: ['development', 'test'],
  requiredFlags: {
    NEXT_PUBLIC_BETA_FEATURES: 'enabled',
  },
  fallback: <div>This beta feature is not available yet</div>,
})(MyBetaComponent);
```

### `useEnv` Hook

A React hook that returns a boolean indicating if a feature is enabled based on environment settings.

```tsx
import { useEnv } from '@/lib/env/use-env';

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

## Configuration Options

Both utilities accept the following options:

- `environments`: Array of allowed environments (e.g., ['development', 'test'])
- `strategy`: Matching strategy for environments (ALL or ANY, defaults to ANY)
- `requiredFlags`: Object mapping environment variables to required values
- `skipFlags`: Array of environment variables that must be unset or 'false'
- `fallback`: (HOC only) Optional component to render when conditions are not met

## Environment Variables

To use environment feature flags, you need to set up the appropriate environment variables in your `.env.local` file:

```
# Enable beta features in development
NEXT_PUBLIC_BETA_FEATURES=enabled

# Feature toggles
NEXT_PUBLIC_FEATURE_FLAG=enabled
NEXT_PUBLIC_DISABLE_FEATURE=false
```

Note: All client-side environment variables must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser.

## Best Practices

1. Always provide a meaningful fallback component when using the HOC
2. Use consistent naming conventions for environment variables
3. Document all feature flags in a central location
4. Use the `useEnv` hook for conditional logic within components
5. Use the `withEnv` HOC for wrapping entire components
6. Consider using the `skipFlags` option to disable features in specific environments

## Example Use Cases

### Beta Features

```tsx
const BetaFeature = withEnv({
  environments: ['development', 'test'],
  requiredFlags: {
    NEXT_PUBLIC_BETA_FEATURES: 'enabled',
  },
  fallback: <div>This beta feature is not available yet</div>,
})(MyBetaComponent);
```

### Environment-Specific UI

```tsx
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

### Feature Toggle

```tsx
function FeatureToggle() {
  const isEnabled = useEnv({
    requiredFlags: {
      NEXT_PUBLIC_FEATURE_TOGGLE: 'enabled',
    },
  });

  return isEnabled ? <NewFeature /> : <OldFeature />;
}
```

## Troubleshooting

### Feature Not Showing Up

1. Check that the environment variable is set correctly in `.env.local`
2. Verify that the environment variable is prefixed with `NEXT_PUBLIC_`
3. Make sure the current environment is included in the `environments` array
4. Check that the environment variable value matches the expected value in `requiredFlags`

### Hydration Errors

If you see hydration errors, make sure that the environment check is consistent between server and client. The `useEnv` hook handles this automatically by returning `false` during server-side rendering.

### Type Errors

If you see type errors, make sure you're using the correct types from the `use-env` module:

```tsx
import { useEnv, withEnv } from '@/lib/env/use-env';
```
