# Core Block: Logout

Use `Logout` to render the logout action inline in the profile page.

## Config

```ts
{ type: "Logout" }
```

Optional title:

```ts
{ type: "Logout", title: "Sign out" }
```

## Source

- `src/42go/components/ProfileBlock/blocks/Logout.tsx`
- Type: `TLogoutProfileBlock` in `src/42go/components/ProfileBlock/types.ts`
- Uses `src/42go/auth/components/LogoutAction.tsx`

## Behavior

- Renders a short inline logout panel.
- Uses the app auth logout URL through `LogoutAction`.
- Does not register validation or persistence handlers.

## Agent Notes

- Keep logout out of the profile page top bar when this block is configured.
- The top bar is reserved for `Save preferences`.
- Do not duplicate sign-out logic here unless `LogoutAction` changes.
