import type { NextRequest } from "next/server";
import { apps, type TAppID } from "@/AppConfig";
import {
  matchByEnvironment,
  matchByHeaderPatterns,
  matchByUrl,
} from "./matchers";

// Internal header name used to carry the resolved app id across the request lifecycle
// Kept local (not documented as public config) to allow future refactors without churn.
export const APP_ID_HEADER = "X-42Go-AppID";

/**
 * Dynamically determines the AppID based on request headers or URL.
 * (used in middleware and other parts of the application)
 *
 * @param request NextRequest object from Next.js
 * @returns AppID or null if no match found
 */
export const matchAppID = async (request: NextRequest): Promise<TAppID> => {
  // 1. Highest priority: APP_ID environment variable
  try {
    const envMatch = matchByEnvironment(apps);
    if (envMatch) {
      console.log(`APP_ID override: using ${envMatch}`);
      return envMatch;
    }
  } catch (error) {
    console.error("APP_ID validation failed:", (error as Error).message);
    return null;
  }

  // 2. Header pattern matching (existing logic)
  const headerPatternMatch = matchByHeaderPatterns(request, apps);
  if (headerPatternMatch) return headerPatternMatch;

  // 3. URL pattern matching
  const urlMatch = matchByUrl(request, apps);
  if (urlMatch) return urlMatch;

  // Unknown host - return null to trigger 404
  return null;
};

export type {
  TAppConfigMatch,
  HeaderMatchConfig,
  HeaderMatchRule,
} from "./matchers";
