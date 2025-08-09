import type { NextRequest } from "next/server";
import { apps, type AppName } from "@/AppConfig";
import {
  matchByEnvironment,
  matchByHeaderPatterns,
  matchByUrl,
} from "./matchers";

/**
 * Dynamically determines the app name based on request headers or URL.
 * (used in middleware and other parts of the application)
 *
 * @param request NextRequest object from Next.js
 * @returns AppName or null if no match found
 */
export const matchAppName = async (request: NextRequest): Promise<AppName> => {
  // 1. Highest priority: APP_ID environment variable
  try {
    const envMatch = matchByEnvironment(apps);
    if (envMatch) {
      console.log(`APP_ID override: using ${envMatch}`);
      return envMatch;
    }
  } catch (error) {
    // In Edge Runtime, we can't exit the process, so we log and continue
    console.error("APP_ID validation failed:", (error as Error).message);
    // Fall through to other matching strategies
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
export { APP_HEADER_NAME } from "./constants";
