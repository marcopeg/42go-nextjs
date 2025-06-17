import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { type SetupName, DEFAULT_SETUP_NAME } from "./AppConfig.type";

// New function to determine the setup name
const getAppName = (request: NextRequest): SetupName => {
  const customSetupHeader = request.headers.get("x-app-name"); // Changed header name
  if (["app1", "app2", "default"].includes(customSetupHeader || "")) {
    console.log(
      `@@@@@@ getAppName: Using setup name from x-app-name header: ${customSetupHeader}` // Updated log
    );
    return customSetupHeader as SetupName;
  }

  const hostHeader = request.headers.get("host");
  if (["app1.", "app2."].some((prefix) => hostHeader?.startsWith(prefix))) {
    console.log(
      `@@@@@@ getAppName: Using setup name derived from host header: ${hostHeader}` // Updated log
    );
    return hostHeader?.substring(0, hostHeader.indexOf(".")) as SetupName;
  }

  console.log(
    `@@@@@@ getAppName: No specific setup found, using default: ${DEFAULT_SETUP_NAME}`
  );
  return DEFAULT_SETUP_NAME;
};

export async function middleware(request: NextRequest) {
  const resolvedSetupName = getAppName(request);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("X-App-Name", resolvedSetupName); // Changed header name
  console.log(
    `@@@@@@ Middleware: Setting X-App-Name header to: ${resolvedSetupName}` // Updated log
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
