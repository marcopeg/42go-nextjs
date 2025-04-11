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

  // Check if the path starts with /app
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

      // Debug logging
      console.log('Middleware token check:', {
        path: pathname,
        hasToken: !!token,
        strict: isStrictCookiePolicy,
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

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*'],
};
