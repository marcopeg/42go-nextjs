# Profile Page

The authenticated `/profile` route is driven by `AppConfig`.

Profile data is stored in `auth.users.profile`. Consent evidence is stored in
`auth.users.consent`. Both fields default to `null` so the application can tell
when a user has never created profile or consent data.

## Configuration

Profile pages are still block-composed. They are not field builders.

```ts
app: {
  profile: {
    schema: {
      type: "object",
      required: ["displayMode"],
      properties: {
        displayMode: { type: "string", enum: ["compact", "comfortable"] },
      },
    },
    items: [
      { type: "AccountInfo" },
      { type: "Consent", source: "profile", method: "checkbox-submit" },
      { type: "component", component: MyAppProfileBlock },
      { type: "Logout" },
    ],
  },
  consent: {
    items: [
      {
        name: "terms",
        required: true,
        version: "terms-2026-05-05",
        purpose: "Accept terms",
        legalBasis: "contract",
        category: "legal",
        statement: "I accept the Terms and Conditions",
        label: "I accept the Terms and Conditions",
      },
    ],
  },
}
```

If `app.profile.items` is missing, the profile page is empty. Apps must opt into
their blocks explicitly.

## Core Blocks

`AccountInfo` edits `auth.users.name` and `auth.users.image`, and displays email
and signup date.

`Consent` renders `app.consent.items` and writes GDPR-oriented evidence into
`auth.users.consent`.

`TestRBAC` is a diagnostic block for RBAC/session inspection.

`Logout` renders the configured logout action.

## Custom Blocks

Custom blocks use the central profile store:

```tsx
"use client";

import { useProfile } from "@/42go/profile/client";
import { useProfileBlockHandle } from "@/42go/components/ProfileBlock";

export const MyAppProfileBlock = () => {
  const { profile, setProfileValue } = useProfile();

  useProfileBlockHandle({
    validate: () =>
      profile.displayMode ? { ok: true } : { ok: false, message: "Pick a mode." },
  });

  return (
    <select
      value={String(profile.displayMode || "")}
      onChange={(event) => setProfileValue("displayMode", event.target.value)}
    />
  );
};
```

Blocks should not fetch or persist profile data in the normal path. The page
loads once from `/api/profile`, saves centrally, runs block validation first,
runs AJV validation next, then writes profile and consent in one request.

## Validation

`app.profile.schema` is an AJV JSON Schema for the full `auth.users.profile`
object. AJV uses draft-07 and strict mode by default. Apps can set
`app.profile.ajv.strict = false` if a practical schema needs it.

Required fields in `app.profile.schema.required` and required consent items
together determine `profile.isComplete`.
