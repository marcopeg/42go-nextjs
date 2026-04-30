---
taskId: ADB
status: ready
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
---

# Reject Invite [adb]

Decline a project invite from the Projects page. No mercy for unwanted collaborations.

## Goals

- Let invited users reject an invite themselves
- Keep it simple: remove the invite row; no schema change for now
- Good UX: confirm dialog with optional note, toast on error

## Acceptance Criteria

- [ ] API exists: `POST /api/quicklists/:projectId/invites/reject` (auth required)
- [ ] Uses session email; no email in URL
- [ ] On success: deletes `quicklist.invites (project_id, email)` for current user
- [ ] Idempotent: if invite already gone → 404 `{ error: 'not_found', message: 'invite not found' }`
- [ ] Optional `note` in body accepted and sanitized, but not persisted (defer audit trail)
- [ ] Projects page: Reject button opens confirm modal with textarea; after success, remove the invite from UI; hide section if empty
- [ ] Errors surfaced with toast

## API Contract

- Method: POST
- URL: `/api/quicklists/:projectId/invites/reject`
- Auth: required (session)
- Feature: `api:quicklists`
- Body: `{ note?: string }` (optional; max length 500; sanitized)
- Responses:
  - 200 `{ ok: true }`
  - 404 `{ error: 'not_found', message: 'invite not found' }`
  - 400 `{ error: 'bad_request', message }` for invalid UUID
  - 401/403 via policy/auth guard

## Server Logic

1. Resolve session user id + email (normalize lowercase)
2. Validate `projectId` (uuid)
3. Transaction:
   - Delete from `quicklist.invites` where (project_id, lower(email)=sessionEmail)
   - If none deleted → 404
   - Update `quicklist.projects.updated_at/updated_by`
4. Return `{ ok: true }`

Notes:

- We skip adding `rejected`/`reject_note` columns to avoid migration churn now. If audit trail is needed later, add a proper migration + events table.

## UI/UX

- Projects page invite item → Reject button
- Confirm modal with optional note (textarea, 500 chars)
- Spinner during request; on success remove invite from list; if list empty, hide section
- On error, toast with server message

## Development Plan

1. API route
   - Create `src/app/api/quicklists/[projectId]/invites/reject/route.ts`
   - Guard with `protectRoute({ require: { feature: 'api:quicklists', session: true } })`
   - Implement transaction delete by session email; 404 if not found; update project timestamps
2. Client wiring
   - Projects page: hook up Reject button to POST endpoint
   - Confirm modal with textarea; sanitize input client-side (trim, length cap)
   - Update local state to remove invite on success
3. QA
   - Seed: ensure pending invite for session user
   - Verify: reject removes invite; section hides when empty; idempotent error path shows toast

## Next Steps

execute task (k3)
