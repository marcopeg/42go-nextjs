import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { type SetupName, DEFAULT_SETUP_NAME } from "./AppConfig.type"; // Removed .ts

export async function middleware(request: NextRequest) {
  const hostHeader = request.headers.get("host");
  const customSetupHeader = request.headers.get("x-setup-name");

  let resolvedSetupName: SetupName = DEFAULT_SETUP_NAME;

  if (
    customSetupHeader &&
    (customSetupHeader === "app1" ||
      customSetupHeader === "app2" ||
      customSetupHeader === "default")
  ) {
    resolvedSetupName = customSetupHeader as SetupName;
    console.log(
      `@@@@@@ Middleware: Using setup name from x-setup-name header: ${resolvedSetupName}`
    );
  } else if (hostHeader) {
    if (hostHeader.startsWith("app1.")) {
      resolvedSetupName = "app1";
    } else if (hostHeader.startsWith("app2.")) {
      resolvedSetupName = "app2";
    }
    console.log(
      `@@@@@@ Middleware: Derived setup name from host (${hostHeader}): ${resolvedSetupName}`
    );
  } else {
    console.log(
      `@@@@@@ Middleware: No host or x-setup-name header, using default setup name: ${resolvedSetupName}`
    );
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("X-Setup-Name-Resolved", resolvedSetupName);
  console.log(
    `@@@@@@ Middleware: Setting X-Setup-Name-Resolved header to: ${resolvedSetupName}`
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
