---
name: 42go-consent
description: Configure and extend the 42go consent system for authenticated profile pages, including `app.consent.items`, consent evidence history, required consent completeness, and the core `Consent` / `ProfileConsent` components.
---

# 42go Consent

Use this skill when adding or changing consent collection for an app.

Core files:

- `src/42go/profile/consent.ts`
- `src/42go/profile/ProfileConsent.tsx`
- `src/42go/components/ProfileBlock/blocks/Consent.tsx`
- `src/42go/profile/server.ts`

## Configuration

Consent items live at `app.consent.items`. They render only when the app also
lists `{ type: "Consent" }` in `app.profile.items`.

```ts
app: {
  profile: {
    items: [
      { type: "Consent", source: "profile", method: "checkbox-submit" },
      { type: "Logout" },
    ],
  },
  consent: {
    items: [
      {
        name: "terms",
        required: true,
        version: "terms-2026-05-05",
        label: "I accept the **Terms and Conditions**",
        collect: ["source", "method"],
      },
    ],
  },
}
```

## Required Fields

Each item needs `name`, `version`, and `label`.

`label` is converted to the stable plain statement saved in evidence when it is
a string. String labels render basic markdown for `**bold**`, `__bold__`,
`*italic*`, `_italic_`, `[links](https://example.com)`, and `\n` line breaks.
Links always open in a new tab. A React component label still renders as custom
UI; evidence falls back to the consent item `name`.

## Evidence

Evidence is stored in `auth.users.consent.{name}[]`.

The last array entry is current. Core appends only when the boolean value,
configured version, or plain label statement changes.

Always include `value`, `changedAt`, `version`, and `statement`. Add `source`,
`method`, `ip`, and `ua` only through `collect`. There is no default collect
list.

## Completeness

Required consent contributes to `profile.isComplete`. A required item is
complete only when the latest evidence entry is `value: true` and matches the
current configured `version` and `statement`.

Optional stale consent is not an active opt-in until the user saves it again.

## Rules

- Do not put consent data in `auth.users.profile`.
- Do not create app-specific consent tables.
- Do not make legal claims. The app owner reviews legal wording and basis.
- Use `ProfileConsent` for custom onboarding layouts that need the same consent UI.
- Run `npm run qa` after code changes.
