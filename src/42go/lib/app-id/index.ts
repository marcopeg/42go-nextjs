import type { NextRequest } from "next/server";
import { apps, type TAppID } from "@/AppConfig";
import {
  matchByEnvironment,
  matchByHeaderPatterns,
  matchByUrl,
} from "./matchers";

export const APP_ID_HEADER = "X-42Go-AppID";

export const matchAppID = async (request: NextRequest): Promise<TAppID> => {
  // console.log("@matchByEnv");
  const envMatch = matchByEnvironment(apps);
  if (envMatch) return envMatch;

  // console.log("@matchByHeader");
  const headerPatternMatch = matchByHeaderPatterns(request, apps);
  if (headerPatternMatch) return headerPatternMatch;

  // console.log("@matchByUrl");
  const urlMatch = matchByUrl(request, apps);
  if (urlMatch) return urlMatch;
  return null;
};

export type {
  TAppConfigMatch,
  HeaderMatchConfig,
  HeaderMatchRule,
} from "./matchers";
