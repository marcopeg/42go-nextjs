---
taskId: AAW
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-08-20T11:25:47+02:00
---

# quicklist - projects page [aaw]

Create the QuickList projects page that lists the user's lists (owned + collaborations) with pagination and links to details.

## Context

- Route: `/quicklists` under the `(app)` group (App pages)
- Guarding pattern: Client-only page using `AppLayout` with `policy={{ require: { feature: "page:quicklists" } }}`
  - Session and feature checks happen via the unified client policy component inside `AppLayout`
  - Convention: Everything under `(app)` is client-only and uses `AppLayout` for policy and chrome
- Data source: `GET /api/quicklists` (task [abw])
  - Response: `{ projects: [{ id, title, owned, role, updated_at }], invites: [...], nextCursor? }`
- UI: page-level "New List" primary action (placeholder)

## Goals

- [ ] Scaffold page at `src/app/(app)/quicklists/page.tsx` using `AppLayout`
- [ ] Enforce policy via `AppLayout`'s `policy` prop (client-side guard)
- [ ] Fetch and render projects from `/api/quicklists` client-side (no SSR fetch)
- [ ] Support cursor pagination (Load more)
- [ ] Empty state, loading state, and error state
- [ ] Each project links to its details route `/quicklists/[id]` (stub allowed)

## Acceptance Criteria

- [ ] Page route `/quicklists` renders under the App layout
- [ ] Policy guard enforces 404/401/403 semantics appropriately
- [ ] Renders a list of projects: title, role (owner/editor/viewer), owned flag, updated_at (relative or ISO)
- [ ] "Load more" fetches subsequent pages via nextCursor and appends results
- [ ] Graceful empty state when no projects; invites section optional/non-blocking
- [ ] Each item is a link to `/quicklists/{id}`

## UI/UX Notes

- Primary CTA: "New List" button in page header (no-op or navigates to a placeholder route)
- Keep tab order clean: main content before footer links; avoid focus traps
- Keyboard navigation: list items are full-row links with clear focus ring

## Development Plan

1. Routing & guard

   - Create `src/app/(app)/quicklists/page.tsx`
   - Make it a client component and wrap content in `AppLayout` with `policy={{ require: { feature: "page:quicklists" } }}`
   - Ensure quicklist app config includes `page:quicklists`

2. Data fetch

   - Use a client-side hook to call `GET /api/quicklists?limit=20`
   - Use `useState` and `useEffect` to manage pagination and append results

3. Components

   - List: render cards/rows with title, role badge, owned badge, updated_at
   - Load more button: requests `/api/quicklists?cursor=...` and appends
   - Optional: lightweight invites banner showing count of pending invites

4. States & errors

   - Loading spinner for subsequent pages
   - Error alert with retry
   - Empty placeholder: "No lists yet"

5. Links

   - Each project links to `/quicklists/[id]` (details page may be implemented in a separate task)

6. Accessibility
   - Semantic list markup (ul/li or div[role="list"]) and focus styles
   - Button labels with aria-busy when loading

## Next Steps

execute task (k3)

## Issues Encountered

- SSR fetch to internal API failed (getaddrinfo ENOTFOUND local/quicklist.localhost) when attempting server-side data loading
- Next.js warning about sync dynamic APIs when accessing `searchParams`/`params` on the server in the wrong lifecycle
- Toolbar action `variant` type mismatch (used `primary` instead of valid `default|secondary|...`)
- Footer grabbed focus in tab order after login (unrelated but impacted UX)
- NEXTAUTH_URL warning in dev; and missing theme CSS 404s; both non-blocking

## Solutions Applied

- Switched the `/quicklists` page to a pure client component using `AppLayout` and client policy
- Performed client-side fetch to `/api/quicklists` with pagination via `nextCursor`
- Fixed Toolbar action variant to a valid value and removed an unnecessary eslint-disable
- Neutralized footer focus by setting `aria-hidden` and `tabIndex={-1}`
- Left NEXTAUTH_URL and theme CSS warnings as out-of-scope for this task

## Architectural Decisions

- Convention: All routes under the `(app)` group are client components and must use `AppLayout` for policy and layout chrome
- API calls for app pages happen client-side to avoid SSR host/cookie pitfalls and to unify UX/loading semantics
