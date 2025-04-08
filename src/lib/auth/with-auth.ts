import { NextRequest, NextResponse } from 'next/server';
import { protectRoute } from './route-protection';
import { AccessControlOptions } from './access-control';

type RouteHandler = (req: NextRequest) => Promise<NextResponse>;

/**
 * Higher-order function to protect routes with authentication and authorization
 * Similar to NestJS decorators but using a functional approach
 *
 * @param options Access control options for the route
 * @returns A function that wraps the route handler with protection
 *
 * @example
 * ```typescript
 * export const GET = withAuth({
 *   grants: ['users:list'],
 *   roles: ['admin']
 * })(async (req) => {
 *   // Your route handler code
 * });
 * ```
 */
export function withAuth(options: AccessControlOptions) {
  return function (handler: RouteHandler): RouteHandler {
    return async function (req: NextRequest): Promise<NextResponse> {
      const response = await protectRoute(req, options);

      // If the response is not NextResponse.next(), it means there was an error
      if (response.status !== 200) {
        return response;
      }

      // If authentication and authorization passed, execute the handler
      return handler(req);
    };
  };
}
