"use client";

import { useEffect, useMemo, useState } from "react";
import { warnOnce } from "./warn";
import { useSession } from "next-auth/react";
import { useAppConfig, useAppID } from "@/42go/config/use-app-config";
import type { EvaluatePoliciesResult, Policy } from "./types";

type HookResult = EvaluatePoliciesResult & { loading: boolean };

const toArray = (p: Policy | Policy[]): Policy[] =>
  Array.isArray(p) ? p : [p];

export function useEvaluatePolicy(policy: Policy | Policy[]): HookResult {
  const [state, setState] = useState<HookResult>({
    pass: false,
    loading: true,
  });
  const { data: rawSession, status } = useSession();
  const sessionUser = (rawSession?.user as unknown as {
    id?: string;
    grants?: string[];
    roles?: string[];
  }) || { grants: [], roles: [] };
  const appConfig = useAppConfig();
  const appId = useAppID() || undefined;

  const policies = useMemo(() => toArray(policy), [policy]);

  // Build features set once per config change
  const featureSet = useMemo(() => {
    const set = new Set<string>();
    const features = appConfig?.features;
    if (features) features.forEach((f) => set.add(f));
    return set;
  }, [appConfig?.features]);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      // While session is loading, keep hook loading
      if (status === "loading") {
        setState((s) => ({ ...s, loading: true }));
        return;
      }

      // strictMode dbOnly currently not differentiating client behavior; server authoritative

      // If strict requested but not dbOnly, we prefer a session refresh in ADR.
      // In practice, next-auth session is refetched periodically; we rely on that here.
      // Optionally, an explicit refresh could be triggered if needed later.

      // Evaluate sequentially, stop at first failure
      for (let i = 0; i < policies.length; i++) {
        const p = policies[i];

        // Feature check
        if (p.require.feature) {
          const val = p.require.feature;
          const hasPrefix = val.startsWith("page:") || val.startsWith("api:");
          if (!hasPrefix) {
            if (process.env.NODE_ENV !== "production") {
              warnOnce(
                "feature-prefix-client",
                `[policy] invalid feature prefix (got: ${val})`
              );
            }
            if (!isMounted) return;
            setState({
              loading: false,
              pass: false,
              error: {
                code: "feature",
                detail: `Feature must be prefixed with 'page:' or 'api:' (got: ${val})`,
              },
              failedIndex: i,
            });
            return;
          }
          if (!featureSet.has(val)) {
            if (!isMounted) return;
            setState({
              loading: false,
              pass: false,
              error: {
                code: "feature",
                detail: `Feature not enabled for app '${
                  appId ?? "default"
                }': ${val}`,
              },
              failedIndex: i,
            });
            return;
          }
        }

        // Experimental strict warnings (client visual path only)
        if (
          (p.strict || p.strictMode) &&
          process.env.NODE_ENV !== "production"
        ) {
          if (p.strict) {
            warnOnce(
              "strict-flag-client",
              "[policy] 'strict' flag is experimental and has no effect client-side"
            );
          }
          if (p.strictMode) {
            warnOnce(
              "strictMode-flag-client",
              ` [policy] 'strictMode=${p.strictMode}' is experimental and has no effect client-side`
            );
          }
        }

        // Session check
        if (p.require.session) {
          if (!sessionUser?.id) {
            if (!isMounted) return;
            setState({
              loading: false,
              pass: false,
              error: { code: "session", detail: "No active session" },
              failedIndex: i,
            });
            return;
          }
        }

        // Role/grant check
        if (p.require.role || p.require.grants || p.require.anyGrant) {
          const roleReq = p.require.role;
          // Visual-only check: rely on session snapshot
          if (!sessionUser?.id) {
            if (!isMounted) return;
            setState({
              loading: false,
              pass: false,
              error: { code: "session", detail: "No active session" },
              failedIndex: i,
            });
            return;
          }
          // Role
          if (roleReq && !sessionUser.roles?.includes(roleReq)) {
            if (!isMounted) return;
            setState({
              loading: false,
              pass: false,
              error: { code: "role" },
              failedIndex: i,
            });
            return;
          }
          // Grants (ALL)
          if (p.require.grants && p.require.grants.length > 0) {
            const grantsOk = p.require.grants.every((g) =>
              sessionUser.grants?.includes(g)
            );
            if (!grantsOk) {
              if (!isMounted) return;
              setState({
                loading: false,
                pass: false,
                error: { code: "grant" },
                failedIndex: i,
              });
              return;
            }
          }
          // anyGrant (ANY)
          if (p.require.anyGrant && p.require.anyGrant.length > 0) {
            const anyOk = p.require.anyGrant.some((g) =>
              sessionUser.grants?.includes(g)
            );
            if (!anyOk) {
              if (!isMounted) return;
              setState({
                loading: false,
                pass: false,
                error: { code: "grant" },
                failedIndex: i,
              });
              return;
            }
          }
        }
      }

      // If all policies passed
      if (!isMounted) return;
      setState({ loading: false, pass: true });
    };

    // Set loading state and run evaluation
    queueMicrotask(() => {
      setState((s) => ({ ...s, loading: true }));
      run();
    });

    return () => {
      isMounted = false;
    };
  }, [
    policies,
    featureSet,
    status,
    sessionUser?.id,
    sessionUser?.grants,
    sessionUser?.roles,
    appId,
  ]);

  return state;
}
