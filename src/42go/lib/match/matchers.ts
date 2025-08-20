import type { NextRequest } from "next/server";
import type { TAppID, TAppConfigItem } from "@/AppConfig";

export interface HeaderMatchRule {
  // Strings only. To use regex, provide "/pattern/flags" format.
  key: string;
  value: string;
}

export interface HeaderMatchConfig {
  mode?: "any" | "all"; // For multiple rules
  keys: HeaderMatchRule[];
}

export interface TAppConfigMatch {
  url?: string | string[]; // Regexp string(s) to match host
  header?: HeaderMatchConfig; // Header-based matching (patterns only)
}

/**
 * Environment variable override matcher
 * Highest priority - skips all other matching when APP_ID is set
 */
export const matchByEnvironment = (
  apps: Record<string, TAppConfigItem>
): TAppID | null => {
  const envAppId = process.env.APP_ID;
  if (!envAppId) return null;

  if (envAppId in apps) {
    return envAppId as TAppID;
  }

  throw new Error(
    `APP_ID="${envAppId}" not found in available apps. Available: ${Object.keys(
      apps
    ).join(", ")}`
  );
};

// Removed: direct header-based matching (X-App-Name) in favor of header pattern and URL matching

/**
 * Header pattern matching utilities
 */
// String pattern helpers: support literal strings or "/regex/flags" syntax
const parsePattern = (
  pattern: string
): { type: "regex"; re: RegExp } | { type: "literal"; value: string } => {
  // Regex form: /pattern/flags
  if (pattern.startsWith("/") && pattern.lastIndexOf("/") > 0) {
    const lastSlash = pattern.lastIndexOf("/");
    const body = pattern.slice(1, lastSlash);
    const flags = pattern.slice(lastSlash + 1);
    try {
      return { type: "regex", re: new RegExp(body, flags) };
    } catch {
      // Fall through to literal if invalid
    }
  }
  return { type: "literal", value: pattern };
};

const matchHeaderKey = (headerName: string, pattern: string): boolean => {
  const parsed = parsePattern(pattern);
  if (parsed.type === "regex") return parsed.re.test(headerName);
  return headerName.toLowerCase() === parsed.value.toLowerCase();
};

const matchHeaderValue = (headerValue: string, pattern: string): boolean => {
  const parsed = parsePattern(pattern);
  if (parsed.type === "regex") return parsed.re.test(headerValue);
  return headerValue === parsed.value;
};

const matchHeaderRule = (headers: Headers, rule: HeaderMatchRule): boolean => {
  // Find matching header by key pattern
  const matchingHeaders: string[] = [];
  headers.forEach((value, name) => {
    if (matchHeaderKey(name, rule.key)) {
      matchingHeaders.push(value);
    }
  });

  if (matchingHeaders.length === 0) return false;

  // Test header values against single pattern
  for (const headerValue of matchingHeaders) {
    if (matchHeaderValue(headerValue, rule.value)) return true;
  }

  return false;
};

const matchHeaderConfig = (
  headers: Headers,
  config: HeaderMatchConfig
): boolean => {
  const mode = config.mode || "any";
  const results = config.keys.map((rule) => matchHeaderRule(headers, rule));

  return mode === "all" ? results.every(Boolean) : results.some(Boolean);
};

/**
 * Header pattern matching (from task [aci])
 */
export const matchByHeaderPatterns = (
  request: NextRequest,
  apps: Record<string, TAppConfigItem>
): TAppID | null => {
  for (const [appKey, appConfig] of Object.entries(apps)) {
    const matchConfig = appConfig.match;
    if (matchConfig && "header" in matchConfig && matchConfig.header) {
      try {
        if (matchHeaderConfig(request.headers, matchConfig.header)) {
          // console.log(`Header match found for app: ${appKey}`);
          return appKey as TAppID;
        }
      } catch (error) {
        console.error(`Header matching error for app ${appKey}:`, error);
      }
    }
  }
  return null;
};

/**
 * URL pattern matching
 */
export const matchByUrl = (
  request: NextRequest,
  apps: Record<string, TAppConfigItem>
): TAppID | null => {
  const hostHeader = request.headers.get("host");
  for (const [appKey, appConfig] of Object.entries(apps)) {
    if (appConfig.match?.url) {
      const urlPatterns = Array.isArray(appConfig.match.url)
        ? appConfig.match.url
        : [appConfig.match.url];
      for (const pattern of urlPatterns) {
        try {
          const regex = new RegExp(pattern);
          if (hostHeader && regex.test(hostHeader)) {
            return appKey as TAppID;
          }
        } catch {
          // Chuck Norris doesn't catch regex errors, but we do
        }
      }
    }
  }
  return null;
};

// Removed: function-based matching. Custom resolvers are not supported in this version.
