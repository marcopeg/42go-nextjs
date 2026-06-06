import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveAppIDFromHeaders } from '@/42go/config/app-config';
import { APP_ID_HEADER } from '@/42go/lib/app-id';

export async function proxy(request: NextRequest) {
  // console.log("@@@@@ MIDDLEWARE :: START");

  // The app id header is reserved for the proxy. Public requests may use
  // configured header matchers, but cannot choose this internal value.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(APP_ID_HEADER);

  const appID = resolveAppIDFromHeaders(requestHeaders);
  if (appID) {
    requestHeaders.set(APP_ID_HEADER, appID);
  }

  // Forward the request
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  // Apply middleware only to paths that need app ID resolution
  // Use simple patterns that Next.js can handle
  matcher: [
    /*
     * Match all request paths except static assets and Next.js internals
     * - Include: API routes, pages, dynamic routes
     * - Exclude: static files, images, Next.js internals
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|\\.well-known/).*)',
  ],
};
