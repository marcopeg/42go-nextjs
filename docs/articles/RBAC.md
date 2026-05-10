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

Role and grant data is app-scoped.

Server evaluation is authoritative. `evaluatePolicy` resolves the current request app ID, then checks
`auth.roles_users` and `auth.roles_grants` through the internal access layer. The relevant lookup key is
`{ user_id, app_id }`, so a role assigned for `default` does not grant access inside `lingocafe`, and the
reverse is also true.

Client evaluation is visual only. `useEvaluatePolicy` and `<ProtectComponent>` read the cached NextAuth
session snapshot: `session.user.roles`, `session.user.grants`, and `session.user.appId`. That snapshot is
filled by the JWT callback at sign-in and can be refreshed with a session update. It is good for hiding or
showing UI, but it is not the security boundary.

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

- Single evaluation pass; server role/grant checks use the DB authority for the resolved app ID

## When To Use Strict

`strict` and `strictMode` are currently experimental placeholders. They emit development warnings and do not
change runtime behavior. Do not use them as a freshness mechanism. For critical authorization, rely on server
policy checks; for client menu/profile visibility after a role change, refresh the NextAuth session or sign in
again.

## Historical Artifact

The previous detailed RBAC how‑to (hooks, realtime API, wrapper components) was retired.
If you need to reconstruct intent, read the ADR: docs/backlog/draft/adr-refactor-rbac-policies.md
sections "Consolidation Completion" and related tasks (aeb).

End of file. The past has been roundhouse‑kicked.
