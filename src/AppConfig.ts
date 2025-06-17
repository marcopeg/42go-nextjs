import type { NextRequest } from "next/server";

export interface AppConfigItem {
  name: string;
  logo?: string;
  features?: string[]; // List of enabled features for this app
}

export type AppConfig = AppConfigItem | null;
export type AppName = keyof typeof availableApps | null;

/**
 * Header name for app identification
 * (this might become an ENV variable in the future)
 */
export const APP_HEADER_NAME = "X-App-Name";

/**
 * Default application name.
 * This is used when no specific app is identified.
 *
 * If set to null and no app is identified,
 * the application will return a 404.
 */
export const DEFAULT_APP: AppName = null;

/**
 * Available applications with their configurations.
 */
export const availableApps = {
  default: {
    features: ["todos:*"],
    name: "DEFAULT APP",
  },
  app1: {
    features: ["todos:read"],
    name: "APP n1",
  },
  app2: {
    features: ["adminPanel", "todos:write"],
    name: "APP n2",
  },
} satisfies Record<string, AppConfigItem>;

/**
 * Dynamically determines the app name based on request headers or URL.
 * (used in middleware and other parts of the application)
 *
 * @param request NextRequest object from Next.js
 * @returns
 */
export const getAppName = async (request: NextRequest): Promise<AppName> => {
  // Identify by header
  const customSetupHeader = request.headers.get(APP_HEADER_NAME);
  if (
    customSetupHeader &&
    customSetupHeader !== "null" &&
    availableApps[customSetupHeader as keyof typeof availableApps]
  ) {
    return customSetupHeader as AppName;
  }

  // EXAMPLE:
  // app1.localhost or app2.localhost
  const hostHeader = request.headers.get("host");
  if (hostHeader) {
    const appNameFromHost = hostHeader.split(".")[0];
    if (
      appNameFromHost &&
      appNameFromHost !== "null" &&
      availableApps[appNameFromHost as keyof typeof availableApps]
    ) {
      return appNameFromHost as AppName;
    }
  }

  // EXAMPLE:
  // localhost:3000 or localhost:4001
  if (hostHeader?.split(":")[0] === "localhost") {
    return "default" as AppName; // Fallback for localhost
  }

  // Fallback to default app if defined, else null
  return DEFAULT_APP;
};
