import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { matchAppName, APP_HEADER_NAME } from "@/AppConfig"; // Updated import path

export async function middleware(request: NextRequest) {
  // Set the AppName header
  const resolvedAppName = await matchAppName(request);
  const requestHeaders = new Headers(request.headers);

  if (resolvedAppName) {
    requestHeaders.set(APP_HEADER_NAME, resolvedAppName);
    console.log(
      `@@@@@@ Middleware: Setting ${APP_HEADER_NAME} header to: ${resolvedAppName}`
    );
  } else {
    console.warn(
      `@@@@@@ Middleware: No valid app name resolved, not setting ${APP_HEADER_NAME} header.`
    );
  }

  // Set the pathname header for URL-based feature flag checking
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

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
