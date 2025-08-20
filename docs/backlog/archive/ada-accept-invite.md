# Accept Invite [ada]

Complete the Quicklist invite flow so a user can accept an invite and join a project.

## Goals

- Implement API endpoint to accept an invite and add the user as collaborator
- Make the action idempotent (safe to click Join twice)
- Clean up the used invite automatically
- Redirect the user into the project on success

## Acceptance Criteria

- [ ] API: `POST /api/quicklists/:projectId/collabs` exists and requires auth
- [ ] Checks that an invite exists for current user's email and the given `projectId`
- [ ] On success: creates `(project_id, user_id, role='editor')` in `quicklist.collabs`
- [ ] Deletes the corresponding `quicklist.invites` row
- [ ] Idempotent: if already collaborator, returns 200 `{ ok: true }` and deletes invite if present
- [ ] Errors:
  - [ ] 404 `{ error: 'not_found', message: 'invite not found' }` when no invite for user/project
  - [ ] 403 if feature disabled or user lacks access context (standard guard)
  - [ ] 400 for invalid `projectId`
- [ ] Projects page Join button calls this API, shows spinner, handles errors
- [ ] On success, client navigates to `/quicklists/:projectId`

## API Contract

- Method: POST
- URL: `/api/quicklists/:projectId/collabs`
- Auth: required (session)
- Feature: `api:quicklists` (guarded by unified policy where applicable)
- Body: none
- Responses:
  - 200 `{ ok: true, collab?: { project_id, user_id, role } }`
  - 201 may be used for first-time creation (optional); keep 200 for idempotency
  - 404 `{ error: 'not_found', message: 'invite not found' }`
  - 400 `{ error: 'bad_request', message }` for invalid UUID
  - 401/403 via policy/auth guard

## Server Logic

Within a DB transaction:

1. Resolve session user id and normalized email
2. Verify an invite exists: `quicklist.invites (project_id, email)`
3. Upsert collaborator:
   - If not exists: insert into `quicklist.collabs (project_id, user_id, role)` with `role='editor'`
   - If exists: skip insert
4. Delete the invite row
5. Return `{ ok: true, collab }`

Edge cases:

- If invite exists but user already collaborator: treat as success, delete invite, return 200
- If collabs+invites limit (10 total) was enforced on invite creation already; no extra limit needed here
- Cross-app isolation: scope all queries by `app_id` if present elsewhere (projects already scoped)

## UI/UX

- In Projects page, each invite shows a Join button
- On click: disable button, show spinner, call POST `/api/quicklists/:projectId/collabs`
- Success: client-route to `/quicklists/:projectId`
- Failure: show toast with server error message; re-enable button

## Development Plan

1. API route
   - Create `src/app/api/quicklists/[projectId]/collabs/route.ts`
   - Guard with `protectRoute({ require: { feature: 'api:quicklists', auth: true } })` or match existing pattern
   - Implement transaction: check invite → upsert collab → delete invite → return
   - Reuse existing DB helpers and error helpers from quicklist routes
2. Client wiring
   - Update projects list UI to POST on Join and navigate on success
   - Add loading state and error toast
3. QA
   - Seed: ensure an invite exists for a second user (see seeds for quicklist)
   - Verify: first join creates collab + deletes invite; second join is no-op success
   - Verify redirect lands on the project tasks page

## Notes

Assumptions:

- Feature name `api:quicklists` is used like other quicklist APIs
- Redirect path is `/quicklists/:projectId` (existing route)

## Next Steps

execute task (k3)
