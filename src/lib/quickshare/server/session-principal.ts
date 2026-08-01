import "server-only";

import { getServerSession } from "next-auth";

import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { getAppID } from "@/42go/config/app-config";
import { getDB } from "@/42go/db";
import type { QuickShareApiPrincipal } from "@/lib/quickshare/server/api-token-store";

/**
 * A valid cookie from another app must not manage this app's credential. The
 * database lookup also makes stale or erased identities fail closed.
 */
export const getQuickShareSessionPrincipal = async (): Promise<QuickShareApiPrincipal | null> => {
  const [appId, session] = await Promise.all([
    getAppID(),
    getServerSession(await getAuthOptions()),
  ]);
  const userId = session?.user?.id;

  if (!appId || !userId || session.user.appId !== appId) return null;

  const account = await getDB()("quickshare.accounts as account")
    .join("auth.users as user", "user.id", "account.user_id")
    .select("account.id")
    .where("account.app_id", appId)
    .andWhere("account.user_id", userId)
    .andWhere("user.app_id", appId)
    .first<{ id: string }>();

  if (!account) return null;

  return { appId, accountId: account.id, userId };
};
