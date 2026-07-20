import { getServerSession } from "next-auth";

import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { getAppID } from "@/42go/config/app-config";
import { getDB } from "@/42go/db";
import { protectRoute } from "@/42go/policy";
import { quicklistApiError, quicklistApiJson } from "@/lib/quicklists/server/api-response";
import {
  createOrRotateQuicklistApiToken,
  deleteQuicklistApiToken,
  getQuicklistApiTokenStatus,
  type QuicklistApiPrincipal,
} from "@/lib/quicklists/server/api-token-store";

const getPrincipal = async (): Promise<QuicklistApiPrincipal | null> => {
  const [session, appId] = await Promise.all([
    getServerSession(await getAuthOptions()),
    getAppID(),
  ]);
  const userId = session?.user?.id as string | undefined;

  return userId && appId ? { userId, appId } : null;
};

const getStatus = async () => {
  const principal = await getPrincipal();
  if (!principal) return quicklistApiError(401, "session", "Login required");

  return quicklistApiJson({
    status: await getQuicklistApiTokenStatus(getDB(), principal),
  });
};

const createToken = async () => {
  const principal = await getPrincipal();
  if (!principal) return quicklistApiError(401, "session", "Login required");

  const db = getDB();
  const current = await getQuicklistApiTokenStatus(db, principal);
  if (current.exists) {
    return quicklistApiError(
      409,
      "token_exists",
      "Rotate the existing token instead."
    );
  }

  const created = await createOrRotateQuicklistApiToken(db, principal);
  return quicklistApiJson(created, { status: 201 });
};

const rotateToken = async () => {
  const principal = await getPrincipal();
  if (!principal) return quicklistApiError(401, "session", "Login required");

  const db = getDB();
  const current = await getQuicklistApiTokenStatus(db, principal);
  if (!current.exists) {
    return quicklistApiError(404, "token_missing", "Create a token first.");
  }

  return quicklistApiJson(await createOrRotateQuicklistApiToken(db, principal));
};

const disableToken = async () => {
  const principal = await getPrincipal();
  if (!principal) return quicklistApiError(401, "session", "Login required");

  await deleteQuicklistApiToken(getDB(), principal);
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
};

const policy = { require: { feature: "api:quicklists", session: true } } as const;

export const GET = protectRoute(getStatus, policy);
export const POST = protectRoute(createToken, policy);
export const PUT = protectRoute(rotateToken, policy);
export const DELETE = protectRoute(disableToken, policy);
