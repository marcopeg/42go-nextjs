# Core Block: AccountInfo

Use `AccountInfo` to show session account basics on `/profile`.

## Config

```ts
{ type: "AccountInfo" }
```

Optional title:

```ts
{ type: "AccountInfo", title: "Account" }
```

## Source

- `src/42go/components/ProfileBlock/blocks/AccountInfo.tsx`
- Type: `TAccountInfoProfileBlock` in `src/42go/components/ProfileBlock/types.ts`

## Behavior

- Reads the current session with `useSession()`.
- Shows name, email, and signup date when available.
- Renders missing values gracefully.
- Does not register validation or persistence handlers.

## Agent Notes

- Do not add app-specific profile fields here.
- Do not fetch app APIs from this block.
- If a real signup date is not present in the session, keep the fallback text. Do not invent one.
