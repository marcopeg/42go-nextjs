import { NextRequest, NextResponse } from 'next/server';
import { checkAccess, AccessControlOptions } from './access-control';

/**
 * Error response interface
 */
interface ErrorResponse {
  error: string;
  message: string;
}

/**
 * Protects a route based on access control rules
 *
 * @param req The Next.js request object
 * @param options Access control options
 * @returns Promise<NextResponse> The response object
 */
export async function protectRoute(
  req: NextRequest,
  options: AccessControlOptions
): Promise<NextResponse> {
  try {
    const result = await checkAccess(options);

    switch (result.status) {
      case 'unauthenticated':
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' } as ErrorResponse,
          { status: 401 }
        );
      case 'forbidden':
        return NextResponse.json(
          { error: 'Forbidden', message: 'Access denied' } as ErrorResponse,
          { status: 403 }
        );
      case 'granted':
        return NextResponse.next();
      default:
        return NextResponse.json(
          {
            error: 'Internal Server Error',
            message: 'Unexpected access control result',
          } as ErrorResponse,
          { status: 500 }
        );
    }
  } catch (error) {
    console.error('Route protection error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'An unexpected error occurred' } as ErrorResponse,
      { status: 500 }
    );
  }
}
