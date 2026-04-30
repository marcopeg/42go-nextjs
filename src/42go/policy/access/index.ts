import "server-only";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { getDB } from "@/42go/db";

// Internal DB lookups (roles, grants) kept private to policy layer
export async function getUserRoles(
  userId: string,
  appId: string
): Promise<string[]> {
  const db = getDB();
  const rows: Array<{ role_id: string }> = await db("auth.roles_users")
    .select("role_id")
    .where({ user_id: userId, app_id: appId });
  return rows.map((r) => r.role_id);
}

export async function getUserGrants(
  userId: string,
  appId: string
): Promise<string[]> {
  const db = getDB();
  const roleIds = await getUserRoles(userId, appId);
  if (roleIds.length === 0) return [];
  const rows: Array<{ grant_id: string }> = await db("auth.roles_grants")
    .select("grant_id")
    .whereIn("role_id", roleIds)
    .andWhere({ app_id: appId })
    .distinct();
  return rows.map((r) => r.grant_id);
}

// NOTE: Wildcard / pattern grant support removed (task aeh). All grant checks are literal.

export interface AccessCheckInput {
  userId: string;
  appId: string;
  role?: string | null;
  grantsAll?: string[] | null;
  grantsAny?: string[] | null;
}

export interface AccessCheckResult {
  ok: boolean;
  error?: { code: "role" | "grant"; detail?: string };
}

export async function checkAccess(
  input: AccessCheckInput
): Promise<AccessCheckResult> {
  const { userId, appId, role, grantsAll, grantsAny } = input;

  // Single role semantics
  if (role) {
    const roles = await getUserRoles(userId, appId);
    if (!roles.includes(role)) {
      return { ok: false, error: { code: "role", detail: "Missing role" } };
    }
  }

  if (grantsAll && grantsAll.length > 0) {
    const userGrants = await getUserGrants(userId, appId);
    if (process.env.DEBUG_POLICY) {
      console.log("[policy] grantsAll check", {
        userId,
        appId,
        grantsAll,
        userGrants,
      });
    }
    const allOk = grantsAll.every((g) => userGrants.includes(g));
    if (!allOk)
      return { ok: false, error: { code: "grant", detail: "Missing grants" } };
  }

  if (grantsAny && grantsAny.length > 0) {
    const userGrants = await getUserGrants(userId, appId);
    if (process.env.DEBUG_POLICY) {
      console.log("[policy] grantsAny check", {
        userId,
        appId,
        grantsAny,
        userGrants,
      });
    }
    const anyOk = grantsAny.some((g) => userGrants.includes(g));
    if (!anyOk)
      return {
        ok: false,
        error: { code: "grant", detail: "Missing anyGrant" },
      };
  }

  return { ok: true };
}

export async function getSessionUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(await getAuthOptions());
    return session?.user?.id || null;
  } catch (e) {
    if (process.env.DEBUG_POLICY) {
      console.warn("[policy] getSessionUserId failed", e);
    }
    return null;
  }
}
