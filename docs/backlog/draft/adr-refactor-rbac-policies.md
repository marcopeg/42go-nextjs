# RBAC Refactor Policies [adr]

Unify Feature Flags and RBAC under a single “Policy” abstraction usable on server (SSR pages, API routes) and client (components), with session-first checks and optional strict refresh.

## Context — Current Implementation (post aeb consolidation)

- Session-first RBAC already exists
  - JWT/session embeds `user.id`, `roles: string[]`, `grants: string[]`, `appId` via NextAuth callbacks
    - files: `src/42go/auth/lib/callbacks.ts`, `src/42go/auth/lib/providers/types.ts`
  - Legacy wrappers (useGrants, legacy ProtectedComponent, rbacRoute, /api/rbac/check) removed in task aeb
  - Unified surface now: `evaluatePolicy`, `protectPage`, `protectRoute`, `useEvaluatePolicy`, `ProtectComponent`
- Feature Flags
  - AppConfig-driven flags, URL-derived helpers, server-validated in middleware; not yet unified with RBAC
  - docs in `docs/articles/FEATURE_FLAGS.md` and architecture notes

Status: unified Policy system live; all legacy RBAC + feature flag wrappers physically deleted. Remaining optimization focuses on strictMode refinement & test coverage (tracked in [aea]).

```ts
const requirements = {
  session: true, // boolean, force to check for an ongoing session
  feature: "api/foo",
  role: "admin",
  grants: ["doc:write", "doc:read"], // require all
  anyGrant: ["doc:write", "doc:read"], // stop at first match
};
```

Rules for the policy:

- all keys are optional
- at least one key should be provided
- `grants` and `anyGrant` can not be both present in a policy

Order of execution:

1. session
2. feature
3. role
4. grants

## Policy Document

A policy document is combination of requirements and rules:

```ts
const policy = {
  require: {
    feature: "api/foo",
    role: "admin",
    grants: ["doc:write", "doc:read"], // require all
    anyGrant: ["doc:write", "doc:read"], // stop at first match
  },
};
```

## Evaluate Policy

This is an example of a generic policy evaluation in the backend.

This should work both in an SSR page and in an API route:

```ts
const result = await evaluatePolicy({
  strict: true, // forces database check (default; false)
  require: {
    feature: "api/foo",
    role: "admin",
    grants: ["doc:write", "doc:read"], // require all
    anyGrant: ["doc:write", "doc:read"], // stop at first match
  },
});
```

The result should be an object like:

```json
{
  "pass": false,
  "error": {
    "code": "feature"
  }
}
```

Possible error codes:

- feature: the feature flag check failed (will probably lead to 404 error)
- session: there is no ongoing session (will probably lead to 401 error)
- role: failed on role check (will probably lead to 403 error)
- grant: failed on grants check (will probably lead to 403 error)

**strict mode** is used to force fetching roles and grants from the database at evaluation time. By default (false) the policy evaluator uses whatever information is available in the session.

Notes for current codebase alignment:

- “role/grant” checks exist both client and server. Feature checks are AppConfig-based.
- Strict mode semantics: default method is always “session”. When `strict: true`, prefer to refresh the session so fresh roles/grants flow into the JWT/session and benefit subsequent non-strict checks. On server-only contexts where a refresh isn’t applicable, perform a one-time DB read.

Decision: For client strict, we refresh the session. For server strict, we do a one-time DB read. `strictMode` can explicitly choose behavior when needed.

Future extension: If needed, introduce an advanced option (e.g., `strictMode: 'refresh' | 'dbOnly'`) to allow DB-only checks without updating the session.

Edge cases for `'dbOnly'` consideration:

- Ephemeral approvals: time-bound or break‑glass grants meant for a single action; avoid persisting into session across the app.
- UI isolation: background eligibility check in a modal that shouldn’t trigger global session re-render side effects mid‑flow.
- JWT size control: rare, high-entropy grants where embedding into session would significantly increase cookie/JWT size.
- Compliance trails: just‑in‑time server authorization that must be evaluated and logged without mutating client session state.

## Feature Flags Configuration

`policy.require.feature` validates against the unified `AppConfig.features[]` list. No segmentation. Just one list with enforced prefixes:

- `page:<name>` for pages
- `api:<name>` for API endpoints

Any feature missing a valid prefix fails fast with a `feature` error. Wildcards (`page:*`, `api:*`) are supported but discouraged in production.

Legacy `featureFlags.{pages,apis}` removed (see [ady] completion). Articles updated (`FEATURE_FLAGS.md`).

## Protect SSR page

The protection of an SSR page should work with a wrapper that is capable of evaluating policies and will return errors accordingly:

```ts
export default protectPage(PageComponent, [
  { require: { feature: "page:route" } },
  { strict: true, require: { session: true } },
  { require: { role: "admin" } },
]);
// Global mapping applies: first failing policy determines response
// feature → 404, session → 401, role/grant → 403
```

If no policies is passed, the default policy "feature:slug" will be checked to imply a policy on the current URL.

All listed policies MUST pass to have the function allow page rendering.

NOTE: if **any** of the policies impmements `require:true` the db should be hit only once to gather the information BEFORE checking all the policies.

## Client Side Evaluation

This is the client side counterpart of the `evaluatePolicy`.

If `strict:true` then an API request is made to refresh the session and get fresh roles and grants to evaluate.

NOTE: Client checks are visual/UX only. Always enforce on the server. If `strict:true`, refresh the session once and then use the updated session data. Prefer `strictMode: 'refresh'` on client; reserve `'dbOnly'` for special cases.

```ts
const result = useEvaluatePolicy({
  strict: true, // forces database check (default; false)
  require: {
    feature: "api/foo",
    role: "admin",
    grants: ["doc:write", "doc:read"], // require all
    anyGrant: ["doc:write", "doc:read"], // stop at first match
  },
});
```

The result should be an object like:

```json
{
  "loading": true,
  "pass": false,
  "error": {
    "code": "feature"
  }
}
```

the `error.code` should contain the policy key that failed (feature, role, grants)

## Protect Component (hook)

This is the Client-Side counterpart of `protectPage()`:

```ts
const res = useProtectComponent([
  {
    require: { feature: "page/route" },
    onError: { status: 404, message: "not available" },
  },
  {
    require: { grant: "foo:bar", strict: true },
    onError: { status: 403 },
  },
]);
```

The result should be an object like:

```json
{
  "loading": true,
  "pass": false,
  "error": {
    "code": "feature", // is the key that failed in the policy
    "details": {
      // comes from the "onError"
      "status": 404,
      "message": "not available"
    }
  }
}
```

NOTE: if **any** policy implements the `strict:true`, the session should be refreshed BEFORE evaluating the policies so to make sure that the server hit only happens once. This could be achieved by forcing the session refresh and then evaluate each policy removing the strict param.

In this case the error code and message do not mean anything in the context of an HTTP request, they are there as information that can be internally used to figure out what to do like displaying an error message.

## Protect Component (component)

This is a utility component that should be used as:

```tsx
<ProtectComponent
  policy={{
    strict: true,
    require: { feature: "page/foo" },
  }}
  renderOnLoading={() => "loading"}
  renderOnError={({ code, details }) => "show error stuff"}
>
  <div>some children</div>
</ProtectComponent>
```

Internally it should use the `useProtectComponent()` and simply apply the loading/error logic at rendering. If the check passes, it should render the children.

The `policy` should take one or many policies.

## AppLayout Integration

I think we should expand the capabilities of the `@/42go/layouts/app` to incorporate the `ProtectComponent` capabilities.

Example:

```tsx
// Unprotected page
<AppLayout>unprotected page</AppLayout>

<AppLayout policy={{
  strict: true,
  require: { feature: "page:foo" },
}}>protected page</AppLayout>
```

Basically it should take all the props from `ProtectComponent` and apply that component around the main content of the layout.

It should also provide a good default for the loading and error message so that it should never be passed (for consitencies across different pages) but COULD be passed if needed.

---

## Decision

Adopt a unified Policy model with a single evaluator available on both server and client. Maintain session-first behavior; add strict mode to refresh session or query DB. Feature flags become a first-class policy input, reading from `AppConfig.features`.

## Design Overview

- Types
  - `PolicyRequire = { session?: boolean; feature?: string; role?: string; grants?: string[]; anyGrant?: string[] }`
  - `Policy = { require: PolicyRequire; strict?: boolean; strictMode?: 'refresh' | 'dbOnly' }`
  - `PolicyResult = { pass: boolean; error?: { code: 'session' | 'feature' | 'role' | 'grant' } }`
  - Precedence: if `strictMode` is set, it overrides `strict`. If neither is set, evaluate from session only. If only `strict` is true, defaults are: client → `refresh`, server → `dbOnly`.
    -- Server
  - `evaluatePolicy()` now directly performs feature/session/role/grant checks (legacy checkServerAccess removed)
  - `protectPage()` HOC for SSR; default policy derives feature key from URL
  - `protectRoute()` guards API routes (replaces legacy rbacRoute)
  - Global error mapping: feature → 404, session → 401, role/grant → 403 (stop at first failure)
    -- Client
  - `useEvaluatePolicy()` unified hook (replaces legacy useGrants)
  - `ProtectComponent` thin wrapper over `useEvaluatePolicy()`
  - `strict: true` triggers session refresh (via NextAuth update) once, then evaluate
- Feature flags
  - `AppConfig.features: string[]` canonical list. Old `featureFlags.{pages,apis}` deprecated and removed in a separate cleanup task

## Recommended Usage

Client (UX-only)

- Default: session-only checks (no strict). Fast and good enough for visuals.
- Use `strictMode: 'refresh'` only when UI must reflect real-time changes (e.g., grant just assigned) within the same session.
- Never rely on client checks for security. Always back with server enforcement.

Server (source of truth)

- SSR pages: gate with `protectPage()` policies. Use strict by default where access matters; server default strict behavior is `dbOnly`.
- API routes: wrap with `rbacRoute()`/`evaluatePolicy()`. Use strict/`dbOnly` for writes and sensitive reads.
- Batch: if multiple policies or strict checks apply, refresh once (client) or read once (server) and reuse in the evaluation cycle.

Feature + RBAC layering

- Feature availability → `feature` check (404 semantics).
- Authorization → `role/grant` checks (401/403 semantics).
- Use `page:` and `api:` prefixes to keep features unambiguous.

Performance tips

- Avoid repeated session refreshes; trigger at most once per interaction.
- Prefer wildcards for bundled grants (e.g., `users:*`).
- Choose strategies wisely: grants → ALL by default, roles → ANY by default; override only when needed.

## Migration Plan (Executed)

1. Introduced unified policy types & evaluator (server + client). ✅
2. Added `protectPage` / `protectRoute`; migrated sample pages & APIs. ✅
3. Added `AppConfig.features` with temporary bridge. ✅ (now removed)
4. Migrated all apps to explicit `features[]`. ✅
5. Purged legacy `featureFlags`, `appRoute`, `appPage`, `pageWithConfig`; updated docs & stories. ✅

## Rollout & Risks

- Risk: double-fetch of RBAC on strict. Mitigation: batch refresh and reuse data in a single eval cycle
- Risk: feature naming collisions. Mitigation: prefix conventions (`page:`, `api:`) documented and enforced in lints later
- Risk: SSR vs Client divergence. Mitigation: same evaluator rules, server authority for final enforcement

## References to Implementation

- RBAC session load: `src/42go/auth/lib/callbacks.ts`
- Legacy (removed): rbac hooks/components/utils/api under `src/42go/rbac/`, `/api/rbac/check`
- Unified policy engine: `src/42go/policy/{types.ts,server.ts,index.ts}`
- Client policy utilities: `src/42go/policy/{useEvaluatePolicy.ts,ProtectComponent.tsx}`
- SSR page guard: `src/42go/policy/protectPage.tsx`
- API route guard: `src/42go/policy/protectRoute.ts`
- Example usage with policies: `src/app/api/todos/route.ts`

## Progress

- Unified server policy evaluator (feature/session/role/grant + error mapping) shipped.
- `protectPage()` guarding SSR pages (inference + explicit policies) — legacy page wrappers removed.
- `protectRoute()` guarding API routes (inference + explicit policies) — legacy `appRoute` removed.
- AppLayout policy integration live; client `<ProtectComponent>` + `useEvaluatePolicy()` working.
- All apps converted to unified `features[]`; legacy config fields & bridge deleted.
- Feature flags article rewritten; cleanup story [ady] marked complete.
- Pending: strictMode `'refresh'` implementation & comprehensive tests (story [adw], [aea]).

## Sub-Stories (Current Status)

Break this ADR into focused tasks. Each task is linked here once created:

- [adt] Unified Policy Engine — Core implemented; awaiting tests (deferred to [aea]).
- [adu] Feature Flags Unification — COMPLETE (features[] live; legacy removed).
- [adv] Protect SSR Pages — Initial rollout complete; expand coverage + tests later.
- [adw] Client Policy Hook & Component — Implemented; strictMode 'refresh' pending; tests deferred.
- [adx] AppLayout Policy Integration — Policy prop integrated; default loading/error UX pending.
- [ady] Cleanup Legacy Feature Flags — COMPLETE (no legacy refs).
- [adz] API Route Policy Guard — Implemented; extend to remaining sensitive routes + tests.
- [aea] Policy & RBAC Testing Strategy — Defines matrix; will backfill tests across all above.
- [aeb] Consolidate RBAC Into Policy Engine — Removes legacy RBAC wrappers; internalizes roles/grants under unified policy.

## Resolved Decisions

### Consolidation Scope (aeb)

Objective: collapse legacy `rbac/` layer into the unified `policy` system. One mental model, one evaluator.

Public API (post-aeb):

- Server: `evaluatePolicy`, `protectRoute`, `protectPage`
- Client: `useEvaluatePolicy`, `ProtectComponent` (alias `Protect`)
- Types: `Policy`, `PolicyResult`, `PolicyRequire`

Internal Only (no public exports):

- role/grant DB queries & wildcard matcher
- internal role/grant evaluation helper (was `checkServerAccess` + `hasGrants`/`hasRoles`)

Removed Artifacts:

- `useGrants`, `ProtectedComponent` (legacy), `rbacRoute`, `checkServerAccess`, `hasGrants`, `hasRoles` (public surface)
- Entire `src/42go/rbac/` folder (after migration)

Rationale:

- Reduce indirection; fewer concepts to learn
- Eliminate duplicate client/server gating patterns
- Enable future policy extensions (time windows, ownership checks) without RBAC wrapper churn

Guarantees Kept:

- Wildcard grants still work (`foo:*`)
- Error code mapping unchanged (feature→404, session→401, role/grant→403)
- Single session fetch per evaluation

Deferred (tracked elsewhere):

- Batch strict optimization (adt/aea)
- Caching role/grant sets

- Enforce feature prefixes: `page:` and `api:` project-wide.
- Client strict uses NextAuth session refresh; only use the dedicated policy-check API when `strictMode = 'dbOnly'`.
- Use global error mapping (first failure): feature → 404, session → 401, role/grant → 403. All policies are required.
- Role is single: `role?: string`. Future option: `roles`/`anyRole` if a real use case emerges.
- appId resolution:
  - SSR: `@/42go/config/app-config.ts` → `getAppID()`
  - Client: `@/42go/config/use-app-config.tsx` → `useAppID()`
  - Renamed helpers now live as `getAppID` / `useAppID` (completed).
- Remove `appPage()` and `pageWithConfig()` in favor of `protectPage()` and unified policies. Default feature inference uses only the first URL segment for page checks.

## Consolidation Completion (aeb)

Legacy RBAC module fully removed; unified policy engine is sole public surface.

Highlights:

- Removed public RBAC APIs: `useGrants`, legacy `ProtectedComponent`, `rbacRoute`, `checkServerAccess`, `hasGrants`, `hasRoles`.
- Added internal access layer `src/42go/policy/access/` (role/grant queries + wildcard matcher) — not exported.
- `evaluatePolicy` performs direct DB checks via internal `checkAccess` (no legacy indirection).
- Client: `useEvaluatePolicy` handles visual gating only; relies on session snapshot (NextAuth refresh semantics unchanged). No client DB probe.
- `/api/rbac/check` endpoint and entire `src/42go/rbac/` tree deleted.
- Profile page + layouts migrated to policy primitives; legacy session hooks removed.
- No backward compatibility / deprecation layer (intentional per early-stage clarity principle).
- Wildcard grant semantics preserved exactly.
- Documentation sweep complete; RBAC article converted to legacy archive referencing policy engine.

— End ADR —
