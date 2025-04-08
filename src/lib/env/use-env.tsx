'use client';

import React, { useEffect, useState } from 'react';
import { checkEnvironment, EnvOptions } from './env-utils';

/**
 * Options for environment-based feature flags with React-specific options
 */
export interface UseEnvOptions extends EnvOptions {
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
 *
 * @example
 * ```tsx
 * const ProtectedComponent = withEnv({
 *   environments: ['development', 'test'],
 *   strategy: EnvMatchStrategy.ANY,
 *   requiredFlags: {
 *     NEXT_PUBLIC_FEATURE_FLAG: 'enabled',
 *   },
 *   skipFlags: ['NEXT_PUBLIC_DISABLE_FEATURE'],
 *   fallback: <div>This feature is not available in your environment</div>,
 * })(MyComponent);
 * ```
 */
export function withEnv<P extends object>(options: UseEnvOptions) {
  return function (Component: React.ComponentType<P>) {
    return function EnvProtectedComponent(props: P) {
      const [isEnabled, setIsEnabled] = useState<boolean | null>(null);

      useEffect(() => {
        // Get current environment
        const currentEnv = process.env.NODE_ENV || 'development';

        // Use the shared environment check utility
        const { isAllowed } = checkEnvironment(options, currentEnv, process.env);

        setIsEnabled(isAllowed);
      }, []);

      // Show nothing during SSR or while checking
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
 * @param options Environment options for the feature
 * @returns A boolean indicating if the feature is enabled
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isFeatureEnabled = useEnv({
 *     environments: ['development', 'test'],
 *     requiredFlags: {
 *       NEXT_PUBLIC_FEATURE_FLAG: 'enabled',
 *     },
 *   });
 *
 *   if (!isFeatureEnabled) {
 *     return <div>Feature not available</div>;
 *   }
 *
 *   return <div>Feature content</div>;
 * }
 * ```
 */
export function useEnv(options: EnvOptions): boolean {
  const [isEnabled, setIsEnabled] = useState<boolean>(false);

  useEffect(() => {
    // Get current environment
    const currentEnv = process.env.NODE_ENV || 'development';

    // Use the shared environment check utility
    const { isAllowed } = checkEnvironment(options, currentEnv, process.env);

    setIsEnabled(isAllowed);
  }, []);

  return isEnabled;
}
