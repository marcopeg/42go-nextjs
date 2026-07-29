---
taskId: ACG
status: archived
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-05-13T16:14:49+02:00
completedAt: 2025-08-20T11:25:47+02:00
compressedAt: 2026-07-29T17:51:33+02:00
compressedFromCommit: 27c91fcf1650c9cb49d27cb7c10a6484fbfe4329
---
# quicklist - API: update task (title/position/completed)

## Historical Summary
This archived record consolidates the task’s retained intent and decisions. Implement PATCH /api/quicklists/:projectId/:taskId to update task fields and bump project freshness (impacts ETag used by GET project endpoint).

## Retrieval Anchors
- `ACG`
- `docs/backlog/tasks/ACG-quicklist-api-update-task-title-position-completed-acg`
- `ACG.task.md`
- `require { feature: "api:quicklists", session: true }`
- `title?`
- `position?`
- `completed?`
- `/api/quicklists/[projectId]`
- `title`

## Durable Outcome and Decisions
- The source preserves the task’s scope through these sections: Context; Goals; Acceptance Criteria; API Contract; Implementation Notes; Client Integration (follow-ups); Next Steps.
- The source does not identify an implementation commit or independently prove a shipped change.
- Exact historical wording, examples, and planning detail remain recoverable from the provenance commit.

## Validation and Limitations
- Source status is `archived`; lifecycle timestamps were retained without inferring behavior not evidenced by the artifacts.
- This record is a retrieval-oriented historical summary, not a substitute for comparing implementation history when delivery must be established.

## Task Relationships
### Supersedes
None identified.

### Superseded by
None identified.

### Related Tasks
- [ACC: quicklist — API: get project with tasks (conditional)](../ACC-quicklist-api-get-project-with-tasks-conditional-acc/ACC.task.md) — explicitly referenced by the source artifacts.
- [ACL: Simplify Boot](../ACL-simplify-boot-acl/ACL.task.md) — explicitly referenced by the source artifacts.
- [ACT: quicklist - support check/uncheck task in UI](../ACT-quicklist-support-check-uncheck-task-in-ui-act/ACT.task.md) — explicitly referenced by the source artifacts.
- [ACU: quicklist - support edit task title in task list UI](../ACU-quicklist-support-edit-task-title-in-task-list-ui-acu/ACU.task.md) — explicitly referenced by the source artifacts.

## Compression Provenance
- Consolidated artifacts: `ACG.task.md`.
- The exact source artifacts are recoverable from `compressedFromCommit` `27c91fcf1650c9cb49d27cb7c10a6484fbfe4329`.
