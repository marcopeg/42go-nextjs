import "server-only";

import type { Knex } from "knex";

import { getAppID } from "@/42go/config/app-config";
import { getDB } from "@/42go/db";
import { quickShareApiError } from "@/lib/quickshare/server/api-response";
import {
  authenticateQuickShareApiToken,
  type QuickShareApiPrincipal,
} from "@/lib/quickshare/server/api-token-store";

export type QuickShareApiContext = {
  db: Knex;
  principal: QuickShareApiPrincipal;
};

/** The bearer boundary for ZA41. It never considers NextAuth cookies. */
export const loadQuickShareApiContext = async (
  request: Request
): Promise<QuickShareApiContext | Response> => {
  const appId = await getAppID();
  if (!appId) return quickShareApiError(404, "app_not_found", "Not Found");

  const db = getDB();
  const principal = await authenticateQuickShareApiToken(
    db,
    appId,
    request.headers.get("authorization")
  );
  if (!principal) {
    return quickShareApiError(401, "unauthorized", "Invalid bearer token.");
  }

  return { db, principal };
};

export const isQuickShareApiContext = (
  value: QuickShareApiContext | Response
): value is QuickShareApiContext => !(value instanceof Response);
