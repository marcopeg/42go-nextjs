---
name: 42go-profile-block
description: Agentic documentation for configuring and extending the 42go authenticated ProfilePage block system. Use when Codex needs to configure `app.profile.items`, choose or document core profile blocks, move profile-page content into ProfileBlock blocks, or create a custom app-specific profile block that participates in validation and save orchestration.
---

# 42go Profile Block

Use this skill when working on the authenticated `/profile` page block system.

The core implementation lives at:

- `src/42go/components/ProfileBlock/`
- `src/42go/components/ProfileBlock/blocks/`

App-specific custom blocks should live with the app feature that owns them. Do not put app-specific UI into the shared `42go` layer.

## Quick Workflow

1. Read the current profile config and types:
   - `src/AppConfig.ts`
   - `src/42go/components/ProfileBlock/types.ts`
   - `src/42go/components/ProfileBlock/ProfilePageRenderer.tsx`
2. If configuring existing blocks, read the matching core block reference below.
3. If creating a custom block, read [references/custom-block.md](references/custom-block.md).
4. Keep the public-page block pattern:
   - Core blocks use typed `type` discriminants.
   - Custom blocks use `type: "component"` with a direct React component reference and optional props.
5. Run `npm run qa` after code changes.

## Configuration Shape

Configure profile blocks under `app.profile.items`.

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

If `app.profile.items` is missing, `ProfilePageRenderer` renders default platform blocks.

## Core Blocks

Read these dedicated references before modifying or using a core block:

- [AccountInfo](references/core-account-info.md)
- [TestRBAC](references/core-test-rbac.md)
- [Logout](references/core-logout.md)

## Custom Blocks

Read [custom-block.md](references/custom-block.md) when creating or changing an app-specific block.

Custom blocks can join the global `Save preferences` action with:

```tsx
useProfileBlockHandle({
  validate: () => ({ ok: true }),
  persist: async () => ({ ok: true, message: "Saved." }),
});
```

Validation runs before persistence. If any block fails validation, the profile page blocks all persistence and shows global validation feedback.
