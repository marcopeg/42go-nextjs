import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { matchAppID, APP_ID_HEADER } from "@/42go/lib/app-id";

export async function middleware(request: NextRequest) {
  console.log("@@@@@ MIDDLEWARE :: START");
  // Resolve the AppID
  const appID = await matchAppID(request);
  console.log("@matched appID", appID);

  // Set the AppID header if resolved
  const requestHeaders = new Headers(request.headers);
  if (appID) {
    requestHeaders.set(APP_ID_HEADER, appID);
  }

  // Forward the request
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  // Set lightweight debug headers to confirm middleware execution in prod
  // These are safe, short-lived, and can be removed after debugging
  try {
    response.headers.set("x-mw-probe", "1");
    response.headers.set("x-mw-appid", String(appID ?? ""));
    const host =
      request.headers.get("x-forwarded-host") ||
      request.headers.get("host") ||
      "";
    response.headers.set("x-mw-host", host);
  } catch {}
  console.log("@@@@@ MIDDLEWARE :: END");
  return response;
}

export const config = {
  // Apply middleware to all paths except for Next.js internals, static files, and images.
  // This ensures API routes also get the header.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
