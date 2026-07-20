import "server-only";

import type { Knex } from "knex";

import { getAppID } from "@/42go/config/app-config";
import { getDB } from "@/42go/db";
import { quicklistApiError } from "@/lib/quicklists/server/api-response";
import {
  authenticateQuicklistApiToken,
  type QuicklistApiPrincipal,
} from "@/lib/quicklists/server/api-token-store";

export type QuicklistApiContext = {
  db: Knex;
  principal: QuicklistApiPrincipal;
};

export const loadQuicklistApiContext = async (
  req: Request
): Promise<QuicklistApiContext | Response> => {
  const appId = await getAppID();
  if (!appId) {
    return quicklistApiError(404, "app_not_found", "Not Found");
  }

  const db = getDB();
  const principal = await authenticateQuicklistApiToken(
    db,
    appId,
    req.headers.get("authorization")
  );
  if (!principal) {
    return quicklistApiError(401, "unauthorized", "Invalid bearer token.");
  }

  return { db, principal };
};

export const isQuicklistApiContext = (
  value: QuicklistApiContext | Response
): value is QuicklistApiContext => !(value instanceof Response);
