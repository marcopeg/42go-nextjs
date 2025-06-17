import { headers as getHeaders } from "next/headers";
import { cache } from "react";
import { type AppConfig, type AppName } from "../AppConfig.type"; // Removed .ts, updated type
import { setups, DEFAULT_APP_NAME } from "../AppConfig"; // Removed .ts, added DEFAULT_APP_NAME

export const getRequestConfig = cache(async (): Promise<AppConfig | null> => {
  console.log("Executing getRequestConfig (app name based)"); // Updated log
  const headerList = await getHeaders();
  const appNameHeader = headerList.get("X-App-Name"); // Changed header name

  if (!appNameHeader) {
    console.warn(
      `X-App-Name header not found, using default setup: ${DEFAULT_APP_NAME}` // Updated log
    );
    return setups[DEFAULT_APP_NAME] || null;
  }

  const appName = appNameHeader as AppName;

  if (setups[appName]) {
    return setups[appName];
  } else {
    console.warn(
      `No setup found for name: ${appName}, using default: ${DEFAULT_APP_NAME}`
    );
    return setups[DEFAULT_APP_NAME] || null;
  }
});
