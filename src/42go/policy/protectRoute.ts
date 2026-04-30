import { headers } from "next/headers";
import { evaluatePolicy, policyHttpStatus } from "./server";
import type { Policy, EvaluatePoliciesResult } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (...args: any[]) => Response | Promise<Response>;

async function deriveApiFeatureFromArgs(
  args: unknown[]
): Promise<string | null> {
  const maybeReq = args[0] as unknown;
  try {
    const req = maybeReq as Request;
    if (
      req &&
      typeof req === "object" &&
      typeof (req as Request).url === "string"
    ) {
      const url = new URL(req.url);
      const parts = url.pathname.replace(/^\/+/, "").split("/").filter(Boolean);
      if (parts[0] === "api" && parts[1])
        return `api:${parts[1].toLowerCase()}`;
      if (parts[0]) return `api:${parts[0].toLowerCase()}`;
    }
  } catch {
    // ignore
  }
  const headersList = await headers();
  const pathname =
    headersList.get("x-pathname") || headersList.get("x-url") || "";
  if (!pathname) return null;
  const parts = pathname.replace(/^\/+/, "").split("/").filter(Boolean);
  if (parts[0] === "api" && parts[1]) return `api:${parts[1].toLowerCase()}`;
  if (parts[0]) return `api:${parts[0].toLowerCase()}`;
  return null;
}

export function protectRoute<T extends AnyHandler>(
  handler: T,
  policy?: Policy | Policy[]
) {
  const Wrapped = (async (...args: Parameters<T>) => {
    let effectivePolicy: Policy | Policy[] | undefined = policy;
    if (!effectivePolicy) {
      const inferred = await deriveApiFeatureFromArgs(args as unknown[]);
      if (inferred) {
        effectivePolicy = { require: { feature: inferred } } as Policy;
      }
    }

    if (effectivePolicy) {
      const result: EvaluatePoliciesResult & {
        // internal optional carrying of onFail from server.ts early return
        onFail?: Policy["onFail"];
      } = await evaluatePolicy({ policy: effectivePolicy });
      if (!result.pass) {
        const failingPolicy = Array.isArray(effectivePolicy)
          ? effectivePolicy[result.failedIndex ?? 0]
          : effectivePolicy;
        const override = failingPolicy.onFail || result.onFail;
        const status = override?.status ?? policyHttpStatus(result.error!.code);
        // Determine failing value for message when no override.message
        let failingValue: unknown = null;
        switch (result.error?.code) {
          case "feature":
            failingValue = (failingPolicy as Policy).require.feature;
            break;
          case "session":
            failingValue = "session"; // boolean true isn't useful
            break;
          case "role":
            failingValue = (failingPolicy as Policy).require.role;
            break;
          case "grant":
            failingValue =
              (failingPolicy as Policy).require.grants ||
              (failingPolicy as Policy).require.anyGrant ||
              null;
            break;
        }
        const errorField = override?.status ?? result.error?.code ?? "error";
        const formatValue = (v: unknown): string => {
          if (Array.isArray(v)) return v.join(",");
          if (typeof v === "string") return v;
          if (v == null) return "";
          return String(v);
        };
        let messageField: string;
        if (override?.message) {
          messageField = override.message;
        } else if (result.error?.code === "session") {
          messageField = "login required";
        } else {
          messageField = formatValue(
            failingValue ??
              result.error?.detail ??
              result.error?.code ??
              "Forbidden"
          );
        }
        return Response.json(
          {
            error: errorField,
            message: messageField,
            timestamp: new Date().toISOString(),
          },
          { status }
        );
      }
    }

    return handler(...(args as Parameters<T>));
  }) as T;

  return Wrapped;
}
