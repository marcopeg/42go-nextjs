---
taskId: ABM
status: archived
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-05-13T16:14:49+02:00
completedAt: 2025-08-13T16:50:12+02:00
compressedAt: 2026-07-29T17:51:33+02:00
compressedFromCommit: 27c91fcf1650c9cb49d27cb7c10a6484fbfe4329
---
# Support Social Login from Different App Configuration

## Historical Summary
This archived record consolidates the task’s retained intent and decisions. 1. **✅ Backend Provider Collection**: Dynamic provider configuration based on AppConfig via 'getProviders()' function 2. **✅ Frontend Provider Filtering**: Login UI dynamically shows only configured providers per app 3. **✅ Type-Safe Configuration**: Complete TypeScript provider system with proper interfaces 4. **✅ Multi-Client Support**: Different apps use different OAuth credentials seamlessly 5. **✅ Build/Type Fixes**: Resolved all NextAuth App Router typing issues 6. **✅ Documentation**: Complete setup guide an

## Retrieval Anchors
- `ABM`
- `docs/backlog/tasks/ABM-support-social-login-from-different-app-configuration-abm`
- `ABM.task.md`
- `getProviders()`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/lib/auth/providers/get-providers.ts`
- `src/lib/auth/providers/types.ts`
- `src/app/(public)/login/page.tsx`
- `src/AppConfig.ts`

## Durable Outcome and Decisions
- The source preserves the task’s scope through these sections: Implementation Status: ✅ **COMPLETE**; Development Plan; Problem Statement; Acceptance Criteria; Final Implementation Summary; Testing; Progress; Development Plan.
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
- [ABJ: Make Each Login Strategy Conditional Based on Environment Variables](../ABJ-make-each-login-strategy-conditional-based-on-environment-variables-abj/ABJ.task.md) — explicitly referenced by the source artifacts.
- [ADD: Implement CLI Scripts](../ADD-implement-cli-scripts/ADD.task.md) — explicitly referenced by the source artifacts.

## Compression Provenance
- Consolidated artifacts: `ABM.task.md`.
- The exact source artifacts are recoverable from `compressedFromCommit` `27c91fcf1650c9cb49d27cb7c10a6484fbfe4329`.
