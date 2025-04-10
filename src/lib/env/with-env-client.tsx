'use client';

import React from 'react';
import { checkEnvironment, EnvMatchStrategy, EnvOptions } from './env-utils';

/**
 * Options for environment-based feature flags with React-specific options
 */
export interface WithEnvClientOptions extends EnvOptions {
  /**
   * Optional fallback component to render when conditions are not met
   */
  fallback?: React.ReactNode;
}

/**
 * Higher-order component to conditionally render components based on environment settings
 * Similar to the backend withEnv but for client-side components
 *
 * @param options Environment options for the component
 * @returns A function that wraps the component with environment protection
 */
export function withEnvClient<P extends object>(options: WithEnvClientOptions) {
  return function (Component: React.ComponentType<P>) {
    return function EnvProtectedComponent(props: P) {
      const [isEnabled, setIsEnabled] = React.useState<boolean | null>(null);

      React.useEffect(() => {
        // Get current environment
        const currentEnv = process.env.NODE_ENV || 'development';

        // Use the shared environment check utility
        const { isAllowed } = checkEnvironment(options, currentEnv, process.env);

        setIsEnabled(isAllowed);
      }, []);

      // Show loading state while checking environment
      if (isEnabled === null) {
        return null;
      }

      // If not enabled, show fallback or nothing
      if (!isEnabled) {
        return options.fallback || null;
      }

      // If enabled, render the component
      return <Component {...props} />;
    };
  };
}

/**
 * Hook to check if a feature is enabled based on environment settings
 *
 * @param options Environment options to check
 * @returns Boolean indicating if the feature is enabled
 */
export function useEnvFeature(options: EnvOptions): boolean {
  const [isEnabled, setIsEnabled] = React.useState<boolean>(false);

  React.useEffect(() => {
    // Get current environment
    const currentEnv = process.env.NODE_ENV || 'development';

    // Use the shared environment check utility
    const { isAllowed } = checkEnvironment(options, currentEnv, process.env);

    setIsEnabled(isAllowed);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return isEnabled;
}

// Re-export the EnvMatchStrategy enum
export { EnvMatchStrategy };
