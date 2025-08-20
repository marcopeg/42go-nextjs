# quicklist - API: update task (title/position/completed) [acg]

Implement PATCH /api/quicklists/:projectId/:taskId to update task fields and bump project freshness (impacts ETag used by GET project endpoint).

## Context

- Policy: `require { feature: "api:quicklists", session: true }`
- Permissions: owner or collaborator (same ACL as GET by project)
- Partial update supported: `title?`, `position?`, `completed?` (boolean)
- Freshness/ETag: must mirror semantics of GET `/api/quicklists/[projectId]` (see task [acc])

## Goals

- [ ] Validate body (must include at least one of: `title` | `position` | `completed`)
- [ ] Reorder tasks ensuring unique, gapless positions per project (1..N)
- [ ] Toggle completion sets/clears `completed_at` (UTC) and optionally `completed_by`
- [ ] Touch `projects.updated_at = now()` to bump freshness → new ETag
- [ ] Return updated `task` and new `etag`; include `ETag` and `Last-Modified` headers

## Acceptance Criteria

- [ ] 200 OK
  - Body: `{ ok: true, etag: "YYMMDDhhmmss", task: { id, title, position, updated_at, completed_at } }`
  - Headers: `ETag`, `Last-Modified`, `Cache-Control: private, must-revalidate`
- [ ] Errors
  - 400 invalid input (empty body, bad types/ranges, unknown fields)
  - 401 when session missing
  - 403 when not owner/collaborator
  - 404 when task not found or not accessible (no existence leak)
- [ ] After a position change, positions are 1..N with no gaps; moving within same position is a no-op
- [ ] Subsequent GET `/api/quicklists/:projectId?t=<oldEtag>` returns 200 with new `etag`; next poll with that `etag` returns 304

## API Contract

PATCH `/api/quicklists/:projectId/:taskId`

Headers

- `Content-Type: application/json`

Body (any subset)

```json
{
  "title": "string",
  "position": 2,
  "completed": true
}
```

Response 200

```json
{
  "ok": true,
  "etag": "250816123045",
  "task": {
    "id": "uuid",
    "title": "string",
    "position": 2,
    "updated_at": "2025-08-16T12:30:45.000Z",
    "completed_at": null
  }
}
```

## Implementation Notes

- Use `protectRoute` with `{ require: { feature: "api:quicklists", session: true } }`
- Use a transaction for any write; when moving positions, lock involved rows (project and tasks) to avoid races
- Position move algorithm:
  - If `position` provided and different from current:
    - Compute dense positions 1..N within the project
    - Remove the task from its current index and insert at the desired index
    - Shift neighbors accordingly so final positions are contiguous
    - Prefer a single SQL statement (CTE) if feasible; otherwise, two-phase with validation inside tx
- Completion:
  - `completed = true` → set `completed_at = now()`, `completed_by = userId`
  - `completed = false` → set `completed_at = null`, `completed_by = null`
- Always set `tasks.updated_at = now()`
- Touch `projects.updated_at = now()`; recompute ETag with the same function as GET (timestamp to `YYMMDDhhmmss`)
- Include headers: `ETag`, `Last-Modified` (UTC), `Cache-Control: private, must-revalidate`

### Validation

- Body must not be empty; unknown keys rejected
- `title`: string, 1..255
- `position`: integer >= 1
- `completed`: boolean
- 409 reserved for irreconcilable conflicts (should not occur with controlled reindex)

### Security & ACL

- Use `next-auth` to get `userId`
- Ensure the task belongs to `projectId`
- Enforce owner/collaborator; return 404 when not accessible (avoid leaking existence)

### Testing Notes

- Happy paths: title only, completed only, position only, combinations
- Edge cases: move to same index (no-op), move to first/last, single-task project, large N
- ETag changes on each successful update; GET with `?t=<etag>` returns 304 when unchanged

## Client Integration (follow-ups)

- [act] Toggle check/uncheck in UI can optimistically update `completed_at` and refetch on failure
- [acu] Inline title edit in UI can optimistically update `title` and refetch on failure

## Next Steps

- plan task (k2)
  - choose route: `/api/quicklists/[projectId]/[taskId]/route.ts`
  - design SQL (CTE) for atomic reindex + move
  - define zod schema for body + error mapping
  - implement + unit test SQL helpers; smoke test with curl and ETag behavior
