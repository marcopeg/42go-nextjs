import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { matchAppName, APP_HEADER_NAME } from "@/42go/lib/match";

export async function middleware(request: NextRequest) {
  // Resolve the appName
  const appName = await matchAppName(request);

  // Set the AppName header
  const requestHeaders = new Headers(request.headers);
  if (appName) {
    requestHeaders.set(APP_HEADER_NAME, appName);
  }

  // Forward the request
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  // Apply middleware to all paths except for Next.js internals, static files, and images.
  // This ensures API routes also get the header.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
