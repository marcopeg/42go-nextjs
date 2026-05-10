# Policy Engine

Defines how page/API access is evaluated through unified policies.

## Core Concepts

- AND semantics across a single policy object and across an array of policies (first failure short-circuits).
- Feature requirements must use explicit prefixes: `page:` or `api:`.
- No wildcard / pattern grant support (exact grant IDs only) – star characters are treated literally.
- Client evaluation (`useEvaluatePolicy`) is optimistic/visual: trusts session snapshot only.
- Server evaluation (`evaluatePolicy`) is authoritative: uses DB for roles/grants via access layer.

## RBAC Data Sources

Role and grant assignments live in the database and are scoped by `app_id`.

- Roles: `auth.roles_users` keyed by `{ app_id, user_id, role_id }`.
- Role grants: `auth.roles_grants` keyed by `{ app_id, role_id, grant_id }`.
- Server policy checks resolve the current request app ID and query those tables directly.
- Client policy checks read `session.user.roles`, `session.user.grants`, and `session.user.appId` from the
  NextAuth JWT session snapshot.

The JWT session snapshot must be created for the same app that authenticated the user. Credentials auth resolves
the app ID from the actual NextAuth callback request headers before looking up `auth.users`. OAuth sign-in uses
the resolved app ID when linking or creating `auth.accounts` and `auth.users`. If a role is changed while a user
is already signed in, refresh the session or sign in again before expecting client-only menu visibility to change.

## Policy Shape

```ts
type Policy = {
  require: {
    session?: boolean;
    feature?: string; // "page:docs" | "api:todos" etc.
    role?: string; // single role
    grants?: string[]; // ALL required
    anyGrant?: string[]; // ANY required (mutually exclusive with grants)
  };
  strict?: boolean; // @experimental (currently no effect)
  strictMode?: "refresh" | "dbOnly"; // @experimental (currently no effect)
  onFail?: { status?: number; message?: string }; // override error mapping
};
```

## Error Mapping

| Code    | HTTP (server) | Meaning                   |
| ------- | ------------- | ------------------------- |
| feature | 404           | Disabled/missing feature  |
| session | 401           | No authenticated session  |
| role    | 403           | Missing required role     |
| grant   | 403           | Missing required grant(s) |

Custom `onFail.status` overrides the HTTP status for API responses. `onFail.message` customizes JSON body.

## Feature Inference

Guards can infer a feature when omitted:

- `protectPage` derives `page:<first-path-segment>` (excluding root `/`).
- `protectRoute` derives `api:<first-path-segment>` from request path.

Prefer explicit `require.feature` for critical surfaces.

## Example (Page)

```tsx
import { protectPage } from "@/42go/policy/protectPage";

function DocsPage() {
  return <div>Docs</div>;
}

export default protectPage(DocsPage, {
  require: { feature: "page:docs", session: true },
});
```

## Example (API Route)

```ts
import { protectRoute } from "@/42go/policy/protectRoute";

export const POST = protectRoute(
  async (_req: Request) => {
    return Response.json({ ok: true });
  },
  {
    require: {
      feature: "api:feedback",
      session: true,
      grants: ["feedback.create"],
    },
    onFail: { status: 429, message: "rate limited" },
  }
);
```

## Experimental Fields

`strict` and `strictMode` are placeholders; they currently trigger a one-time dev warning and have no runtime effect. Future stories may implement cache-bypass or DB-only session enforcement semantics.

## Dev Warnings

Emitted once per session (dev only):

- Invalid feature prefix.
- Usage of experimental `strict` / `strictMode`.

## Out of Scope

Planned future work (separate stories):

- OR / composite policy helper.
- Utility extraction & consolidation.
- Comprehensive automated test suite.

---

TL;DR: Author explicit, prefixed features; rely on unified evaluator; no wildcard grants; experimental flags are inert.
