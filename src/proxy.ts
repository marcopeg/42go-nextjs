import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAppID } from "@/42go/config/app-config";
import { APP_ID_HEADER } from "@/42go/lib/app-id";

export async function proxy(request: NextRequest) {
  console.log("@@@@@ MIDDLEWARE :: START");

  // Resolve the AppID using the unified resolution function
  const appID = await getAppID();
  // console.log("@appID:", appID);

  // Set the AppID header for caching in subsequent calls
  const requestHeaders = new Headers(request.headers);
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
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|\\.well-known/).*)",
  ],
};
