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

const matchHeaderKey = (name: string, pattern: string) => {
  const p = parsePattern(pattern);
  return p.type === "regex"
    ? p.re.test(name)
    : name.toLowerCase() === p.value.toLowerCase();
};

const matchHeaderValue = (value: string, pattern: string) => {
  const p = parsePattern(pattern);
  return p.type === "regex" ? p.re.test(value) : value === p.value;
};

const matchHeaderRule = (
  headers: AbstractHeaders,
  rule: HeaderMatchRule
): boolean => {
  const values: string[] = [];

  // For regex patterns in header keys, we need to iterate through all headers
  if ("forEach" in headers && typeof headers.forEach === "function") {
    // NextRequest.headers case
    (headers as Headers).forEach((v: string, n: string) => {
      if (matchHeaderKey(n, rule.key)) values.push(v);
    });
  } else {
    // API route headers case - need to iterate manually
    const headerEntries = Object.entries(
      headers as unknown as Record<string, string | string[] | undefined>
    );
    for (const [name, value] of headerEntries) {
      if (matchHeaderKey(name, rule.key)) {
        if (Array.isArray(value)) {
          values.push(...value);
        } else if (value) {
          values.push(value);
        }
      }
    }
  }

  if (!values.length) return false;
  return values.some((v) => matchHeaderValue(v, rule.value));
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
