'use client';

import { withEnvClient, EnvMatchStrategy, useEnvFeature } from '@/lib/env/with-env-client';

// A simple component that will be conditionally rendered
function BetaFeature() {
  return (
    <div className="p-4 border border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
      <h3 className="text-lg font-semibold text-yellow-700 dark:text-yellow-300">Beta Feature</h3>
      <p className="text-yellow-600 dark:text-yellow-400">
        This is a beta feature that is only available in development and test environments.
      </p>
    </div>
  );
}

// Wrap the component with the HOC
const ProtectedBetaFeature = withEnvClient({
  environments: ['development', 'test'],
  strategy: EnvMatchStrategy.ANY,
  requiredFlags: {
    NEXT_PUBLIC_BETA_FEATURES: 'enabled',
  },
  skipFlags: ['NEXT_PUBLIC_DISABLE_BETA'],
  fallback: (
    <div className="p-4 border border-gray-300 bg-gray-50 dark:bg-gray-800 rounded-md">
      <p className="text-gray-600 dark:text-gray-400">
        This beta feature is not available in your environment.
      </p>
    </div>
  ),
})(BetaFeature);

// A component that uses the hook
function FeatureToggle() {
  const isFeatureEnabled = useEnvFeature({
    requiredFlags: {
      NEXT_PUBLIC_FEATURE_TOGGLE: 'enabled',
    },
  });

  return (
    <div className="p-4 border border-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-md">
      <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-300">Feature Toggle</h3>
      <p className="text-blue-600 dark:text-blue-400">
        Status: {isFeatureEnabled ? 'Enabled' : 'Disabled'}
      </p>
      <p className="text-sm text-blue-500 dark:text-blue-400 mt-2">
        This feature is controlled by the NEXT_PUBLIC_FEATURE_TOGGLE environment variable.
      </p>
    </div>
  );
}

// A component that shows environment-specific UI
function EnvironmentSpecificUI() {
  const isDevUI = useEnvFeature({
    environments: ['development'],
  });

  return (
    <div className="p-4 border border-green-400 bg-green-50 dark:bg-green-900/20 rounded-md">
      <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">
        Environment-Specific UI
      </h3>
      {isDevUI ? (
        <div className="mt-2 p-2 bg-green-100 dark:bg-green-800 rounded">
          <p className="text-green-700 dark:text-green-300 font-mono text-sm">
            Debug Information (Development Only)
          </p>
          <pre className="text-xs text-green-600 dark:text-green-400 mt-1 overflow-auto">
            {JSON.stringify(
              {
                environment: process.env.NODE_ENV,
                timestamp: new Date().toISOString(),
                userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Server',
              },
              null,
              2
            )}
          </pre>
        </div>
      ) : (
        <p className="text-green-600 dark:text-green-400 mt-2">
          This is the production UI. Debug information is hidden.
        </p>
      )}
    </div>
  );
}

// Main example component
export function FeatureFlagExample() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Environment-Based Feature Flags</h2>
      <p className="text-muted-foreground">
        This example demonstrates how to use environment-based feature flags in the frontend.
      </p>

      <div className="grid gap-6 md:grid-cols-2">
        <ProtectedBetaFeature />
        <FeatureToggle />
      </div>

      <EnvironmentSpecificUI />

      <div className="p-4 border border-purple-400 bg-purple-50 dark:bg-purple-900/20 rounded-md">
        <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300">How to Use</h3>
        <p className="text-purple-600 dark:text-purple-400 mt-2">
          To enable these features, add the following to your <code>.env.local</code> file:
        </p>
        <pre className="text-xs text-purple-600 dark:text-purple-400 mt-2 p-2 bg-purple-100 dark:bg-purple-800 rounded overflow-auto">
          {`# Enable beta features
NEXT_PUBLIC_BETA_FEATURES=enabled

# Enable feature toggle
NEXT_PUBLIC_FEATURE_TOGGLE=enabled

# To disable beta features
# NEXT_PUBLIC_DISABLE_BETA=true`}
        </pre>
      </div>
    </div>
  );
}
