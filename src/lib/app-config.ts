import { headers as getHeaders } from "next/headers";
import { cache } from "react";
import {
  type AppConfig,
  type AppName,
  availableApps,
  DEFAULT_APP,
  APP_HEADER_NAME,
} from "../AppConfig";

export const getAppName = cache(async (): Promise<AppName | null> => {
  console.log("@@@@@ Executing getAppName() @@@@@");
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
  const appName = appNameHeader as AppName;
  if (availableApps[appName]) {
    return appName;
  } else {
    if (DEFAULT_APP === null) {
      console.warn(
        `No setup found for name: ${appName}, and no DEFAULT_APP set. Returning null.`
      );
      return null;
    }
    console.warn(
      `No setup found for name: ${appName}, using default: ${DEFAULT_APP}`
    );
    return DEFAULT_APP;
  }
});

export const getAppConfig = cache(async (): Promise<AppConfig | null> => {
  console.log("@@@@@ Executing getAppConfig() @@@@@");
  const appName = await getAppName();
  if (!appName) return null;
  return availableApps[appName] || null;
});
