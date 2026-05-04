# Creating a Custom Profile Block

Use this guide when an app needs profile UI that does not belong in shared `42go`.

## Placement

Put the component near the owning app feature.

Example:

```txt
src/app/(app)/(lingocafe)/_components/LingocafePreferences.tsx
```

Do not place app-specific profile blocks under `src/42go/components/ProfileBlock/blocks/`.

## Component Pattern

Custom profile blocks are client components.

```tsx
"use client";

import { useProfileBlockHandle } from "@/42go/components/ProfileBlock";

export const MyAppProfileBlock = () => {
  useProfileBlockHandle({
    validate: () => ({ ok: true }),
    persist: async () => ({ ok: true, message: "Saved." }),
  });

  return <section>{/* app-specific profile UI */}</section>;
};
```

## AppConfig Wiring

Reference the component directly, like public page `component` blocks.

```ts
import { MyAppProfileBlock } from "@/app/(app)/(myapp)/_components/MyAppProfileBlock";

app: {
  profile: {
    items: [
      { type: "AccountInfo" },
      { type: "component", component: MyAppProfileBlock },
      { type: "Logout" },
    ],
  },
}
```

Pass props only when they are configuration, not runtime data.

```ts
{ type: "component", component: MyAppProfileBlock, props: { compact: true } }
```

## Validation And Persistence

The profile page has one `Save preferences` action.

On save:

1. The renderer calls every block `validate()`.
2. If any validation fails, no block persists.
3. If validation succeeds, the renderer calls every block `persist()`.
4. The renderer shows global success only if every persistence handler succeeds.
5. Failed blocks return their own messages for global feedback.

Return clear messages:

```ts
validate: () => {
  if (!selectedLanguage) {
    return { ok: false, message: "Choose a language." };
  }

  return { ok: true };
}
```

```ts
persist: async () => {
  const res = await fetch("/api/myapp/profile", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    return { ok: false, message: "Could not save profile settings." };
  }

  return { ok: true, message: "Profile settings saved." };
}
```

## Rules

- Use browser-side `fetch` with `credentials: "same-origin"`.
- Keep validation local enough to give immediate feedback.
- Keep server-side validation authoritative.
- Never trust browser-supplied user ids.
- Keep app-specific option lists and data contracts app-owned unless the product intentionally promotes them to shared `42go`.
- Run `npm run qa` after code changes.
