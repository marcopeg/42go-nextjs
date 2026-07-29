---
taskId: AEO
status: archived
createdAt: 2026-05-01T15:26:12+00:00
completedAt: 2026-05-02T05:20:15+02:00
compressedAt: 2026-07-29T12:00:00+02:00
compressedFromCommit: 27c91fcf1650c9cb49d27cb7c10a6484fbfe4329
---
# Books list reading indicator and direct reader open

## Historical Summary

Completed LingoCafe books-list change: in-progress cards display a green/white `READING` ribbon and open the reader resume route; other cards keep the details route.

## Retrieval Anchors

- `AEO` — Books list reading indicator and direct reader open.
- `readingAction`, `readingAction.kind === "resume"`, `progress_bps`.
- `src/app/(app)/(lingocafe)/books/_components/` and `src/app/api/(lingocafe)/lingocafe/_lib/reader.ts`.
- Reader fallback: corrupt scroll still opens a valid page; missing page opens book info.

## Durable Outcome and Decisions

The books-list payload includes `readingAction`, avoiding an additional request. Resume state controls both the cover ribbon and direct-open behavior. The existing reader normalization supplies the corrupt-scroll fallback.

## Validation and Limitations

Static inspection and a QA attempt were recorded. `npm run qa` could not complete because the environment failed external font fetch/Turbopack font resolution; no dedicated automated regression test was added.

## Task Relationships

### Supersedes

None identified.

### Superseded by

None identified.

### Related Tasks

None identified.

## Compression Provenance

Consolidated `AEO.task.md`, `AEO.plan.md`, and `AEO.notes.md`. Their exact versions are recoverable from `compressedFromCommit` (`27c91fcf1650c9cb49d27cb7c10a6484fbfe4329`).
