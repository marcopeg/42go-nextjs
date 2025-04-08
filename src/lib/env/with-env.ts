import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';

type RouteHandler = (req: NextRequest) => Promise<NextResponse>;

export enum EnvMatchStrategy {
  ALL = 'ALL',
  ANY = 'ANY',
}

interface EnvOptions {
  environments: string[];
  strategy?: EnvMatchStrategy;
  requiredFlags?: Record<string, string>;
  skipFlags?: string[];
}

/**
 * Higher-order function to protect routes based on environment
 * Similar to withAuth but for environment-based protection
 *
 * @param options Environment options for the route
 * @returns A function that wraps the route handler with environment protection
 *
 * @example
 * ```typescript
 * export const GET = withEnv({
 *   environments: ['development', 'test'],
 *   strategy: EnvMatchStrategy.ANY,
 *   requiredFlags: {
 *     FOO: '123',
 *   },
 *   skipFlags: ['DISABLE_DEV_API'], // unset flags are considered as "false"
 * })(async (req) => {
 *   // Your route handler code
 * });
 * ```
 */
export function withEnv(options: EnvOptions) {
  return function (handler: RouteHandler): RouteHandler {
    return async function (req: NextRequest): Promise<NextResponse> {
      const { environments, strategy = EnvMatchStrategy.ANY } = options;
      const currentEnv = env.NODE_ENV;

      // Check if the current environment is allowed
      const isAllowed =
        strategy === EnvMatchStrategy.ALL
          ? environments.every(env => env === currentEnv)
          : environments.includes(currentEnv);

      if (!isAllowed) {
        return NextResponse.json(
          {
            error: 'Not Available',
            message: `This endpoint is not available in ${currentEnv} environment`,
            allowedEnvironments: environments,
          },
          { status: 404 }
        );
      }

      // Check if skipFlags are set
      const skipFlags = options.skipFlags;
      if (skipFlags) {
        const skipFlagCheck = skipFlags.every(flag => (process.env[flag] || 'false') === 'false');
        if (!skipFlagCheck) {
          const skipFlagsReport = options.skipFlags!.map(key => ({
            flag: key,
            value: process.env[key] || 'not set',
          }));

          return NextResponse.json(
            {
              error: 'Not Available',
              message: `This endpoint is not available with the current flags`,
              skipFlags: skipFlagsReport,
            },
            { status: 404 }
          );
        }
      }
      // Check if any flags are set
      // Unset flags are considered as "false"
      const requiredFlags = options.requiredFlags;
      if (requiredFlags) {
        const flagKeys = Object.keys(requiredFlags);

        const flagCheck = flagKeys.every(key => {
          const value = requiredFlags[key];
          return process.env[key] === value;
        });

        if (!flagCheck) {
          const requiredFlagsReport = flagKeys.map(key => ({
            flag: key,
            required: requiredFlags[key],
            value: process.env[key] || 'not set',
          }));

          return NextResponse.json(
            {
              error: 'Not Available',
              message: `This endpoint is not available with the current flags`,
              requiredFlags: requiredFlagsReport,
            },
            { status: 404 }
          );
        }
      }

      // If environment check passed, execute the handler
      return handler(req);
    };
  };
}
