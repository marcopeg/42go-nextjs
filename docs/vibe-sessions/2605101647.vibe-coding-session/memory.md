---
sessionId: "2605101647"
sessionSlug: "vibe-coding-session"
goal: "Vibe coding session"
status: "active"
createdAt: "2026-05-10T16:47:15+02:00"
updatedAt: "2026-05-10T17:15:34+02:00"
sourceSession: "./session.md"
---
# Session Memory — Vibe coding session

## Goal

Vibe coding session

## Stable Context

- Project is a multi-app Next.js SaaS codebase where request app resolution feeds AppConfig-driven behavior across routes, auth, feature policy, layouts, profile, consent, docs, icons, themes, and PWA metadata.
- Runtime app resolution currently lives in `src/proxy.ts`; older references may still call it middleware.
- The active backlog root for this repository is `docs/backlog`.
- Current backlog kickoff state: no WIP and no blocked items.
- LingoCafe is configured in `src/config/lingocafe/config.ts`, matches `read.lingocafe.app` and `lc42go.ngrok.app`, enables `page:books`, `api:lingocafe`, and `api:profile`, and defaults authenticated users to `/books`.

## Decisions

- Fixed session RBAC app resolution in `src/42go/auth/lib/callbacks.ts`: JWT role/grant loading now accepts a known app ID from the sign-in user or session refresh payload, then falls back to request app resolution and finally `default`.
- Hardened credentials auth in `src/42go/auth/lib/providers/get-providers.ts`: `authorize(credentials, req)` now resolves the app ID from the actual NextAuth request headers before querying `auth.users`.

## Architecture Notes

- App pages under `src/app/(app)` should be client components wrapped in `AppLayout`; data fetching should happen browser-side.
- Shared platform code belongs under `src/42go`; app-specific LingoCafe code is under `src/config/lingocafe`, `src/app/(app)/(lingocafe)`, and `src/app/api/(lingocafe)/lingocafe`.
- RBAC data is sourced two ways: server policy checks query `auth.roles_users` and `auth.roles_grants` through `src/42go/policy/access/index.ts` using the current request app ID, while client UI policy checks and the `TestRBAC` profile block read the cached NextAuth session fields `session.user.roles`, `session.user.grants`, and `session.user.appId`.
- Fixed RBAC session bug: `src/42go/auth/lib/callbacks.ts` previously hard-coded `token.appId = "default"` on initial JWT creation, and refresh reused `token.appId`, so LingoCafe session RBAC could stay pinned to `default` even when the authenticated user belonged to `lingocafe`.
- `TestRBAC` now sends the current page app ID from `useAppID()` when refreshing the session so stale tokens can be repointed to the page's resolved app context.
- Diagnostic result: port 3000 continued returning `appId: default` after source changes, but a fresh server on port 3001 with the same code returned `appId: lingocafe`, `roles: ["backoffice"]`, and `grants: ["users:list"]`; stale auth route modules can survive until the running app process is restarted.

## Working Agreements

- Promote stable findings into this `memory.md` during the session, not only at the end.
- Keep temporary exploration and play-by-play in `session.md`.

## Open Questions

- What concrete goal should this vibe session pursue first?
