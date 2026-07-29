---
taskId: AEH
status: archived
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-05-13T16:14:49+02:00
completedAt: 2025-08-14T05:53:48+02:00
compressedAt: 2026-07-29T17:51:33+02:00
compressedFromCommit: 27c91fcf1650c9cb49d27cb7c10a6484fbfe4329
---
# Remove Wildcard Grant Support

## Historical Summary
This archived record consolidates the task’s retained intent and decisions. Simplify grant evaluation to strict literal matching only; delete any pattern / regex code, tests, docs references; treat '*' as an ordinary character with no warnings.

## Retrieval Anchors
- `AEH`
- `docs/backlog/tasks/AEH-remove-wildcard-grant-support-aeh`
- `AEH.task.md`
- `matchesWildcard`
- `wildcard`
- `patternGrant`
- `src/`
- `adt`
- `matchesPattern`

## Durable Outcome and Decisions
- The source preserves the task’s scope through these sections: Goals; Non-Goals; Acceptance Criteria; Progress; Out of Scope; Implementation Sketch; Current Wildcard Logic Inventory; Detailed Removal Plan.
- Completion language appears in the source, but no implementation commit is recorded there.
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
- [ACR: quicklist - API: delete project](../ACR-quicklist-api-delete-project-acr/ACR.task.md) — explicitly referenced by the source artifacts.
- [ADD: Implement CLI Scripts](../ADD-implement-cli-scripts/ADD.task.md) — explicitly referenced by the source artifacts.
- [ADD: Implement CLI Scripts](../ADD-implement-cli-scripts/ADD.task.md) — explicitly referenced by the source artifacts.
- [ADT: Unified Policy Engine](../ADT-unified-policy-engine-adt/ADT.task.md) — explicitly referenced by the source artifacts.
- [AEF: Design anyPolicy OR Helper](../AEF-design-anypolicy-or-helper-aef/AEF.task.md) — explicitly referenced by the source artifacts.
- [AEG: Unified Policy Engine Tests Implementation](../AEG-unified-policy-engine-tests-implementation-aeg/AEG.task.md) — explicitly referenced by the source artifacts.

## Compression Provenance
- Consolidated artifacts: `AEH.task.md`.
- The exact source artifacts are recoverable from `compressedFromCommit` `27c91fcf1650c9cb49d27cb7c10a6484fbfe4329`.
