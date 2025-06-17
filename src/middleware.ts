import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { type AppName } from "./AppConfig.type";
import { DEFAULT_APP_NAME, setups } from "./AppConfig"; // Corrected import path, added setups

// New function to determine the setup name
const getAppName = (request: NextRequest): AppName => {
  const customSetupHeader = request.headers.get("x-app-name");
  if (customSetupHeader && setups[customSetupHeader as AppName]) {
    console.log(
      `@@@@@@ getAppName: Using setup name from x-app-name header: ${customSetupHeader}`
    );
    return customSetupHeader as AppName;
  }

  const hostHeader = request.headers.get("host");
  if (hostHeader) {
    const appNameFromHost = hostHeader.split(".")[0] as AppName;
    if (setups[appNameFromHost]) {
      console.log(
        `@@@@@@ getAppName: Using setup name derived from host header: ${hostHeader}`
      );
      return appNameFromHost;
    }
  }

  console.log(
    `@@@@@@ getAppName: No specific setup found, using default: ${DEFAULT_APP_NAME}`
  );
  return DEFAULT_APP_NAME;
};

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
