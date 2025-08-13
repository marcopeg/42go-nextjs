// Unified Policy types (server + client compatible shapes)
// Keep small and focused; client enforcement is visual only.

export type PolicyErrorCode = "session" | "feature" | "role" | "grant";

export interface PolicyRequire {
  // Require an authenticated session
  session?: boolean;
  // Enforce an enabled feature for the current app
  // Must be prefixed with "page:" or "api:" (e.g., "page:docs", "api:todos")
  feature?: string;
  // Single role requirement (server authoritative)
  role?: string;
  // All-of grants requirement (cannot be used together with anyGrant)
  grants?: string[];
  // Any-of grants requirement (cannot be used together with grants)
  anyGrant?: string[];
}

export interface Policy {
  require: PolicyRequire;
  /**
   * @experimental reserved; currently no different runtime semantics.
   * When true, intent is to bypass cached session in future story.
   */
  strict?: boolean;
  /**
   * @experimental reserved; currently no different runtime semantics.
   * Planned modes: 'refresh' (re-fetch session) vs 'dbOnly' (force DB path)
   */
  strictMode?: "refresh" | "dbOnly";
  // Optional custom error mapping when this policy fails
  onFail?: {
    status?: number; // API routes only
    message?: string; // override error message (API / pages)
    code?: string; // override error code label (pages)
    redirect?: string; // page: redirect target when failing (takes precedence over render)
    render?: (info: { code: string; message: string }) => React.ReactNode; // page-only custom inline renderer
  };
  /** @deprecated Use onFail instead */
  onError?: {
    status?: never;
    message?: string;
    code?: string;
    redirect?: string;
    render?: (info: { code: string; message: string }) => React.ReactNode;
  };
}

export interface PolicyResult {
  pass: boolean;
  error?: {
    code: PolicyErrorCode;
    detail?: string;
  };
}

export interface EvaluatePolicyInput {
  policy: Policy | Policy[];
  // Optional explicit appId; when omitted, resolved from request context
  appId?: string | null;
}

export interface EvaluatePoliciesResult extends PolicyResult {
  // When multiple policies provided, return the first failing policy index
  failedIndex?: number;
}
