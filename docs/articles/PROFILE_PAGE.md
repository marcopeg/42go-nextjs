# Profile Page

The authenticated `/profile` route is driven by `AppConfig` through
`app.profile.items`.

Profile blocks follow the same general pattern as public page blocks:

- Platform blocks use typed `type` discriminants.
- App-specific blocks use `type: "component"` with a direct React component
  reference and optional props.
- The route stays client-only and uses `AppLayout`.

## Configuration

```ts
app: {
  profile: {
    items: [
      { type: "AccountInfo" },
      { type: "component", component: MyAppProfileBlock },
      { type: "TestRBAC" },
      { type: "Logout" },
    ],
  },
}
```

If an app does not define `app.profile.items`, the profile page renders the
default platform blocks: `AccountInfo`, `TestRBAC`, and `Logout`.

## Platform Blocks

`AccountInfo` shows session account basics such as name, email, and signup date
when available.

`TestRBAC` exposes the RBAC/session diagnostic panel and session refresh action.
It is intended as a development or diagnostic block, not polished end-user UX.

`Logout` renders the logout action inline in the profile page. The top bar is
reserved for `Save preferences`.

## Custom Blocks

Custom blocks should live with the app feature that owns them. For example, the
first LingoCafe block lives under the authenticated LingoCafe app route area and
is referenced from `src/config/lingocafe/config.ts`.

Custom blocks can participate in the global save action by calling
`useProfileBlockHandle()` and registering validation and persistence handlers.

```tsx
useProfileBlockHandle({
  validate: () => ({ ok: true }),
  persist: async () => ({ ok: true, message: "Saved." }),
});
```

## Save Orchestration

The profile page has one top-bar `Save preferences` action.

When clicked, the renderer asks every registered block to validate. If any block
returns a validation error, persistence is blocked and the page shows global
validation feedback.

If validation succeeds, every registered block runs its own persistence handler.
The page waits for all persistence results. Global success appears only when all
blocks succeed. If one or more blocks fail, the page shows their messages as
global feedback while successful blocks can remain saved.
