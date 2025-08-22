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
 * Unified app ID resolution that works for both server components and API routes.
 * @param request Optional Request object for API routes
 * @returns The resolved app ID or null if no match found
 */
const resolveAppID = async (request?: Request): Promise<TAppID> => {
  // Step 1: Headers resolution
  let headers: Headers;
  if (request) {
    // API route context - use Request headers
    headers = request.headers;
  } else {
    // Server component context - use next/headers
    headers = await getHeaders();
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
 * Main app ID resolution function that works for both server components and API routes.
 * @param request Optional Request for API route context
 * @returns The resolved app ID or null if no match found
 */
export const getAppID = cache(async (request?: Request): Promise<TAppID> => {
  return await resolveAppID(request);
});

/**
 * Legacy function for API routes using Headers directly.
 * @deprecated Use getAppID(request) instead for better integration
 */
export const getAppIDFromHeaders = (headers: Headers): TAppID => {
  // Step 2: Check for explicit header (set by middleware)
  const appIDHeader = headers.get(APP_ID_HEADER);
  if (appIDHeader && apps[appIDHeader as keyof typeof apps]) {
    return appIDHeader as TAppID;
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

  // Step 4 & 5: No fallback for security - return null
  return null;
};

/**
 * Secure helper for API routes - resolves app ID or returns 404 response.
 * @deprecated Use getAppID(request) with proper error handling instead
 */
export const getSecureAppID = (
  req: Request
): { appId: TAppID; error?: never } | { appId?: never; error: Response } => {
  const appId = getAppIDFromHeaders(req.headers);
  if (!appId) {
    return {
      error: Response.json(
        { error: "app_not_found", message: "Unable to determine app context" },
        { status: 404 }
      ),
    };
  }
  return { appId };
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
