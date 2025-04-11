import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Session cache expiry in seconds (30 minutes)
const CACHE_MAX_AGE = 30 * 60;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply cache headers for auth session endpoint to reduce redundant calls
  if (pathname === '/api/auth/session') {
    const response = NextResponse.next();

    // Add cache control headers to allow client-side caching
    response.headers.set(
      'Cache-Control',
      `public, max-age=${CACHE_MAX_AGE}, s-maxage=${CACHE_MAX_AGE}`
    );
    response.headers.set('Vary', 'Cookie, Authorization');

    return response;
  }

  // AUTHENTICATED ROUTES
  // applies a global check to all authenticated routes and redirects to login if no token is present
  if (pathname.startsWith('/app')) {
    const isStrictCookiePolicy = process.env.NEXTAUTH_COOKIE_POLICY === 'strict';
    try {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
        // Add these options to ensure proper token handling
        secureCookie: isStrictCookiePolicy,
        cookieName: isStrictCookiePolicy
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
      });

      // If no token and trying to access /app routes, redirect to login
      if (!token) {
        const url = new URL('/login', request.url);
        // Store the original URL to redirect back after login
        url.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(url);
      }
    } catch (error) {
      console.error('Middleware token error:', error);
      // On error, allow the request to proceed
      return NextResponse.next();
    }
  }

  // DEV API
  // allowed in development/test environment if not explicitly disabled
  if (pathname.startsWith('/api/dev')) {
    const isDevEnvironment =
      process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    const isDevApiDisabled =
      process.env.DISABLE_DEV_API === 'true' || process.env.DISABLE_DEV_API === '1';

    if (!isDevEnvironment || isDevApiDisabled) {
      // Return 404 Not Found to avoid leaking the existence of dev endpoints
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }
    // Allow the request to proceed if conditions are met
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // Update matcher to include both /app and /api/dev routes
  matcher: ['/app/:path*', '/api/dev/:path*'],
};
