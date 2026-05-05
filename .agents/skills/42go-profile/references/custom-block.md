# Creating a Custom Profile Block

Use this guide when an app needs profile UI that does not belong in shared
`42go`.

## Placement

Put the component near the owning app feature.

```txt
src/app/(app)/(lingocafe)/_components/LingocafePreferences.tsx
```

Do not place app-specific profile blocks under
`src/42go/components/ProfileBlock/blocks/`.

## Component Pattern

Custom profile blocks are client components. They edit the central profile
store, then the page saves everything through `/api/profile`.

```tsx
"use client";

import { useProfile } from "@/42go/profile/client";
import { useProfileBlockHandle } from "@/42go/components/ProfileBlock";

export const MyAppProfileBlock = () => {
  const { profile, setProfileValue } = useProfile();

  useProfileBlockHandle({
    validate: () => {
      if (!profile.targetLang) {
        return { ok: false, message: "Choose a target language." };
      }

      return { ok: true };
    },
  });

  return (
    <select
      value={String(profile.targetLang || "")}
      onChange={(event) => setProfileValue("targetLang", event.target.value)}
    />
  );
};
```

## AppConfig Wiring

Reference the component directly.

```ts
app: {
  profile: {
    schema: {
      type: "object",
      required: ["targetLang"],
      properties: {
        targetLang: { type: "string", enum: ["en", "sv"] },
      },
    },
    items: [
      { type: "component", component: MyAppProfileBlock, profileKeys: ["targetLang"] },
      { type: "Logout" },
    ],
  },
}
```

`profileKeys` and `consentKeys` are top-level ownership metadata. They make the
composition readable. They are not a field-builder DSL.

## Rules

- Use `useProfile()` for profile/consent state.
- Use `useProfileBlockHandle()` for local validation and save callbacks.
- Keep server-side validation authoritative through `app.profile.schema`.
- Never trust browser-supplied user ids.
- Keep app-specific option lists and data contracts app-owned.
- Run `npm run qa` after code changes.
