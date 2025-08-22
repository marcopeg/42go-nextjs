import { headers as getHeaders } from "next/headers";
import { cache } from "react";

import { APP_ID_HEADER } from "@/42go/lib/app-id";
import { type TAppConfig, type TAppID, apps, DEFAULT_APP } from "@/AppConfig";
import { fromHeaders } from "@/42go/config/abstract-headers";
import {
  matchAppByHeaders,
  matchAppByUrl,
  matchByEnvironment,
} from "@/42go/lib/app-id/matchers";

export type { TAppConfig, TAppID } from "@/AppConfig";

/**
 * Resolves the app ID with fallback strategy.
 * First tries to get from middleware header, then tries matching logic.
 */
const resolveAppID = async (): Promise<TAppID> => {
  const headerList = await getHeaders();

  // Step 1: Try middleware header (backward compatibility)
  const appIDHeader = headerList.get(APP_ID_HEADER);
  if (appIDHeader && apps[appIDHeader as keyof typeof apps]) {
    return appIDHeader as TAppID;
  }

  // Step 2: Try environment matching
  const envMatch = matchByEnvironment(apps);
  if (envMatch) {
    return envMatch;
  }

  // Step 3: Try header matching
  const abstractHeaders = fromHeaders(headerList);
  const headerMatch = matchAppByHeaders(abstractHeaders, apps);
  if (headerMatch) {
    return headerMatch;
  }

  // Step 4: Try URL matching
  const urlMatch = matchAppByUrl(abstractHeaders, apps);
  if (urlMatch) {
    return urlMatch;
  }

  // Step 5: Fall back to default
  if (DEFAULT_APP === null) {
    console.warn(
      `No app could be resolved and no DEFAULT_APP set. Returning null.`
    );
    return null;
  }

  console.warn(`No app could be resolved, using default: ${DEFAULT_APP}`);
  return DEFAULT_APP;
};

export const getAppID = cache(async (): Promise<TAppID> => {
  return await resolveAppID();
});

/**
 * Resolves app ID for API routes using Headers directly.
 * This version doesn't use React cache and works with NextRequest headers.
 */
export const getAppIDFromHeaders = (headers: Headers): TAppID => {
  // Step 1: Try middleware header (backward compatibility)
  const appIDHeader = headers.get(APP_ID_HEADER);
  if (appIDHeader && apps[appIDHeader as keyof typeof apps]) {
    return appIDHeader as TAppID;
  }

  // Step 2: Try environment matching
  const envMatch = matchByEnvironment(apps);
  if (envMatch) {
    return envMatch;
  }

  // Step 3: Try header matching
  const abstractHeaders = fromHeaders(headers);
  const headerMatch = matchAppByHeaders(abstractHeaders, apps);
  if (headerMatch) {
    return headerMatch;
  }

  // Step 4: Try URL matching
  const urlMatch = matchAppByUrl(abstractHeaders, apps);
  if (urlMatch) {
    return urlMatch;
  }

  // Step 5: Fall back to default
  if (DEFAULT_APP === null) {
    console.warn(
      `No app could be resolved and no DEFAULT_APP set. Returning null.`
    );
    return null;
  }

  console.warn(`No app could be resolved, using default: ${DEFAULT_APP}`);
  return DEFAULT_APP;
};

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
