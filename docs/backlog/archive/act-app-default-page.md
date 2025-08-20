# App Default Page [act]

Define an app-specific default page to redirect to after successful login via AppConfig.

Assumption: Use `config.app.defaultPage` (string) as the setting. Fallback to "/dashboard" when missing.

## Current Behavior: Why it lands on "/dashboard" now

Post-login redirect to "/dashboard" is hardcoded inside the login strategy components. There is no app-config based default today.

- Credentials login

  - File: `src/42go/auth/components/login-strategies/CredentialsLogin.tsx`
  - Behavior: passes `callbackUrl: "/dashboard"` to `signIn("credentials", …)` and, on success with `redirect: false`, performs `window.location.href = "/dashboard"`.

- GitHub login

  - File: `src/42go/auth/components/login-strategies/GitHubLogin.tsx`
  - Behavior: calls `signIn("github", { callbackUrl: "/dashboard" })`.

- Google login
  - File: `src/42go/auth/components/login-strategies/GoogleLogin.tsx`
  - Behavior: calls `signIn("google", { callbackUrl: "/dashboard" })`.

Notes:

- NextAuth `getAuthOptions()` (`src/42go/auth/lib/authOptions.ts`) defines custom pages (e.g., `signIn: "/login"`) but does not override callbacks to change post-login destination; the redirect target comes from the above `callbackUrl` and manual `window.location.href`.
- Some AppConfig menus link to "/dashboard" (e.g., `src/config/default/config.ts`, `src/config/quicklist/config.ts`), but those do not affect post-login redirect behavior.

## Goals

- Add optional `config.app.defaultPage?: string` to AppConfig type.
- Use this setting for all login flows (Credentials, GitHub, Google) to set `callbackUrl` and post-login redirect.
- Preserve secure behavior: only allow internal paths; default to "/dashboard".
- Update default app configs with an explicit value where appropriate.
- Minimal docs note in FEATURES or AUTH docs about the new setting.

## Acceptance Criteria

- [ ] AppConfig type exposes `app.defaultPage?: string` without breaking existing configs.
- [ ] Login flows use the configured page when present; otherwise use "/dashboard".
- [ ] Credentials flow redirects to the configured page both via `callbackUrl` and on `result.ok`.
- [ ] Social logins (GitHub/Google) pass the configured `callbackUrl`.
- [ ] Credentials flow uses SPA navigation (no full reload): `useRouter().replace(callbackUrl)` + `router.refresh()` instead of `window.location`.
- [ ] Guard against open redirects (reject absolute/external URLs; only accept root-relative paths).
- [ ] Smoke-tested with at least two apps having different values.
- [ ] Short docs snippet added referencing the setting and default.

## Development Plan (server computes, clients consume)

1. Types

   - Update `src/AppConfig.ts` interface `TAppConfigItem` to add:
     - `app?: { default?: { page?: string }; menu?: { ...existing } }`
     - Keep `menu` intact; add `default` as optional container to avoid cluttering `app`.

2. Read Config and Compute Redirect on Server

   - In `src/app/(public)/login/page.tsx` (server component), after `const appConfig = await getAppConfig();` compute:
     - `const defaultPage = safeInternalPath(appConfig?.app?.default?.page) ?? "/dashboard";`
   - Pass `defaultPage` down as `callbackUrl` prop to each rendered strategy component (GitHubLogin, GoogleLogin, CredentialsLogin).

3. Client Strategy Components (no server APIs inside)

   - Extend props for `CredentialsLogin`, `GitHubLogin`, `GoogleLogin` with `callbackUrl: string` (required, provided by server page).
   - Remove hardcoded "/dashboard" usage inside components; always use the provided prop for:
     - `signIn(provider, { callbackUrl })`
     - Credentials success path (with `redirect: false`): use `useRouter()` from `next/navigation` to perform SPA navigation:
       - `router.replace(callbackUrl)` then `router.refresh()` to rehydrate session-aware UI.
     - Avoid `window.location.href` to prevent full page reload.
   - Do not call `getAppConfig()` in these client components; optional: avoid `useAppConfig()` to prevent hydration races.

4. Safety

   - Implement `safeInternalPath(input?: string): string | null` utility (server-only or colocated in login page) to validate the configured path:
     - Accept only root-relative paths starting with `/`.
     - Reject any string containing `://` or `\\`.
     - Normalize multiple slashes; return null when invalid.
   - Fallback to "/dashboard" when invalid or missing.

5. UX Polish (optional)

- Prefetch the target route on focus/hover for snappier navigation.
- Support a validated `next` query param on the login page to honor deep-links, still passing a sanitized value as `callbackUrl`.

5. Configs

   - Optionally set explicit defaults in `src/config/*/config.ts` (e.g., default, quicklist) to demonstrate the feature.

6. Docs
   - Add a brief note in `docs/articles/FEATURE_FLAGS.md` or a short blurb in `docs/articles/APP_CONFIG.md` about `app.defaultPage` and its default.

## Notes / Edge Cases

- If `app.defaultPage` points to a protected page and user lacks access, unified policy engine will handle 401/403/404 appropriately.
- If the path does not exist, user will hit 404; acceptable per setting semantics.
- For future: consider exposing default page on the client via context for menu links; out of scope here.

## Progress

Implemented server-computed callbackUrl and SPA navigation for credentials:

Files changed:

- src/AppConfig.ts: added `app.default.page?: string` type.
- src/app/(public)/login/page.tsx: compute safe `callbackUrl` from app config and pass to strategies; added dev-only marker for debug.
- src/42go/auth/components/login-strategies/CredentialsLogin.tsx: use `redirect: false` + `router.replace(callbackUrl)` + `router.refresh()`.
- src/42go/auth/components/login-strategies/GitHubLogin.tsx: accept `callbackUrl` prop and pass to `signIn`.
- src/42go/auth/components/login-strategies/GoogleLogin.tsx: accept `callbackUrl` prop and pass to `signIn`.

Safety:

- `safeInternalPath` ensures only root-relative paths without protocols/backslashes.

Verification:

- Lint/Typecheck: PASS
- Build: PASS (`npm run qa`)

## Acceptance Criteria

- [x] AppConfig type exposes `app.defaultPage?: string` without breaking existing configs. (implemented as `app.default.page?: string`)
- [x] Login flows use the configured page when present; otherwise use "/dashboard".
- [x] Credentials flow redirects to the configured page both via `callbackUrl` and on success.
- [x] Social logins (GitHub/Google) pass the configured `callbackUrl`.
- [x] Credentials flow uses SPA navigation: `useRouter().replace(callbackUrl)` + `router.refresh()`.
- [x] Guard against open redirects.
- [ ] Smoke-tested with at least two apps having different values. (manual verification needed; middleware host matching must resolve correct app)
- [ ] Short docs snippet added referencing the setting and default.

## Next Steps

- Finish smoke tests per app host (verify x-mw-appid and callbackUrl dev marker on /login).
- Add a short docs note in APP_CONFIG.md about `app.default.page`.
