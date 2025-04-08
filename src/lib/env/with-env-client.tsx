'use client';

import React, { useEffect, useState } from 'react';

/**
 * Environment match strategy enum
 */
export enum EnvMatchStrategy {
  ALL = 'ALL',
  ANY = 'ANY',
}

/**
 * Options for environment-based feature flags
 */
export interface EnvOptions {
  /**
   * Array of allowed environments (e.g., ['development', 'test'])
   */
  environments?: string[];

  /**
   * Matching strategy for environments (ALL or ANY, defaults to ANY)
   */
  strategy?: EnvMatchStrategy;

  /**
   * Object mapping environment variables to required values
   */
  requiredFlags?: Record<string, string>;

  /**
   * Array of environment variables that must be unset or 'false'
   */
  skipFlags?: string[];

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
 * const ProtectedComponent = withEnvClient({
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
export function withEnvClient<P extends object>(options: EnvOptions) {
  return function (Component: React.ComponentType<P>) {
    return function EnvProtectedComponent(props: P) {
      const [isEnabled, setIsEnabled] = useState<boolean | null>(null);

      useEffect(() => {
        // Default to true if no environments are specified
        if (!options.environments || options.environments.length === 0) {
          setIsEnabled(true);
          return;
        }

        // Get current environment
        const currentEnv = process.env.NODE_ENV || 'development';

        // Check if the current environment is allowed
        const isEnvAllowed =
          options.strategy === EnvMatchStrategy.ALL
            ? options.environments.every(env => env === currentEnv)
            : options.environments.includes(currentEnv);

        if (!isEnvAllowed) {
          setIsEnabled(false);
          return;
        }

        // Check if skipFlags are set
        if (options.skipFlags && options.skipFlags.length > 0) {
          const skipFlagCheck = options.skipFlags.every(
            flag => (process.env[flag] || 'false') === 'false'
          );
          if (!skipFlagCheck) {
            setIsEnabled(false);
            return;
          }
        }

        // Check if required flags match their expected values
        if (options.requiredFlags) {
          const flagKeys = Object.keys(options.requiredFlags);
          const flagCheck = flagKeys.every(key => {
            const value = options.requiredFlags![key];
            return process.env[key] === value;
          });
          if (!flagCheck) {
            setIsEnabled(false);
            return;
          }
        }

        // All checks passed
        setIsEnabled(true);
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
 *   const isFeatureEnabled = useEnvFeature({
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
export function useEnvFeature(options: EnvOptions): boolean {
  const [isEnabled, setIsEnabled] = useState<boolean>(false);

  useEffect(() => {
    // Default to true if no environments are specified
    if (!options.environments || options.environments.length === 0) {
      setIsEnabled(true);
      return;
    }

    // Get current environment
    const currentEnv = process.env.NODE_ENV || 'development';

    // Check if the current environment is allowed
    const isEnvAllowed =
      options.strategy === EnvMatchStrategy.ALL
        ? options.environments.every(env => env === currentEnv)
        : options.environments.includes(currentEnv);

    if (!isEnvAllowed) {
      setIsEnabled(false);
      return;
    }

    // Check if skipFlags are set
    if (options.skipFlags && options.skipFlags.length > 0) {
      const skipFlagCheck = options.skipFlags.every(
        flag => (process.env[flag] || 'false') === 'false'
      );
      if (!skipFlagCheck) {
        setIsEnabled(false);
        return;
      }
    }

    // Check if required flags match their expected values
    if (options.requiredFlags) {
      const flagKeys = Object.keys(options.requiredFlags);
      const flagCheck = flagKeys.every(key => {
        const value = options.requiredFlags![key];
        return process.env[key] === value;
      });
      if (!flagCheck) {
        setIsEnabled(false);
        return;
      }
    }

    // All checks passed
    setIsEnabled(true);
  }, []);

  return isEnabled;
}
