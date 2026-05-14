---
sessionId: "2605142032"
sessionSlug: "prepare-a-documented-vibe-coding-session-for-42go-next-multi"
goal: "Prepare a documented vibe coding session for 42Go Next Multi"
status: "active"
startedAt: "2026-05-14T20:32:42+02:00"
updatedAt: "2026-05-14T20:39:31+02:00"
memoryFile: "./memory.md"
---
# Vibe Session — Prepare a documented vibe coding session for 42Go Next Multi

## Goal

Prepare a documented vibe coding session for 42Go Next Multi

## Context Digest

### Project Summary

42Go Next Multi is a Next.js multi-app SaaS boilerplate. Each request resolves an app ID through `src/proxy.ts`, then downstream configuration comes from `src/AppConfig.ts` and `src/config/<app>/config.ts`.

The current repo has a concrete LingoCafe app alongside default, app1, app2, calendar, quicklist, and notes configurations.

### Tech Stack

- Next.js 16.2.6, React 19.2.5, TypeScript 6.
- Tailwind CSS 4.2, shadcn/Radix primitives, lucide-react.
- NextAuth 4.24 with credentials, GitHub, and Google provider support.
- PostgreSQL-only persistence through Knex migrations and the shared `getDB()` singleton.
- Docker/Makefile workflows for local database, app startup, production build, deploy, and security checks.

### Backlog Orientation

- No WIP or blocked backlog entries are currently listed.
- Active drafts cluster around content blocks, AppConfig cleanup, auth provider expansion, RBAC/policy improvements, LingoCafe reader UX, local E2E tooling, and Docker hardening.
- Recent completed work includes profile and consent storage, profile theme handling, reusable overlays, LingoCafe reader polish, event export/logging infrastructure, AppConfig secret audit, Docker security review, and database backup/restore.
- Archived history shows major platform foundations already landed: public/app layouts, unified policy engine, feature flags, RBAC, dynamic pages, app icons/themes, auth, QuickList, and LingoCafe book/reader features.

### Relevant Permanent Docs

- `docs/memory-bank/ARCHITECTURE.md`: request-scoped multi-tenancy, AppConfig, policy, app-page client-only convention, PostgreSQL-only database, Makefile workflow.
- `docs/memory-bank/FEATURES.md`: multi-app configuration, profile blocks, icon/theme registries, ContentBlock/DynamicPage, auth, policy, deployment.
- `docs/memory-bank/DEPENDENCIES.md`: dependency update playbook and risk model.
- `docs/articles/APP_CONFIG.md`: app matching and app icon/theme conventions.
- `docs/articles/POLICY.md`: unified policy semantics, exact grants, server/client RBAC source model.
- `docs/articles/DATABASE.md`: `DATABASE_URL`, `PGPOOL`, migrations, `getDB()`.
- `docs/articles/PROFILE_PAGE.md`: profile blocks, central profile save flow, AJV schema, consent evidence.

### Code Areas Of Interest

- App resolution: `src/proxy.ts`, `src/42go/config/app-config.ts`, `src/42go/lib/app-id/*`.
- App registry/configs: `src/AppConfig.ts`, `src/config/*/config.ts`, especially `src/config/lingocafe/*`.
- Policy/RBAC: `src/42go/policy/*`, `src/42go/policy/access/*`, `src/app/api/rbac/check/route.ts`.
- Auth/session: `src/app/api/auth/[...nextauth]/route.ts`, `src/42go/auth/*`.
- App shell: `src/42go/layouts/app/*`, `src/app/(app)/*`.
- Public pages/content: `src/42go/components/ContentBlock`, `src/42go/components/DynamicPage`, `src/app/(public)/*`.
- Profile/consent: `src/42go/profile/*`, `src/42go/components/ProfileBlock/*`, `src/app/api/profile/route.ts`.
- Events: `src/42go/events/*`, `src/app/api/events/route.ts`.
- Database: `knex/migrations/*`, `knex/seeds/*`.

### Constraints And Working Agreements

- Use `make app.start`; do not run `npm dev` directly.
- Run `npm run qa` after code changes.
- Authenticated app pages under `(app)` must be client components and use `AppLayout`.
- Use absolute imports via `@/`.
- Prefer arrow functions and explicit exports.
- Visual checks for LingoCafe should use `https://lc42go.ngrok.app/` with `john` / `john` unless a task says otherwise.
- Stable conclusions should be promoted into `memory.md` during the session, not saved for the end like a weak punch.

### Open Questions

- The session was started without a specific product goal. The next step is to name the concrete task or backlog item this vibe session should attack.

## Durable Documentation Targets

- Promote stable findings into the paired `memory.md` during the session.
- Promote broader repo knowledge into the relevant permanent docs under `docs/`.

## Log

<!-- Timestamped working notes are appended here. -->

- 2026-05-14 20:36 +02:00: Created session workspace and loaded project orientation from memory bank, backlog indexes, top-level docs, selected articles, package metadata, AppConfig, proxy, Makefile, and structural file listings. No product files changed.

### 2026-05-14 20:39 — LingoCafe profile onboarding update

Implemented optional targetLevel, expanded LingoCafe level options to zero/a1/a2/b1/b2/expert, hid ownLang from onboarding, and sent a browser-language-derived ownLang in the profile save payload. Validation passed with npm run qa and git diff --check.

### 2026-05-14 20:39 — Promote LingoCafe profile decisions

Promoted stable context into `docs/vibe-sessions/2605142032.prepare-a-documented-vibe-coding-session-for-42go-next-multi/memory.md`. Recorded that targetLevel is optional, onboarding derives ownLang from browser language, and level options are zero/a1/a2/b1/b2/expert.
