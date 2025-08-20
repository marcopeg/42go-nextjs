# quicklist - invite collaborator [aba]

Implement the ability to invite collaborators to a QuickList list.

## Context

- Surface: list details page under `(app)` using `AppLayout`
- Convention: client-only UI powered by API calls
- Data/APIs:
  - `GET /api/quicklists/:id/info` to list invites, collabs, details about the list (creation date, last update)
  - `POST /api/quicklists/:id/invites` to create an invite
  - `DELETE /api/quicklists/:id/invites/:inviteId` to revoke an invite
  - `DELETE /api/quicklists/:id/collabs/:inviteId` to revoke a collab
  - Invite acceptance flow (invite -> collab) is handled elsewhere (from the projects list page, out of scope for this story)

## Frontend

Add an "i" icon on the list page `(app)/quicklists/[id]/page.tsx` that links to another page `(app)/quicklists/[id]/info/page.tsx`.

In this page we should show the list of the:

- pending invitations (table: invites)
- active collaborations (table: collabs)

It should be possible to:

- remove an invitation
- remove a collaboration

It should also be possible to add a new invitation row by entering the target email.

UI details for `(app)/quicklists/[id]/info/page.tsx`:

- Panel: "Collaborators"
  - Section: Pending invitations
    - Table columns: email, created_at, created_by, actions (revoke)
  - Section: Active collaborators
    - Table columns: user_id, role, since, actions (remove)
  - New invitation form: email input, submit button
  - Loading: simple spinners (no skeletons)
  - Empty states:
    - no invites, no collabs: "Invite your first collaborator" and show the email form
    - no invities, existing collabs: "Add new collaborator" and show the email form
  - Feedback: toast confirmations; simple inline error on form and refocus input on error
  - Client-only with `fetch('/api/quicklists/:id/...', { credentials: 'same-origin' })`
  - If invites + collabs = max number allowerd (10 for now) then hide the new invite form

## APIs

Backed by data model in `docs/articles/quicklist/DATA_MODEL.md` (tables: `quicklist.projects`, `quicklist.invites`, `quicklist.collabs`).

Routes (scoped by app id in middleware):

- GET `/api/quicklists/:id/info`

  - Returns: full dataset to render invites and collabs: `{ project: { id,title,created_at,updated_at }, invites: Invite[], collabs: Collab[] }`
  - Policy: require auth + feature `api:quicklists` + owner or collaborator access

- POST `/api/quicklists/:id/invites`

  - Body: `{ email: string }`
  - Validations: email format; normalize lowercase; block inviting owner/self; 409 if already invited
  - Limits: max 10 combined invites+collabs per project; reject when over limit
  - Effects: insert into `quicklist.invites`
  - Policy: only owner can invite

- DELETE `/api/quicklists/:id/invites/:email`

  - Effects: delete from `quicklist.invites` (email path param URL-encoded)
  - Policy: only owner can revoke

- DELETE `/api/quicklists/:id/collabs/:userId`
  - Effects: delete from `quicklist.collabs`
  - Policy: owner can remove collaborators; collaborators can remove themselves; cannot remove owner or other collaborators

Notes:

- Invite acceptance flow handled from projects page (out of scope here)
- All endpoints return 404/401/403 according to unified policy evaluator (this is done by the policy, no need to do it again inside the route)

## Goals

- [x] Add UI for inviting collaborators (email input)
- [x] Send invitation via API; handle pending state and errors (basic inline error)
- [x] Manage collaborators (list pending invites, revoke, remove)

## Policies

- Feature flags: `api:quicklists` and `page:quicklists`
- Require auth for all endpoints & page
- Only the owner can invite and revoke invites; owner can remove collaborators
- Collaborators can see collaborators and invites; collaborators can only remove themselves (leave project)

## Edge Cases

- Duplicate invite for same email: 409 Conflict (surface error "user already invited")
- Inviting existing collaborator: 409 Conflict
- Removing non-existent invite/collab: 204 No Content (silent success)
- Email case normalization: lowercase before storing
- Project not found or not accessible: 404
- invited email may not yet exists as a user. in the UI we should show a status of existing user or external invite (someone that should become a user)

## Acceptance Criteria

- [x] Collaborators can be invited (owners only)
- [x] Invitations are visible as pending
- [x] Collaborators can be managed (owner can remove others; collaborator can remove self)
- [x] Limits enforced: max 10 invites+collabs per project
- [x] Sorting: newest by last activity first for both invites & collabs (created_at DESC)
- [ ] Confirmations before revoke/remove (pending)

## Accessibility & i18n

- Keyboard navigation for actions; accessible names on buttons/links
- Label email input; consider `aria-live` for toast container if trivial
- Localization out of scope;

## Performance & Risks

- Avoid N+1: use a single GET `/info` to fetch invites and collabs
- Sorting by last activity: `ORDER BY created_at DESC`
- DB indexes: PKs cover lookups; consider `(project_id, created_at)` composite for sorting if needed
- Multi-tenant scoping enforced server-side via `getAppID()`; frontend unaware
- Response payloads small; no pagination required

## Next Steps

- [ ] Add confirmations before revoke/remove
- [ ] Add toast feedback for success/error
- [ ] Optionally enrich /info with user display names for collabs
- [ ] Optionally mark invites as existing-user vs external
- [ ] Consider simple tests for API routes
- [ ] finalize and close task (k4)

## Development Plan

1. Implement GET /api/quicklists/:id/info to return project, invites, collabs, with auth, app scoping, and ETag freshness.
2. Create client page at /quicklists/[id]/info that fetches and renders the data.
3. Add toolbar link from the main list page to the info page.
4. Implement POST invites and DELETE endpoints for invites and collabs with proper policies and limits.
5. Wire UI actions for invite, revoke, remove with refresh and basic errors.

Status: Steps 1–5 completed.

## Progress

- API
  - GET /api/quicklists/:projectId/info: returns { etag, project { id, title, created_at, updated_at, is_owner }, invites[], collabs[] }; sorted DESC by created_at; ETag from GREATEST of project/tasks/invites/collabs.
  - POST /api/quicklists/:projectId/invites: validates email, lowercases, prevents self/owner/duplicate/collab, enforces limit (invites+collabs < 10), owner-only.
  - DELETE /api/quicklists/:projectId/invites/:email: owner-only revoke; idempotent 204.
  - DELETE /api/quicklists/:projectId/collabs/:userId: owner can remove anyone; collaborators can remove self; 204.
- UI
  - New page /quicklists/[id]/info with two tables: Pending invitations and Active collaborators.
  - Invite form (owner only, hidden at limit >= 10), inline busy state, basic error line.
  - Revoke/Remove actions with busy state; remove gated to owner or self (via next-auth session).
  - Main list page now shows an “Info” action button in toolbar.

## Files Changed

- src/app/api/quicklists/[projectId]/info/route.ts — GET /info payload + freshness/etag + access rules
- src/app/api/quicklists/[projectId]/invites/route.ts — POST invite (validation, limits, owner-only)
- src/app/api/quicklists/[projectId]/invites/[email]/route.ts — DELETE invite (owner-only)
- src/app/api/quicklists/[projectId]/collabs/[userId]/route.ts — DELETE collab (owner or self)
- src/app/(app)/quicklists/[id]/info/page.tsx — UI page to list and manage invites/collabs; invite form
- src/app/(app)/quicklists/[id]/page.tsx — toolbar action linking to info page

## Libraries Used

- next-auth — session-based gating in UI and server
- knex — SQL queries/transactions
- zod — input validation (email)

## Issues Encountered

- Knex count() typing: destructuring count rows required .first() to avoid TS iterator error. Fixed.
- Transient DB EHOSTUNREACH during dev; requests succeed on retry. Likely local env hiccup.
- Client gating: remove button shown to owner or to the same user (session.user.id).

## Architectural Decisions

- Single GET /info endpoint to avoid N+1 and serve the details page in one shot. ETag includes invites/collabs for cache-friendly refresh.
- Strict server-side scoping by app id and access (owner or collab) in WHERE clauses.
- Keep UI client-only; simple inline errors now, toasts/confirmations deferred.

## Notes

- Keep the form and list in the details page as a panel/section
- Respect policy: only owners/editors can invite; enforce via policy in API and conditionally render UI client-side
