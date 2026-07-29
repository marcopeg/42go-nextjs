---
taskId: AQA
status: archived
createdAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-10-02T10:11:32+02:00
compressedAt: 2026-07-29T12:00:00+02:00
compressedFromCommit: 27c91fcf1650c9cb49d27cb7c10a6484fbfe4329
---
# Fix QuickList reorder API

## Historical Summary

Archived QuickList reorder API fix proposal for persisting drag-and-drop task order atomically.

## Retrieval Anchors

- `AQA` — Fix QuickList reorder API.
- `POST /api/quicklists/[projectId]/reorder`, `{ taskIds: string[] }`.
- `src/app/api/quicklists/[projectId]/reorder/route.ts` and `useQuicklistData.ts`.
- `unnest()` with `WITH ORDINALITY`, `IS DISTINCT FROM`, `handleDragEnd`.

## Durable Outcome and Decisions

The intended database contract accepts the complete ordered ID list and applies positions with one PostgreSQL statement, avoiding per-task updates. Client ordering uses `arrayMove` and refetches on failure.

## Validation and Limitations

The archived artifact is a design/implementation record; it does not provide a retained test result.

## Task Relationships

### Supersedes

None identified.

### Superseded by

None identified.

### Related Tasks

None identified.

## Compression Provenance

Consolidated `AQA.task.md`. Its exact version is recoverable from `compressedFromCommit` (`27c91fcf1650c9cb49d27cb7c10a6484fbfe4329`).
