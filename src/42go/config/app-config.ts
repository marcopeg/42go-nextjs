import { headers as getHeaders } from "next/headers";

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
 * Uses Next.js headers() which works in both contexts in Next.js 15+
 * @returns The resolved app ID or null if no match found
 */
export const getAppID = async (): Promise<TAppID> => {
  // Step 1: Headers resolution using Next.js headers()
  let headers: Headers;
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

  // Step 2: Check for explicit header (set by middleware)
  const appIDHeader = headers.get(APP_ID_HEADER);
  if (appIDHeader) {
    // Check if the resolved appID is valid
    if (apps[appIDHeader as keyof typeof apps]) {
      return appIDHeader as TAppID;
    }
    console.warn(`Invalid app ID from header: ${appIDHeader}`);
  }

  // Step 3: Run the matchers
  const abstractHeaders = fromHeaders(headers);

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

export const getAppConfig = async (appID?: TAppID): Promise<TAppConfig> => {
  const resolvedAppID = appID || (await getAppID());
  if (!resolvedAppID) return null;
  return apps[resolvedAppID as keyof typeof apps] || null;
};

export const getAppInfo = async (): Promise<{
  id: TAppID;
  config: TAppConfig;
}> => {
  const id = await getAppID();
  const config = await getAppConfig(id);
  return { id, config };
};
