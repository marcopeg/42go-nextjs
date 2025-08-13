import { headers as getHeaders } from "next/headers";
import { cache } from "react";

import { APP_ID_HEADER } from "@/42go/lib/app-id";
import { type TAppConfig, type TAppID, apps, DEFAULT_APP } from "@/AppConfig";

export type { TAppConfig, TAppID } from "@/AppConfig";

export const getAppID = cache(async (): Promise<TAppID> => {
  const headerList = await getHeaders();
  const appIDHeader = headerList.get(APP_ID_HEADER);

  if (!appIDHeader) {
    if (DEFAULT_APP === null) {
      console.warn(
        `X-App-ID header not found, and no DEFAULT_APP set. Returning null.`
      );
      return null;
    }
    console.warn(
      `X-App-ID header not found, using default setup: ${DEFAULT_APP}`
    );
    return DEFAULT_APP;
  }

  const appID = appIDHeader as keyof typeof apps;
  if (apps[appID]) {
    return appID as TAppID;
  } else {
    if (DEFAULT_APP === null) {
      console.error(
        `No setup found for name: ${String(
          appID
        )}, and no DEFAULT_APP set. Returning null.`
      );
      return null;
    }
    console.error(
      `No setup found for name: ${String(appID)}, using default: ${DEFAULT_APP}`
    );
    return DEFAULT_APP;
  }
});

export const getAppConfig = cache(async (): Promise<TAppConfig> => {
  const appID = await getAppID();
  if (!appID) return null;
  return apps[appID as keyof typeof apps] || null;
});

export const getAppInfo = cache(
  async (): Promise<{ id: TAppID; config: TAppConfig }> => {
    const id = await getAppID();
    const config = await getAppConfig();
    return { id, config };
  }
);
