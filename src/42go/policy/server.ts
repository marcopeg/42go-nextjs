import "server-only";
import { getServerSession } from "next-auth";
import { warnOnce } from "./warn";
import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { getAppConfig, getAppID } from "@/42go/config/app-config";
import { checkAccess, getSessionUserId } from "./access";
import type {
  EvaluatePoliciesResult,
  EvaluatePolicyInput,
  Policy,
  PolicyResult,
} from "./types";

// Global mapping: feature -> 404, session -> 401, role/grant -> 403
const mapError = (code: NonNullable<PolicyResult["error"]>["code"]): number => {
  switch (code) {
    case "feature":
      return 404;
    case "session":
      return 401;
    case "role":
    case "grant":
      return 403;
  }
};

const policyArray = (p: Policy | Policy[]): Policy[] =>
  Array.isArray(p) ? p : [p];

export async function evaluatePolicy({
  policy,
  appId,
}: EvaluatePolicyInput): Promise<EvaluatePoliciesResult> {
  const policies = policyArray(policy);

  // Resolve app context
  const resolvedAppId = appId ?? (await getAppID());
  const config = await getAppConfig();

  // Load session once; server authority is DB for roles/grants
  const session = await getServerSession(await getAuthOptions());

  // Helper: unified features list (config.features already bridged if legacy only)
  const allFeatures = new Set<string>(config?.features || []);

  // Validate policies sequentially; return first error
  for (let i = 0; i < policies.length; i++) {
    const p = policies[i];

    // Validate feature prefix contract early
    if (p.require.feature) {
      const val = p.require.feature;
      const hasPrefix = val.startsWith("page:") || val.startsWith("api:");
      if (!hasPrefix) {
        if (process.env.NODE_ENV !== "production") {
          warnOnce(
            "feature-prefix",
            `[policy] invalid feature prefix (got: ${val})`
          );
        }
        return {
          pass: false,
          error: {
            code: "feature",
            detail: `Feature must be prefixed with 'page:' or 'api:' (got: ${val})`,
          },
          failedIndex: i,
          onFail: p.onFail,
        } as EvaluatePoliciesResult & { onFail?: Policy["onFail"] };
      }
      if (!allFeatures.has(val)) {
        return {
          pass: false,
          error: {
            code: "feature",
            detail: `Feature not enabled for app '${resolvedAppId}': ${val}`,
          },
          failedIndex: i,
          onFail: p.onFail,
        } as EvaluatePoliciesResult & { onFail?: Policy["onFail"] };
      }
    }

    // Experimental strict warnings (only once)
    if ((p.strict || p.strictMode) && process.env.NODE_ENV !== "production") {
      if (p.strict) {
        warnOnce(
          "strict-flag",
          "[policy] 'strict' flag is experimental and currently has no effect"
        );
      }
      if (p.strictMode) {
        warnOnce(
          "strictMode-flag",
          ` [policy] 'strictMode=${p.strictMode}' is experimental and currently has no effect`
        );
      }
    }

    // Session requirement
    if (p.require.session) {
      if (!session?.user?.id) {
        return {
          pass: false,
          error: { code: "session", detail: "No active session" },
          failedIndex: i,
          onFail: p.onFail,
        } as EvaluatePoliciesResult & { onFail?: Policy["onFail"] };
      }
    }

    // Role/grant checks: direct DB authority via internal access layer
    if (p.require.role || p.require.grants || p.require.anyGrant) {
      const userId = await getSessionUserId();
      if (!userId) {
        return {
          pass: false,
          error: { code: "session", detail: "No active session" },
          failedIndex: i,
          onFail: p.onFail,
        } as EvaluatePoliciesResult & { onFail?: Policy["onFail"] };
      }
      const res = await checkAccess({
        userId,
        appId: resolvedAppId || "default",
        role: p.require.role || null,
        grantsAll: p.require.grants || null,
        grantsAny: p.require.anyGrant || null,
      });
      if (!res.ok) {
        return {
          pass: false,
          error: { code: res.error!.code, detail: res.error?.detail },
          failedIndex: i,
          onFail: p.onFail,
        } as EvaluatePoliciesResult & { onFail?: Policy["onFail"] };
      }
    }
  }

  return { pass: true };
}

export const policyHttpStatus = mapError;
