import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Policy } from "./types";
import { evaluatePolicy } from "./server";
import PolicyErrorView from "@/42go/components/PolicyErrorView";

// Derive a page feature key from the current URL path.
// "/" -> null (no default), "/todos" -> "page:todos", "/docs/intro" -> "page:docs/intro"
async function derivePageFeature(): Promise<string | null> {
  const headersList = await headers();
  const pathname =
    headersList.get("x-pathname") || headersList.get("x-url") || "/";
  const parts = pathname.replace(/^\//, "").split("/").filter(Boolean);
  if (parts.length === 0) return null; // don't enforce a feature for root by default
  // Map only the first segment to align with AppConfig.features pages keys
  return `page:${parts[0].toLowerCase()}`;
}

function getComponentName<C extends { displayName?: string; name?: string }>(
  c: C
): string {
  return c.displayName || c.name || "Component";
}

export function protectPage<P extends object>(
  PageComponent: React.ComponentType<P>,
  policy?: Policy | Policy[]
) {
  const Wrapped = async (props: P) => {
    // If no policy passed, infer a default feature policy from the URL
    let effectivePolicy: Policy | Policy[] | undefined = policy;
    if (!effectivePolicy) {
      const inferred = await derivePageFeature();
      if (inferred) {
        effectivePolicy = { require: { feature: inferred } } as Policy;
      }
    }

    if (effectivePolicy) {
      const result = await evaluatePolicy({ policy: effectivePolicy });
      if (!result.pass) {
        const errCode = result.error?.code; // 'feature' | 'session' | 'role' | 'grant'
        const failingPolicy = Array.isArray(effectivePolicy)
          ? effectivePolicy[result.failedIndex ?? 0]
          : effectivePolicy;
        const override = failingPolicy.onFail || failingPolicy.onError;

        // Determine failing value for message inference
        let failingValue: unknown = null;
        switch (errCode) {
          case "feature":
            failingValue = failingPolicy.require?.feature;
            break;
          case "session":
            failingValue = "session";
            break;
          case "role":
            failingValue = failingPolicy.require?.role;
            break;
          case "grant":
            failingValue =
              failingPolicy.require?.grants ||
              failingPolicy.require?.anyGrant ||
              null;
            break;
        }

        const formatValue = (v: unknown): string => {
          if (Array.isArray(v)) return v.join(",");
          if (typeof v === "string") return v;
          if (v == null) return "";
          return String(v);
        };

        const resolvedCode = override?.code || errCode || "error";
        const inferredMessage =
          errCode === "session"
            ? "login required"
            : formatValue(
                failingValue || result.error?.detail || errCode || "Forbidden"
              );
        const resolvedMessage = override?.message || inferredMessage;

        // Redirect only if explicitly requested via policy-level override
        if (override?.redirect) {
          return redirect(override.redirect);
        }

        // Render override component if provided
        if (override?.render) {
          return override.render({
            code: resolvedCode,
            message: resolvedMessage,
          });
        }

        // Default behavior: inline error component, with two exceptions for legacy semantics:
        // 1. Missing feature => true 404 (SEO correctness)
        // 2. Missing session => redirect to /login (better UX)
        if (!override) {
          if (errCode === "feature") return notFound();
          if (errCode === "session") return redirect("/login");
        }

        return (
          <PolicyErrorView
            code={resolvedCode}
            message={resolvedMessage || "Access denied"}
          />
        );
      }
    }

    return <PageComponent {...(props as P)} />;
  };

  Wrapped.displayName = `protectPage(${getComponentName(PageComponent)})`;
  return Wrapped;
}
