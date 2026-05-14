---
sessionId: "2605142032"
sessionSlug: "prepare-a-documented-vibe-coding-session-for-42go-next-multi"
goal: "Prepare a documented vibe coding session for 42Go Next Multi"
status: "active"
createdAt: "2026-05-14T20:32:42+02:00"
updatedAt: "2026-05-14T20:39:31+02:00"
sourceSession: "./session.md"
---
# Session Memory — Prepare a documented vibe coding session for 42Go Next Multi

## Goal

Prepare a documented vibe coding session for 42Go Next Multi

## Stable Context

- Request-scoped app resolution is the central architecture: `src/proxy.ts` resolves the app ID and forwards it through the internal app ID header for config consumers.
- Apps are registered in `src/AppConfig.ts`; concrete app config lives under `src/config/<app>/config.ts`.
- The repo is PostgreSQL-only, using Knex migrations/seeds and the shared `getDB()` singleton.
- Authenticated app pages under `(app)` are client-only pages wrapped in `AppLayout`; browser fetches should use same-origin credentials.
- LingoCafe visual verification should default to `https://lc42go.ngrok.app/` with `john` / `john` unless a task overrides it.

## Decisions

- LingoCafe `targetLevel` is optional profile data. `ownLang` and `targetLang` remain required for profile completeness.
- LingoCafe onboarding no longer asks for `ownLang`; it derives the value from the browser language and includes it in the profile save payload.
- Supported LingoCafe level options are now `zero`, `a1`, `a2`, `b1`, `b2`, and `expert`.

## Architecture Notes

- None yet.

## Working Agreements

- Promote durable conclusions into this file during the session as soon as they become stable.
- Keep temporary exploration and blow-by-blow notes in `session.md`.
- Do not use vibe-start as permission to modify product code.

## Open Questions

- What concrete task, backlog item, or product goal should this vibe session focus on?
