---
sessionId: "2607201029"
sessionSlug: "general-42go-next-js-vibe-coding-session"
goal: "General 42Go Next.js vibe coding session"
status: "closed"
createdAt: "2026-07-20T10:29:10+02:00"
updatedAt: "2026-07-20T10:51:12+02:00"
sourceSession: "./session.md"
---
# Session Memory — General 42Go Next.js vibe coding session

## Goal

General 42Go Next.js vibe coding session

## Stable Context

- 42Go Next resolves independent app configurations per request through `src/proxy.ts` and `src/AppConfig.ts`; LingoCafe is one registered app.
- Protected app routes are client components wrapped by `AppLayout`, using browser-side same-origin fetching. Server-side policy checks remain the authorization boundary.
- The workspace uses Next.js 16, React 19, TypeScript, PostgreSQL/Knex, NextAuth, and Tailwind 4 with shadcn/Radix UI.

## Decisions

- None yet.

## Architecture Notes

- QuickList declares a base PWA identity for `/quicklists` and a dynamic per-project install target for `/quicklists/:projectId/**` in `src/config/quicklist/config.ts`.
- `ManifestLink` reloads the document when a client-side route transition changes manifest identity. Therefore `/quicklists` ↔ `/quicklists/:projectId` intentionally triggers `window.location.reload()`, producing the reported flash.
- The reload is required only to preserve the current design of independently installable, per-list PWAs. It is not required for normal QuickList navigation or list functionality. A single base QuickList PWA would keep navigation client-side and smooth.
- A SPA may update ordinary presentation metadata (for example title and theme-color), but it cannot reliably change to a manifest with a different PWA `id` in the same document. The current Manifest specification rejects that replacement once a document has processed a different manifest identity; keep per-list installation as an explicit document-level install flow if needed.
- Proposed architecture: preserve the initially rendered manifest throughout normal SPA navigation; use a deliberate hard navigation to a list-specific installer document, where the server renders the authorized target manifest and the user triggers installation. An installed list launches at its existing list-specific start URL and then keeps that target identity while navigating client-side.

## Working Agreements

- Keep working exploration in `session.md`; promote stable conclusions into this file as they are established.
- Do not implement product work until a concrete session outcome is requested.

## Open Questions

- What concrete outcome should this session address?
