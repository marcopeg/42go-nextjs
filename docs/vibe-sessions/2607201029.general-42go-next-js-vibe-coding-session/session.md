---
sessionId: "2607201029"
sessionSlug: "general-42go-next-js-vibe-coding-session"
goal: "General 42Go Next.js vibe coding session"
status: "closed"
startedAt: "2026-07-20T10:29:10+02:00"
updatedAt: "2026-07-20T10:51:12+02:00"
memoryFile: "./memory.md"
---
# Vibe Session — General 42Go Next.js vibe coding session

## Goal

General 42Go Next.js vibe coding session

## Context Digest

### Project snapshot

- 42Go Next is a multi-tenant Next.js 16 / React 19 / TypeScript application. PostgreSQL access uses Knex; UI uses Tailwind 4 and shadcn/Radix primitives; NextAuth provides credentials and OAuth authentication.
- The request proxy (`src/proxy.ts`) resolves the app from trusted request data and forwards an internal App ID header. `src/AppConfig.ts` registers independent app configurations, including LingoCafe.
- Runtime routes are split between public pages and protected app pages. Protected pages follow the client-component plus `AppLayout` convention and fetch data in the browser with same-origin credentials.

### Backlog and prior decisions

- There is no WIP or planned task. The active refinement item is NJ02: external TTS audio with timing and native media controls.
- Draft work includes LingoCafe book filtering (BL01), reader caching (IJ10), marking books read (XC01), a remote-image strategy (XQ11), and platform work such as app-config separation (QW92).
- UT41 (ESLint 9 to 10) is blocked because the current Next plugin chain is not compatible. Do not force local shims without an explicit decision.
- Durable architecture docs establish configuration-driven multi-app resolution, unified feature/RBAC policies, client-only protected app pages, and server-side authorization as the security boundary.

### Code areas of interest

- `src/AppConfig.ts` and `src/config/*/config.ts` — per-app configuration.
- `src/proxy.ts` and `src/42go/` — request resolution and reusable platform layers.
- `src/app/(app)/(lingocafe)/books/` and `src/config/lingocafe/` — LingoCafe reader and app-facing configuration.
- `docs/articles/` and `docs/lingocafe/BOOKS_DATA_MODEL.md` — implementation guides and LingoCafe data model context.

### Constraints and open direction

- Follow project conventions: arrow functions, explicit exports where possible, `@/` imports, server-side input validation, and `npm run qa` after product-code changes.
- This kickoff authorizes session tracking only. No product implementation or verification has been performed.
- The session goal is intentionally generic; select a concrete outcome before deeper investigation.

## Durable Documentation Targets

- Promote stable findings into the paired `memory.md` during the session.
- Promote broader repo knowledge into the relevant permanent docs under `docs/`.

## Log

<!-- Timestamped working notes are appended here. -->

- 2026-07-20 10:29 CEST — Created session workspace and completed orientation scan. No product files changed.

### 2026-07-20 10:34 — QuickList navigation investigation

The QL42Go tunnel is reachable but the browser session is unauthenticated, so live list navigation still needs an authorized test login. Source inspection found that QuickList declares a per-list dynamic PWA install target and the shared ManifestLink intentionally calls window.location.reload() when client navigation crosses manifest identities. This exactly covers /quicklists to /quicklists/:projectId and the reverse direction.

### 2026-07-20 10:34 — QuickList PWA navigation behavior

Promoted stable context into `docs/vibe-sessions/2607201029.general-42go-next-js-vibe-coding-session/memory.md`. Promoted the verified cause of the QuickList index-to-project reload: crossing its base and per-project PWA manifest identities intentionally reloads the document.

### 2026-07-20 10:38 — QuickList PWA trade-off

Promoted stable context into `docs/vibe-sessions/2607201029.general-42go-next-js-vibe-coding-session/memory.md`. Promoted the product decision boundary: document reloads are only necessary for independently installable per-list PWA identities, not for normal QuickList navigation; a single base PWA removes the flicker.

### 2026-07-20 10:41 — PWA manifest identity boundary

Promoted stable context into `docs/vibe-sessions/2607201029.general-42go-next-js-vibe-coding-session/memory.md`. Promoted the standards constraint: a document can update normal presentation metadata, but a new manifest with a different PWA ID is rejected after the first manifest is processed; separate list installation requires a document-level boundary.

### 2026-07-20 10:46 — QuickList installer-flow design

Promoted stable context into `docs/vibe-sessions/2607201029.general-42go-next-js-vibe-coding-session/memory.md`. Promoted the proposed UX architecture: freeze the initial manifest over SPA navigation and use a deliberate list-specific installer document for the one hard navigation before explicit user installation.

### 2026-07-20 10:51 — Session closed

Investigated and documented the QuickList navigation flicker. Confirmed it comes from intentional PWA manifest-identity reloads, captured the explicit installer-document redesign, and drafted FK40 to implement it. No product code was changed.
