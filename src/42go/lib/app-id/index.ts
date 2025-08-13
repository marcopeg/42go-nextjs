import type { NextRequest } from "next/server";
import { apps, type TAppID } from "@/AppConfig";
import {
  matchByEnvironment,
  matchByHeaderPatterns,
  matchByUrl,
} from "./matchers";

export const APP_ID_HEADER = "X-42Go-AppID";

export const matchAppID = async (request: NextRequest): Promise<TAppID> => {
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
  const headerPatternMatch = matchByHeaderPatterns(request, apps);
  if (headerPatternMatch) return headerPatternMatch;
  const urlMatch = matchByUrl(request, apps);
  if (urlMatch) return urlMatch;
  return null;
};

export type {
  TAppConfigMatch,
  HeaderMatchConfig,
  HeaderMatchRule,
} from "./matchers";
