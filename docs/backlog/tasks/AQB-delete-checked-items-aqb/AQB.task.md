---
taskId: AQB
status: archived
createdAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-10-02T14:42:31+02:00
compressedAt: 2026-07-29T12:00:00+02:00
compressedFromCommit: 27c91fcf1650c9cb49d27cb7c10a6484fbfe4329
---
# Delete checked items

## Historical Summary

Archived QuickList enhancement for deleting all completed tasks from a list.

## Retrieval Anchors

- `AQB` — Delete checked items.
- `POST /api/quicklists/:projectId/drop-completed`, `drop-completed`.
- `TasksList`, `handleDropCompleted`, `aria-label="Drop completed tasks"`.
- `quicklist.tasks`, `FOR UPDATE`, `invalidateProjectCache(projectId, { droppedCompleted: true })`.

## Durable Outcome and Decisions

The action is shown only when completed tasks exist, confirms before deleting, removes completed rows in a transaction, and refreshes data if the optimistic client update fails.

## Validation and Limitations

The source is an archived specification; no durable test-result artifact was retained.

## Task Relationships

### Supersedes

None identified.

### Superseded by

None identified.

### Related Tasks

None identified.

## Compression Provenance

Consolidated `AQB.task.md`. Its exact version is recoverable from `compressedFromCommit` (`27c91fcf1650c9cb49d27cb7c10a6484fbfe4329`).
