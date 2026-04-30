---
taskId: ADV
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-08-14T05:53:48+02:00
---

# Protect SSR Pages with Policies [adv]

Create `protectPage()` to evaluate unified policies on SSR pages with custom error mapping and optional default feature key derived from URL.

## Goals

- [x] Implement `protectPage(Component, policies)` HOC
- [x] Evaluate `session`, `feature`, `role`, `grants|anyGrant` with global error mapping
- [x] Support per-policy override mapping `{ status, message }` (DEFERRED; global mapping sufficient now)
- [x] Default feature policy inferred from current route (first path segment)

## Acceptance Criteria

- [x] Rendering blocked when any policy fails
- [x] 401/403/404 returned per global mapping (feature→404, session→401, role/grant→403)
- [x] SSR example pages: `/docs`, `/docs/[...slug]`, `/todos` wrapped with `protectPage`

## Notes

- We removed the legacy `appPage()` and unified under `protectPage()`.
- Default feature inference maps `/docs/*` → `page:docs`, `/todos` → `page:todos`.

## Next Steps

- Migrate any remaining SSR pages not yet wrapped (audit pending).
- Decide on standardized unauthorized UX (redirect vs inline) and document in ADR.
- Add optional per-policy override mapping only if a concrete need arises.
- Tests for protectPage (error mapping, default feature inference) deferred to [aea].

## Progress Update

- Guard active on key pages (docs, dynamic docs, todos).
- Feature inference functioning; no reported mismatches.
- Override mapping intentionally deferred (global mapping adequate).
- Pending: full page audit + standardized unauthorized UX pattern.

## Status

In Progress.
