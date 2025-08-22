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
 * Main app ID resolution function that works for both server components and API routes.
 * @param request Optional Request for API route context
 * @returns The resolved app ID or null if no match found
 */
export const getAppID = async (request?: Request): Promise<TAppID> => {
  // Step 1: Headers resolution
  let headers: Headers;
  if (request) {
    // API route context - use Request headers
    headers = request.headers;
  } else {
    // Server component context - use next/headers
    try {
      headers = await getHeaders();
    } catch {
      // In Docker or build context, next/headers might not be available
      console.warn(
        "Cannot access next/headers, falling back to environment matching only"
      );

      // Try environment matching only
      const envMatch = matchByEnvironment(apps);
      if (envMatch) {
        return envMatch;
      }

      // Use default app if available
      if (DEFAULT_APP && apps[DEFAULT_APP as keyof typeof apps]) {
        return DEFAULT_APP;
      }

      return null;
    }
  }

  // Step 2: Check for explicit header (set by middleware)
  const appIDHeader = headers.get(APP_ID_HEADER);
  if (appIDHeader) {
    // Step 5: Check if the resolved appID is valid
    if (apps[appIDHeader as keyof typeof apps]) {
      return appIDHeader as TAppID;
    }
    console.warn(`Invalid app ID from header: ${appIDHeader}`);
  }

  // Step 3: Run the matchers
  const abstractHeaders = request
    ? fromHeaders(request.headers)
    : fromHeaders(headers);

  // Try environment matching
  const envMatch = matchByEnvironment(apps);
  if (envMatch) {
    return envMatch;
  }

  // Try header pattern matching
  const headerMatch = matchAppByHeaders(abstractHeaders, apps);
  if (headerMatch) {
    return headerMatch;
  }

  // Try URL pattern matching
  const urlMatch = matchAppByUrl(abstractHeaders, apps);
  if (urlMatch) {
    return urlMatch;
  }

  // Step 4: Fallback
  if (DEFAULT_APP === null) {
    console.warn(
      `No app could be resolved and no DEFAULT_APP set. Returning null.`
    );
    return null;
  }

  // Step 5: Check if default app is valid
  if (apps[DEFAULT_APP as keyof typeof apps]) {
    console.warn(`No app could be resolved, using default: ${DEFAULT_APP}`);
    return DEFAULT_APP;
  }

  console.error(`Default app ${DEFAULT_APP} is not defined in apps config`);
  return null;
};

/**
 * Cached version for server components (no request parameter)
 */
export const getAppIDCached = cache(async (): Promise<TAppID> => {
  return await getAppID();
});

export const getAppConfig = cache(async (): Promise<TAppConfig> => {
  const appID = await getAppIDCached();
  if (!appID) return null;
  return apps[appID as keyof typeof apps] || null;
});

export const getAppInfo = cache(
  async (): Promise<{ id: TAppID; config: TAppConfig }> => {
    const id = await getAppIDCached();
    const config = await getAppConfig();
    return { id, config };
  }
);
