import type { NextRequest } from "next/server";
import type { Metadata } from "next";
import type { ComponentType, ReactNode } from "react";

import { App1PublicLayout } from "@/components/App1PublicLayout";

export type ThemeValue = "light" | "dark" | "system";

export interface AppConfigItem {
  name: string;
  logo?: string;
  meta?: Partial<Metadata>;
  theme?: {
    default?: ThemeValue;
    PublicLayout?: ComponentType<{ children: ReactNode }>;
  };
  featureFlags: {
    pages: string[]; // List of pages available in this app
    apis: string[]; // List of API endpoints available in this app
  };
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
    featureFlags: {
      pages: ["*"],
      apis: ["*"],
    },
    name: "DEFAULT APP",
    theme: {
      default: "system",
    },
    meta: {
      title: "Default App - Chuck Norris Edition",
      description:
        "The default application that's tougher than a two-dollar steak",
      keywords: ["nextjs", "default", "chuck-norris", "legendary"],
      authors: [{ name: "Chuck Norris" }],
    },
  },
  app1: {
    featureFlags: {
      pages: ["TodosPage"],
      apis: ["getTodos"],
    },
    name: "APP n1",
    theme: {
      default: "dark",
      PublicLayout: App1PublicLayout,
    },
    meta: {
      title: "App1 - Todo Master",
      description:
        "The ultimate todo application that gets things done faster than Chuck Norris kicks",
      keywords: ["todos", "productivity", "app1", "tasks"],
      authors: [{ name: "Chuck Norris", url: "https://chucknorris.com" }],
    },
  },
  app2: {
    featureFlags: {
      pages: [],
      apis: ["todos:write"],
    },
    name: "APP n2",
    theme: {
      default: "light",
    },
    meta: {
      title: "App2 - Write Operations",
      description:
        "Specialized app for write operations, as powerful as Chuck Norris's beard",
      keywords: ["write", "operations", "app2", "api"],
      authors: [{ name: "Chuck Norris Team" }],
    },
  },
} satisfies Record<string, AppConfigItem>;

/**
 * Dynamically determines the app name based on request headers or URL.
 * (used in middleware and other parts of the application)
 *
 * @param request NextRequest object from Next.js
 * @returns
 */
export const matchAppName = async (request: NextRequest): Promise<AppName> => {
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
  // localhost:3000 or localhost:4001 - only allow default for plain localhost
  if (hostHeader?.split(":")[0] === "localhost") {
    return "default" as AppName;
  }

  // Unknown host - return null to trigger 404
  return null;
};
