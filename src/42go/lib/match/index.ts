import type { NextRequest } from "next/server";
import { apps, APP_HEADER_NAME, type AppName } from "@/AppConfig";
import {
  matchByEnvironment,
  matchByHeader,
  matchByFunction,
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
  // 1. Highest priority: APP_NAME environment variable
  try {
    const envMatch = matchByEnvironment(apps);
    if (envMatch) {
      console.log(`APP_NAME override: using ${envMatch}`);
      return envMatch;
    }
  } catch (error) {
    // In Edge Runtime, we can't exit the process, so we log and continue
    console.error("APP_NAME validation failed:", (error as Error).message);
    // Fall through to other matching strategies
  }

  // 2. Custom header (X-App-Name)
  const headerMatch = matchByHeader(request, APP_HEADER_NAME, apps);
  if (headerMatch) return headerMatch;

  // 3. Custom function matching (from task [adn])
  const functionMatch = await matchByFunction(request, apps);
  if (functionMatch) return functionMatch;

  // 4. Header pattern matching (existing logic)
  const headerPatternMatch = matchByHeaderPatterns(request, apps);
  if (headerPatternMatch) return headerPatternMatch;

  // 5. URL pattern matching
  const urlMatch = matchByUrl(request, apps);
  if (urlMatch) return urlMatch;

  // Unknown host - return null to trigger 404
  return null;
};

// Re-export for convenience
export { APP_HEADER_NAME } from "@/AppConfig";
export type {
  TAppConfigMatch,
  HeaderMatchConfig,
  HeaderMatchRule,
} from "./matchers";
