# Core Block: TestRBAC

Use `TestRBAC` to keep the current RBAC/session diagnostic panel available as configurable profile content.

## Config

```ts
{ type: "TestRBAC" }
```

Optional title:

```ts
{ type: "TestRBAC", title: "Session Diagnostics" }
```

## Source

- `src/42go/components/ProfileBlock/blocks/TestRBAC.tsx`
- Type: `TTestRBACProfileBlock` in `src/42go/components/ProfileBlock/types.ts`

## Behavior

- Reads session data with `useSession()`.
- Shows user id, resolved app id, roles, and grants.
- Provides a best-effort `Refresh Session` action with `update({ rbacRefresh: true })`.
- Does not register validation or persistence handlers.

## Agent Notes

- Treat this as diagnostic/development UI, not polished product UI.
- Keep failures in the refresh action non-fatal.
- Do not mix app-specific permission displays into this core block.
