# Environment-Based Feature Flags

This document explains how to use environment-based feature flags in the frontend of the application.

## Overview

The application provides utilities for implementing environment-based feature flags in the frontend, similar to the backend `withEnv` utility. These utilities allow you to conditionally render components or enable/disable features based on environment settings.

## Available Utilities

### 1. `withEnvClient` HOC

A Higher-Order Component (HOC) that conditionally renders components based on environment settings.

```tsx
import { withEnvClient, EnvMatchStrategy } from '@/lib/env/with-env-client';

// Define your component
function MyFeatureComponent() {
  return <div>This is a feature that might only be available in certain environments</div>;
}

// Wrap it with the HOC
const ProtectedFeature = withEnvClient({
  environments: ['development', 'test'],
  strategy: EnvMatchStrategy.ANY,
  requiredFlags: {
    NEXT_PUBLIC_FEATURE_FLAG: 'enabled',
  },
  skipFlags: ['NEXT_PUBLIC_DISABLE_FEATURE'],
  fallback: <div>This feature is not available in your environment</div>,
})(MyFeatureComponent);

// Use the protected component
function MyPage() {
  return (
    <div>
      <h1>My Page</h1>
      <ProtectedFeature />
    </div>
  );
}
```

### 2. `useEnvFeature` Hook

A React hook that returns a boolean indicating if a feature is enabled based on environment settings.

```tsx
import { useEnvFeature } from '@/lib/env/with-env-client';

function MyComponent() {
  const isFeatureEnabled = useEnvFeature({
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

- `environments`: Array of allowed environments (e.g., `['development', 'test']`)
- `strategy`: Matching strategy for environments (`ALL` or `ANY`, defaults to `ANY`)
- `requiredFlags`: Object mapping environment variables to required values
- `skipFlags`: Array of environment variables that must be unset or 'false'
- `fallback`: (HOC only) Optional component to render when conditions are not met

## Environment Variables

To use these utilities, you need to set up environment variables in your `.env.local` file:

```
# Enable a feature in development and test environments
NEXT_PUBLIC_FEATURE_FLAG=enabled

# Disable a feature
NEXT_PUBLIC_DISABLE_FEATURE=true
```

> **Important**: All client-side environment variables must be prefixed with `NEXT_PUBLIC_` to be accessible in the browser.

## Best Practices

1. **Use the HOC for component-level protection**:

   - When you want to conditionally render entire components
   - When you want to provide a fallback UI

2. **Use the hook for conditional logic**:

   - When you need to conditionally execute code
   - When you want to conditionally render parts of a component

3. **Keep environment variables consistent**:

   - Use the same environment variables for both frontend and backend
   - Prefix all client-side variables with `NEXT_PUBLIC_`

4. **Provide meaningful fallbacks**:

   - Always provide a fallback component when using the HOC
   - Consider user experience when a feature is not available

5. **Use environment-specific builds**:
   - Set up different environment variables for different environments
   - Use `.env.development`, `.env.production`, etc. for environment-specific settings

## Example Use Cases

### 1. Beta Features

```tsx
const BetaFeature = withEnvClient({
  environments: ['development', 'test'],
  requiredFlags: {
    NEXT_PUBLIC_BETA_FEATURES: 'enabled',
  },
  fallback: <div>This beta feature is not available yet</div>,
})(MyBetaComponent);
```

### 2. Environment-Specific UI

```tsx
function MyComponent() {
  const isDevUI = useEnvFeature({
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

### 3. Feature Toggles

```tsx
function FeatureToggle() {
  const isFeatureEnabled = useEnvFeature({
    requiredFlags: {
      NEXT_PUBLIC_FEATURE_TOGGLE: 'enabled',
    },
  });

  return (
    <div>
      <h2>Feature Toggle</h2>
      <p>Status: {isFeatureEnabled ? 'Enabled' : 'Disabled'}</p>
    </div>
  );
}
```

## Troubleshooting

1. **Feature not showing up**:

   - Check that your environment variables are correctly set
   - Verify that the environment variables are prefixed with `NEXT_PUBLIC_`
   - Make sure you're in the correct environment (development, test, production)

2. **Hydration errors**:

   - Ensure that environment variables are consistent between server and client
   - Use `useEffect` to handle environment-dependent logic

3. **Type errors**:
   - Make sure you're passing the correct props to your components
   - Check that your environment variables are correctly typed
