import { headers as getHeaders } from "next/headers";

import { APP_ID_HEADER } from "@/42go/lib/app-id";
import { type TAppConfig, type TAppID, apps, DEFAULT_APP } from "@/AppConfig";
import {
  fromHeaders,
  type AbstractHeaders,
} from "@/42go/config/abstract-headers";
import {
  matchAppByHeaders,
  matchAppByUrl,
  matchByEnvironment,
} from "@/42go/lib/app-id/matchers";

export type { TAppConfig, TAppID } from "@/AppConfig";

const isBuildContext = () =>
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.NEXT_PRIVATE_BUILD_WORKER === "1";

const isReservedAppIDHeader = (name: string) =>
  name.toLowerCase() === APP_ID_HEADER.toLowerCase();

const withoutReservedAppIDHeader = (
  headers: AbstractHeaders
): AbstractHeaders => ({
  get: (name) => (isReservedAppIDHeader(name) ? null : headers.get(name)),
  has: (name) => (isReservedAppIDHeader(name) ? false : headers.has(name)),
  host: headers.host,
  url: headers.url,
  forEach: headers.forEach
    ? (callback) => {
        headers.forEach?.((value, key) => {
          if (!isReservedAppIDHeader(key)) callback(value, key);
        });
      }
    : undefined,
});

const getFallbackAppID = (): TAppID => {
  if (DEFAULT_APP === null) {
    console.warn(
      `No app could be resolved and no DEFAULT_APP set. Returning null.`
    );
    return null;
  }

  if (apps[DEFAULT_APP as keyof typeof apps]) {
    console.warn(`No app could be resolved, using default: ${DEFAULT_APP}`);
    return DEFAULT_APP;
  }

  console.error(`Default app ${DEFAULT_APP} is not defined in apps config`);
  return null;
};

export const resolveAppIDFromAbstractHeaders = (
  headers: AbstractHeaders
): TAppID => {
  const safeHeaders = withoutReservedAppIDHeader(headers);

  const envMatch = matchByEnvironment(apps);
  if (envMatch) return envMatch;

  const headerMatch = matchAppByHeaders(safeHeaders, apps);
  if (headerMatch) return headerMatch;

  const urlMatch = matchAppByUrl(safeHeaders, apps);
  if (urlMatch) return urlMatch;

  return getFallbackAppID();
};

export const resolveAppIDFromHeaders = (headers: Headers): TAppID =>
  resolveAppIDFromAbstractHeaders(fromHeaders(headers));

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
    if (!isBuildContext()) {
      console.warn(
        "Cannot access next/headers, falling back to environment matching only"
      );
    }

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

  return resolveAppIDFromHeaders(headers);
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
