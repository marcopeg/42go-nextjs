import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';
import { checkEnvironment, EnvOptions } from './env-utils';

type RouteHandler = (req: NextRequest) => Promise<NextResponse>;

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
      const currentEnv = env.NODE_ENV;

      // Use the shared environment check utility
      const { isAllowed, reason, details } = checkEnvironment(options, currentEnv, process.env);

      if (!isAllowed) {
        // Return appropriate error response based on the reason
        if (reason === 'environment') {
          return NextResponse.json(
            {
              error: 'Not Available',
              message: `This endpoint is not available in ${currentEnv} environment`,
              allowedEnvironments: details?.allowedEnvironments,
            },
            { status: 404 }
          );
        } else if (reason === 'skipFlags') {
          return NextResponse.json(
            {
              error: 'Not Available',
              message: `This endpoint is not available with the current flags`,
              skipFlags: details?.skipFlags,
            },
            { status: 404 }
          );
        } else if (reason === 'requiredFlags') {
          return NextResponse.json(
            {
              error: 'Not Available',
              message: `This endpoint is not available with the current flags`,
              requiredFlags: details?.requiredFlags,
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
