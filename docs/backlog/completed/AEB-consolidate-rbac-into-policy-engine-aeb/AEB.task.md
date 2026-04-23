---
taskId: AEB
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-08-14T05:53:48+02:00
---

# Consolidate RBAC Into Policy Engine [aeb]

Unify all authorization under the generic `policy` evaluator and delete legacy RBAC client/server wrappers. Eliminate public `hasGrants`, `hasRoles`, `useGrants`, `ProtectedComponent`, `rbacRoute`, and `checkServerAccess` APIs. Keep grant/role resolution logic internally (private) for the policy engine. No backward compatibility layer needed.

## Goals

- [x] Create `policy/access/` internal layer (roles, grants, wildcard patterns)
- [x] Inline legacy `checkServerAccess` logic inside `evaluatePolicy`
- [x] Replace role/grant evaluation with internal helper (single user/session lookup)
- [x] Remove legacy RBAC folder (`src/42go/rbac/`) and all exports
- [x] Migrate all imports to `@/42go/policy` (protectRoute, protectPage, ProtectComponent, useEvaluatePolicy)
- [x] Delete `useGrants`, `ProtectedComponent`, `rbacRoute`, `serverAccess.ts`
- [x] Update ADR (RBAC Refactor Policies) with consolidation completion section
- [x] Add migration doc snippet inside ADR or brief note (no separate doc required early-stage)
- [x] Preserve wildcard grant matching functionality inside new internal module
- [x] Run QA (lint + build) green after refactor
- [x] Deep review & update all relevant documentation (\*.md) to remove legacy RBAC references and reflect new policy API

## Acceptance Criteria

- [x] No remaining imports from `@/42go/rbac` in codebase
- [x] `evaluatePolicy` handles roles/grants directly without calling `checkServerAccess`
- [x] Public API exposes only policy primitives (protectPage, protectRoute, ProtectComponent/Protect, useEvaluatePolicy)
- [x] All API routes/pages previously guarded still compile and function with policy guards
- [x] Wildcard grants (`foo:*`) still match identical to previous behavior
- [x] ADR updated: legacy RBAC removed, consolidation rationale recorded
- [x] Build & lint pass (`npm run qa`)
- [x] AppLayout updated to use only the new policy API (no legacy RBAC helpers)
- [x] Documentation sweep complete: no `.md` files reference removed RBAC APIs
- [x] No backward compatibility layer or deprecation warnings implemented (explicitly intentional)

## Out of Scope

- Batch strict-mode optimization (tracked in [adt]/[aea])
- Advanced caching of grants/roles
- Multi-role arrays beyond single `require.role` design

## Notes

- Keep the low-level DB queries (roles, grants) but mark them internal (no barrel export)
- `anyGrant` maps to previous ANY grant strategy; `grants` is ALL
- `strict` / `strictMode` future logic unchanged in this pass
- We intentionally provide zero backward compatibility or deprecation shims; clarity beats nostalgia
- Documentation update must include ADRs, memory-bank, articles — purge legacy RBAC symbols

## Next Steps

Task complete. All goals and acceptance criteria satisfied; ADR updated with consolidation section. No further action required.

## Progress (Final)

- Implemented internal access layer and unified evaluator.
- Removed legacy RBAC modules & public APIs (`useGrants`, `rbacRoute`, etc.).
- Migrated all guards to policy primitives (protectPage, protectRoute, useEvaluatePolicy, ProtectComponent).
- Updated documentation & ADR; verified no remaining code imports from `@/42go/rbac`.
- QA passed (lint/build) at consolidation time.

## Status

✅ COMPLETE
