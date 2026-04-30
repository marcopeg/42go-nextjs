# Feature Flags (Unified)

Brutal simplicity: one array per app. `features: string[]` inside each `AppConfig` is the single source of truth. Every entry is prefixed:

- `page:...` for pages / UI surfaces
- `api:...` for API endpoints

Examples:

```ts
features: ["page:docs", "page:dashboard", "api:todos", "api:feedback"];
```

## Why unify?

Because split `pages|apis` objects were weak. One list means fast membership tests, zero branching, cleaner mental model. Less code, fewer bugs.

## Naming Rules

1. Always prefix (`page:` or `api:`). No prefix? Rejected by policy evaluator.
2. Lowercase with dashes allowed. Keep it human.
3. Wildcards: `page:*` / `api:*` grant blanket enablement (use sparingly; dev-only or internal apps).

## Defining Features

Edit `src/AppConfig.ts` per app:

```ts
export const apps = {
  default: {
    name: "DEFAULT APP",
    features: ["page:docs", "page:todos", "api:todos", "api:feedback"],
  },
};
```

## Enforcing Features

Use policies. Pages: `protectPage`. API routes: `protectRoute`. See also [POLICY.md](./POLICY.md) for evaluation semantics & overrides.

### Page Example

```tsx
import { protectPage } from "@/42go/policy/protectPage";

function Todos() {
  return <div>Todos</div>;
}

export default protectPage(Todos, { require: { feature: "page:todos" } });
```

### API Route Example

```ts
import { protectRoute } from "@/42go/policy/protectRoute";

const handler = async (_req: Request) => Response.json({ ok: true });

export const POST = protectRoute(handler, {
  require: { feature: "api:feedback" },
});
```

### Inferred API Feature

If you skip the policy, `protectRoute(handler)` will infer `api:<segment>` from the URL (`/api/todos` → `api:todos`). Explicit beats implicit—prefer explicit for clarity.

## Dynamic / Catch-All Pages

`protectPage` can infer the first path segment and build a `page:` feature automatically when you omit an explicit one. For `/docs/anything` it checks `page:docs`.

Still better to be explicit when guarding critical surfaces.

## Wildcards

`api:*` or `page:*` entries (feature enablement) are discouraged in production and may be removed. Grant pattern matching is NOT supported (exact grant IDs only) – see POLICY.md. Treat wildcard features as temporary local convenience only.

## Removal of Legacy System

Gone: `featureFlags.pages`, `featureFlags.apis`, `appRoute`, `routeWithConfig`, `pageWithConfig`, `appPage`.

Now: `features[]` + `protectPage` + `protectRoute` + unified policy evaluator.

## Migration Notes

Old → New mapping:

| Legacy                    | New                           |
| ------------------------- | ----------------------------- |
| pages: ["docs"]           | features: ["page:docs"]       |
| apis: ["todos"]           | features: ["api:todos"]       |
| appRoute(handler)         | protectRoute(handler, policy) |
| routeWithConfig(getTodos) | protectRoute(getTodos)        |
| appPage/pageWithConfig    | protectPage(Component)        |

If you somehow still find legacy symbols in code, you've traveled back in time.

## Testing (Deferred)

Formal test matrix lives in the `[aea]` Testing Strategy story. This doc stays lean.

## TL;DR

Declare features once. Guard with policies. Ship.
