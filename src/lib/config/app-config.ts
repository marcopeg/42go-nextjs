import { headers as getHeaders } from "next/headers";
import { cache } from "react";

import {
  type AppConfig,
  type AppName,
  availableApps,
  DEFAULT_APP,
  APP_HEADER_NAME,
} from "@/AppConfig";

export type { AppConfig, AppName } from "@/AppConfig";

export const getAppName = cache(async (): Promise<AppName> => {
  const headerList = await getHeaders();
  const appNameHeader = headerList.get(APP_HEADER_NAME);

  if (!appNameHeader) {
    if (DEFAULT_APP === null) {
      console.warn(
        `X-App-Name header not found, and no DEFAULT_APP set. Returning null.`
      );
      return null;
    }
    console.warn(
      `X-App-Name header not found, using default setup: ${DEFAULT_APP}`
    );
    return DEFAULT_APP;
  }

  const appName = appNameHeader as keyof typeof availableApps;
  if (availableApps[appName]) {
    return appName as AppName;
  } else {
    if (DEFAULT_APP === null) {
      console.error(
        `No setup found for name: ${appName}, and no DEFAULT_APP set. Returning null.`
      );
      return null;
    }
    console.error(
      `No setup found for name: ${appName}, using default: ${DEFAULT_APP}`
    );
    return DEFAULT_APP;
  }
});

export const getAppConfig = cache(async (): Promise<AppConfig> => {
  const appName = await getAppName();
  if (!appName) return null;
  return availableApps[appName as keyof typeof availableApps] || null;
});

export const getAppInfo = cache(
  async (): Promise<{ name: AppName; config: AppConfig }> => {
    const name = await getAppName();
    const config = await getAppConfig();
    return { name, config };
  }
);

export const appRoute =
  (
    handler: (config: AppConfig, req: Request) => Promise<Response> | Response,
    requiredFlags?: string
  ) =>
  async (req: Request) => {
    // Hard stop on missing configuration:
    const config = await getAppConfig();
    if (!config) {
      return Response.json({ error: "app not found" }, { status: 404 });
    }

    // Free for all:
    const availableFlags = config.featureFlags.apis;
    if (availableFlags.includes("*")) {
      return handler(config, req);
    }

    // Retrieve the route's name from the handler's name:
    const flagsToCheck =
      requiredFlags === undefined ? handler.name : requiredFlags;

    // Check a specific feature flag for the route:
    // "*" means allowed by default
    if (flagsToCheck && flagsToCheck !== "*") {
      const flagBase = flagsToCheck.split(":")[0];
      const hasFeature =
        availableFlags.includes(flagsToCheck) ||
        availableFlags.includes(`${flagBase}:*`) ||
        availableFlags.includes("*");
      if (!hasFeature) {
        return Response.json(
          { error: "feature not available" },
          { status: 404 }
        );
      }
    }

    return handler(config, req);
  };
