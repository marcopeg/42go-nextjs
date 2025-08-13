import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { matchAppID, APP_ID_HEADER } from "@/42go/lib/app-id";

export async function middleware(request: NextRequest) {
  // Resolve the AppID
  const appID = await matchAppID(request);

  // Set the AppID header if resolved
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
  // Apply middleware to all paths except for Next.js internals, static files, and images.
  // This ensures API routes also get the header.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
