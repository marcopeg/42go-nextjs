import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAppName } from "./AppConfig"; // Updated import path

export async function middleware(request: NextRequest) {
  const resolvedAppName = getAppName(request); // Corrected variable name

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("X-App-Name", resolvedAppName); // Changed header name & variable
  console.log(
    `@@@@@@ Middleware: Setting X-App-Name header to: ${resolvedAppName}` // Updated log & variable
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
