import type { NextRequest } from "next/server";
import type { AppName, AppConfigItem } from "@/AppConfig";

export interface HeaderMatchRule {
  key: string | RegExp;
  value: string | RegExp | Array<string | RegExp>;
  mode?: "any" | "all"; // For array values
}

export interface HeaderMatchConfig {
  mode?: "any" | "all"; // For multiple rules
  keys: HeaderMatchRule[];
}

export interface TAppConfigMatch {
  url?: string | string[]; // Regexp string(s) to match host
  header?: HeaderMatchConfig; // Header-based matching
  fn?: (request: NextRequest) => Promise<boolean> | boolean; // Custom function matching (future from task [adn])
}

/**
 * Environment variable override matcher
 * Highest priority - skips all other matching when APP_NAME is set
 */
export const matchByEnvironment = (
  apps: Record<string, AppConfigItem>
): AppName | null => {
  const envAppName = process.env.APP_NAME;
  if (!envAppName) return null;

  if (envAppName in apps) {
    return envAppName as AppName;
  }

  throw new Error(
    `APP_NAME="${envAppName}" not found in available apps. Available: ${Object.keys(
      apps
    ).join(", ")}`
  );
};

/**
 * Header-based matching (X-App-Name)
 */
export const matchByHeader = (
  request: NextRequest,
  headerName: string,
  apps: Record<string, AppConfigItem>
): AppName | null => {
  const customSetupHeader = request.headers.get(headerName);
  if (
    customSetupHeader &&
    customSetupHeader !== "null" &&
    customSetupHeader in apps
  ) {
    return customSetupHeader as AppName;
  }
  return null;
};

/**
 * Header pattern matching utilities
 */
const isRegExp = (value: unknown): value is RegExp => value instanceof RegExp;

const matchHeaderKey = (
  headerName: string,
  pattern: string | RegExp
): boolean => {
  if (isRegExp(pattern)) {
    return pattern.test(headerName);
  }
  return headerName.toLowerCase() === pattern.toLowerCase();
};

const matchHeaderValue = (
  headerValue: string,
  pattern: string | RegExp
): boolean => {
  if (isRegExp(pattern)) {
    return pattern.test(headerValue);
  }
  return headerValue === pattern;
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

  // Test values against pattern(s)
  const patterns = Array.isArray(rule.value) ? rule.value : [rule.value];
  const mode = rule.mode || "any";

  for (const headerValue of matchingHeaders) {
    const results = patterns.map((pattern) =>
      matchHeaderValue(headerValue, pattern)
    );

    if (mode === "all" && results.every(Boolean)) return true;
    if (mode === "any" && results.some(Boolean)) return true;
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
  apps: Record<string, AppConfigItem>
): AppName | null => {
  for (const [appKey, appConfig] of Object.entries(apps)) {
    const matchConfig = appConfig.match;
    if (matchConfig && "header" in matchConfig && matchConfig.header) {
      try {
        if (matchHeaderConfig(request.headers, matchConfig.header)) {
          console.log(`Header match found for app: ${appKey}`);
          return appKey as AppName;
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
  apps: Record<string, AppConfigItem>
): AppName | null => {
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
            return appKey as AppName;
          }
        } catch {
          // Chuck Norris doesn't catch regex errors, but we do
        }
      }
    }
  }
  return null;
};

/**
 * Function-based matching (future from task [adn])
 */
export const matchByFunction = async (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _request: NextRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _apps: Record<string, AppConfigItem>
): Promise<AppName | null> => {
  // Implementation will come from task [adn]
  return null;
};
