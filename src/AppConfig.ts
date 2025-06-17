import type { NextRequest } from "next/server";

export interface AppConfig {
  name: string;
  origin: string; // Added missing origin property
  logo?: string;
  featureFlags?: Record<string, boolean>;
}

/**
 * Header name for app identification
 */
export const APP_HEADER_NAME = "X-App-Name";

/**
 * Available applications with their configurations.
 */
export const availableApps = {
  app1: {
    name: "APP n1",
    origin: "http://app1.com",
  },
  app2: {
    name: "APP n2",
    origin: "http://app2.com",
  },
  default: {
    name: "DEFAULT APP",
    origin: "http://defaultapp.com",
  },
} satisfies Record<string, AppConfig>;

/**
 * Default application name.
 * This is used when no specific app is identified.
 */
export type AppName = keyof typeof availableApps;
export const DEFAULT_APP: AppName = "default";

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
  if (customSetupHeader && availableApps[customSetupHeader as AppName]) {
    return customSetupHeader as AppName;
  }

  // Identify by url
  const hostHeader = request.headers.get("host");
  if (hostHeader) {
    const appNameFromHost = hostHeader.split(".")[0] as AppName;
    if (availableApps[appNameFromHost]) {
      return appNameFromHost;
    }
  }

  // Fallback to default app
  return DEFAULT_APP;
};
