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
}

/**
 * Type for environment check details
 */
export interface EnvCheckDetails {
  currentEnv?: string;
  allowedEnvironments?: string[];
  strategy?: EnvMatchStrategy;
  skipFlags?: Array<{ flag: string; value: string }>;
  requiredFlags?: Array<{ flag: string; required: string; value: string }>;
}

/**
 * Checks if the current environment meets the specified criteria
 *
 * @param options Environment options to check
 * @param currentEnv The current environment to check against
 * @param envVars Object containing environment variables to check
 * @returns Object with result and details about the check
 */
export function checkEnvironment(
  options: EnvOptions,
  currentEnv: string,
  envVars: Record<string, string | undefined>
): {
  isAllowed: boolean;
  reason?: string;
  details?: EnvCheckDetails;
} {
  const { environments = [], strategy = EnvMatchStrategy.ANY } = options;

  // Default to true if no environments are specified
  if (!environments || environments.length === 0) {
    return { isAllowed: true };
  }

  // Check if the current environment is allowed
  const isEnvAllowed =
    strategy === EnvMatchStrategy.ALL
      ? environments.every(env => env === currentEnv)
      : environments.includes(currentEnv);

  if (!isEnvAllowed) {
    return {
      isAllowed: false,
      reason: 'environment',
      details: {
        currentEnv,
        allowedEnvironments: environments,
        strategy,
      },
    };
  }

  // Check if skipFlags are set
  if (options.skipFlags && options.skipFlags.length > 0) {
    const skipFlagCheck = options.skipFlags.every(flag => (envVars[flag] || 'false') === 'false');
    if (!skipFlagCheck) {
      const skipFlagsReport = options.skipFlags.map(key => ({
        flag: key,
        value: envVars[key] || 'not set',
      }));

      return {
        isAllowed: false,
        reason: 'skipFlags',
        details: {
          skipFlags: skipFlagsReport,
        },
      };
    }
  }

  // Check if required flags match their expected values
  if (options.requiredFlags) {
    const flagKeys = Object.keys(options.requiredFlags);
    const flagCheck = flagKeys.every(key => {
      const value = options.requiredFlags![key];
      return envVars[key] === value;
    });

    if (!flagCheck) {
      const requiredFlagsReport = flagKeys.map(key => ({
        flag: key,
        required: options.requiredFlags![key],
        value: envVars[key] || 'not set',
      }));

      return {
        isAllowed: false,
        reason: 'requiredFlags',
        details: {
          requiredFlags: requiredFlagsReport,
        },
      };
    }
  }

  // All checks passed
  return { isAllowed: true };
}
