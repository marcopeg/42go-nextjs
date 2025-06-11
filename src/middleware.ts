import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export interface RequestAppConfig {
  origin: string;
  // Future dynamic keys can be added here
}

export async function middleware(request: NextRequest) {
  const hostHeader = request.headers.get("host");
  const xForwardedProtoHeader = request.headers.get("x-forwarded-proto");
  const nextUrlProtocol = request.nextUrl.protocol; // Includes ':' e.g. 'http:'
  const nextJsDerivedOrigin = request.nextUrl.origin;

  const protocol = xForwardedProtoHeader || nextUrlProtocol.replace(/:$/, ""); // Ensure protocol doesn't have trailing ':'

  let determinedOrigin: string;
  if (hostHeader) {
    determinedOrigin = `${protocol}://${hostHeader}`;
  } else {
    // Fallback if host header is somehow missing
    determinedOrigin = nextJsDerivedOrigin;
  }

  console.log("@@@@@@ Middleware: Host header:", hostHeader);
  //   console.log(
  //     "@@@@@@ Middleware: X-Forwarded-Proto header:",
  //     xForwardedProtoHeader
  //   );
  //   console.log("@@@@@@ Middleware: request.nextUrl.protocol:", nextUrlProtocol);
  //   console.log(
  //     "@@@@@@ Middleware: request.nextUrl.origin (Next.js derived):",
  //     nextJsDerivedOrigin
  //   );
  //   console.log(
  //     "@@@@@@ Middleware: Determined Origin for config:",
  //     determinedOrigin
  //   );

  const appConfig: RequestAppConfig = { origin: determinedOrigin };

  // Create new headers object and set the custom header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("X-Request-Config", JSON.stringify(appConfig));

  // Return a new response with the modified request headers
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
