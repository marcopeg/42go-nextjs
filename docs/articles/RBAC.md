# Authorization (Legacy RBAC Archive)

The old RBAC layer (useGrants, ProtectedComponent, rbacRoute, /api/rbac/check) has been fully removed.
This file now summarizes how authorization works under the unified Policy engine and keeps a thin
historical record for context. All new code must use the Policy primitives.

## Current Public API

Server:

- evaluatePolicy(policy | policy[])
- protectPage(Component, policy | policy[])
- protectRoute(handler, policy | policy[])

Client:

- useEvaluatePolicy(policy)
- <ProtectComponent policy={...}> (alias: <Protect>)

Types:

- PolicyRequire { session?, feature?, role?, grants?, anyGrant? }
- Policy { require: PolicyRequire; strict?; strictMode? }
- PolicyResult { pass: boolean; error?: { code: 'session' | 'feature' | 'role' | 'grant' } }

Only these are considered stable. Anything else is internal.

## Writing Policies

Example server guard:

```ts
export const GET = protectRoute(async () => {
  // handler logic
}, [
  { require: { feature: "api:todos" } },
  { strict: true, require: { session: true } },
  { require: { grants: ["todos:read"] } },
]);
```

Example component gate:

```tsx
<ProtectComponent
  policy={{ require: { anyGrant: ["users:list", "users:*"] } }}
  renderOnLoading={() => <Spinner />}
  renderOnError={() => null}
>
  <UsersMenu />
</ProtectComponent>
```

You can pass a single policy or an array. All must pass. First failure decides the error code.

## Feature Flags

Use `require.feature: 'page:foo' | 'api:bar'`. These map to `AppConfig.features[]`.
Missing feature -> `feature` error (typically surfaced as 404 for pages / 404 or 403 for APIs depending on mapping).

## Session / Roles / Grants

The evaluator loads role + grant data from the session by default. When any policy has `strict: true`
the server performs one DB read (batched) via the internal access layer. Client strict refreshes the session.
`grants` = ALL strategy. `anyGrant` = first match wins. `role` is a single required role.

## Error Mapping (Global)

feature -> 404
session -> 401
role / grant -> 403

Stop at first failure. Keep policies minimal and explicit.

## Migration Notes (Historical)

Removed public APIs:

- useGrants
- ProtectedComponent (legacy implementation)
- rbacRoute
- checkServerAccess / hasGrants / hasRoles
- /api/rbac/check

Internalized:

- Role/grant DB queries (wildcard matcher removed in task aeh; grants are literal only)

Guarantees preserved:

- Single evaluation pass; at most one strict DB read / session refresh

## When To Use Strict

Use strict for write operations or critical visibility changes (e.g. just granted admin rights).
Avoid sprinkling strict everywhere; it costs either a DB read (server) or session refresh (client).

## Historical Artifact

The previous detailed RBAC how‑to (hooks, realtime API, wrapper components) was retired.
If you need to reconstruct intent, read the ADR: docs/backlog/draft/adr-refactor-rbac-policies.md
sections "Consolidation Completion" and related tasks (aeb).

End of file. The past has been roundhouse‑kicked.
