import type { NextRequest } from "next/server";
import type { TAppID, TAppConfigItem } from "@/AppConfig";
import type { AbstractHeaders } from "@/42go/config/abstract-headers";

export interface HeaderMatchRule {
  key: string;
  value: string;
}

export interface HeaderMatchConfig {
  mode?: "any" | "all";
  keys: HeaderMatchRule[];
}

export interface TAppConfigMatch {
  url?: string | string[];
  header?: HeaderMatchConfig;
}

export const matchByEnvironment = (
  apps: Record<string, TAppConfigItem>
): TAppID | null => {
  const envAppId = process.env.APP_ID;
  if (!envAppId) return null;
  if (envAppId in apps) return envAppId as TAppID;
  throw new Error(
    `APP_ID="${envAppId}" not found. Available: ${Object.keys(apps).join(", ")}`
  );
};

const parsePattern = (
  pattern: string
): { type: "regex"; re: RegExp } | { type: "literal"; value: string } => {
  if (pattern.startsWith("/") && pattern.lastIndexOf("/") > 0) {
    const lastSlash = pattern.lastIndexOf("/");
    const body = pattern.slice(1, lastSlash);
    const flags = pattern.slice(lastSlash + 1);
    try {
      return { type: "regex", re: new RegExp(body, flags) };
    } catch {}
  }
  return { type: "literal", value: pattern };
};

const matchHeaderValue = (value: string, pattern: string) => {
  const p = parsePattern(pattern);
  return p.type === "regex" ? p.re.test(value) : value === p.value;
};

const matchHeaderRule = (
  headers: AbstractHeaders,
  rule: HeaderMatchRule
): boolean => {
  // Try to get the header value using the standardized get method
  const value = headers.get(rule.key);
  if (!value) return false;
  return matchHeaderValue(value, rule.value);
};

const matchHeaderConfig = (
  headers: AbstractHeaders,
  config: HeaderMatchConfig
): boolean => {
  const mode = config.mode || "any";
  const results = config.keys.map((r) => matchHeaderRule(headers, r));
  return mode === "all" ? results.every(Boolean) : results.some(Boolean);
};

export const matchByHeaderPatterns = (
  request: NextRequest,
  apps: Record<string, TAppConfigItem>
): TAppID | null => {
  // console.log("@headers", request.headers);
  for (const [key, cfg] of Object.entries(apps)) {
    const matchCfg = cfg.match;
    if (matchCfg?.header) {
      try {
        if (matchHeaderConfig(request.headers, matchCfg.header)) {
          return key as TAppID;
        }
      } catch (e) {
        console.error(`Header matching error for app ${key}:`, e);
      }
    }
  }
  return null;
};

/**
 * Matches apps by header patterns using AbstractHeaders interface.
 * This version works with both NextRequest headers and API route headers.
 */
export const matchAppByHeaders = (
  headers: AbstractHeaders,
  apps: Record<string, TAppConfigItem>
): TAppID | null => {
  for (const [key, cfg] of Object.entries(apps)) {
    const matchCfg = cfg.match;
    if (matchCfg?.header) {
      try {
        if (matchHeaderConfig(headers, matchCfg.header)) {
          return key as TAppID;
        }
      } catch (e) {
        console.error(`Header matching error for app ${key}:`, e);
      }
    }
  }
  return null;
};

export const matchByUrl = (
  request: NextRequest,
  apps: Record<string, TAppConfigItem>
): TAppID | null => {
  const host = request.headers.get("host");
  // console.log("@host", host);
  for (const [key, cfg] of Object.entries(apps)) {
    const p = cfg.match?.url;
    if (!p) continue;
    const patterns = Array.isArray(p) ? p : [p];
    for (const pattern of patterns) {
      try {
        if (host && new RegExp(pattern).test(host)) return key as TAppID;
      } catch {}
    }
  }
  return null;
};

/**
 * Matches apps by URL patterns using AbstractHeaders interface.
 * This version works with both NextRequest headers and API route headers.
 */
export const matchAppByUrl = (
  headers: AbstractHeaders,
  apps: Record<string, TAppConfigItem>
): TAppID | null => {
  const host = headers.get("host");
  for (const [key, cfg] of Object.entries(apps)) {
    const p = cfg.match?.url;
    if (!p) continue;
    const patterns = Array.isArray(p) ? p : [p];
    for (const pattern of patterns) {
      try {
        if (host && new RegExp(pattern).test(host)) return key as TAppID;
      } catch {}
    }
  }
  return null;
};
