import { headers as getHeaders } from "next/headers";
import { cache } from "react";
import { type AppConfig, type AppName } from "../AppConfig.type";
import { availableApps, DEFAULT_APP } from "../AppConfig"; // Renamed imports

export const getRequestConfig = cache(async (): Promise<AppConfig | null> => {
  console.log("Executing getRequestConfig (app name based)");
  const headerList = await getHeaders();
  const appNameHeader = headerList.get("X-App-Name");

  if (!appNameHeader) {
    console.warn(
      `X-App-Name header not found, using default setup: ${DEFAULT_APP}` // Use new name
    );
    return availableApps[DEFAULT_APP] || null; // Use new names
  }

  const appName = appNameHeader as AppName;

  if (availableApps[appName]) {
    return availableApps[appName]; // Use new names
  } else {
    console.warn(
      `No setup found for name: ${appName}, using default: ${DEFAULT_APP}` // Use new name
    );
    return availableApps[DEFAULT_APP] || null; // Use new names
  }
});
