import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAppName, APP_HEADER_NAME } from "./AppConfig"; // Updated import path

export async function middleware(request: NextRequest) {
  // Set the AppName header
  const resolvedAppName = await getAppName(request);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(APP_HEADER_NAME, resolvedAppName);
  console.log(
    `@@@@@@ Middleware: Setting ${APP_HEADER_NAME} header to: ${resolvedAppName}`
  );

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
