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
    const session = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // If no session and trying to access /app routes, redirect to login
    if (!session) {
      const url = new URL('/login', request.url);
      // Store the original URL to redirect back after login
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*'],
};
