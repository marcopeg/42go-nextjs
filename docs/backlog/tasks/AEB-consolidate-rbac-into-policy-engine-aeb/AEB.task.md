---
taskId: AEB
status: archived
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-05-13T16:14:49+02:00
completedAt: 2025-08-14T05:53:48+02:00
compressedAt: 2026-07-29T17:51:33+02:00
compressedFromCommit: 27c91fcf1650c9cb49d27cb7c10a6484fbfe4329
---
# Consolidate RBAC Into Policy Engine

## Historical Summary
This archived record consolidates the task’s retained intent and decisions. Unify all authorization under the generic 'policy' evaluator and delete legacy RBAC client/server wrappers. Eliminate public 'hasGrants', 'hasRoles', 'useGrants', 'ProtectedComponent', 'rbacRoute', and 'checkServerAccess' APIs. Keep grant/role resolution logic internally (private) for the policy engine. No backward compatibility layer needed.

## Retrieval Anchors
- `AEB`
- `docs/backlog/tasks/AEB-consolidate-rbac-into-policy-engine-aeb`
- `AEB.task.md`
- `policy`
- `hasGrants`
- `hasRoles`
- `useGrants`
- `ProtectedComponent`
- `rbacRoute`

## Durable Outcome and Decisions
- The source preserves the task’s scope through these sections: Goals; Acceptance Criteria; Out of Scope; Notes; Next Steps; Progress (Final); Status.
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
- [ADD: Implement CLI Scripts](../ADD-implement-cli-scripts/ADD.task.md) — explicitly referenced by the source artifacts.
- [ADR: RBAC Refactor Policies](../ADR-rbac-refactor-policies-adr/ADR.task.md) — explicitly referenced by the source artifacts.
- [ADT: Unified Policy Engine](../ADT-unified-policy-engine-adt/ADT.task.md) — explicitly referenced by the source artifacts.
- [AEA: Policy & RBAC Testing Strategy](../AEA-policy-rbac-testing-strategy-aea/AEA.task.md) — explicitly referenced by the source artifacts.

## Compression Provenance
- Consolidated artifacts: `AEB.task.md`.
- The exact source artifacts are recoverable from `compressedFromCommit` `27c91fcf1650c9cb49d27cb7c10a6484fbfe4329`.
