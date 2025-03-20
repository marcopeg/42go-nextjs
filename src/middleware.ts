import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  // Handle legacy routes that no longer exist - redirect to 404 page or homepage
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/users')
  ) {
    return NextResponse.redirect(new URL('/404', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*', '/dashboard/:path*', '/settings/:path*', '/users/:path*'],
};
