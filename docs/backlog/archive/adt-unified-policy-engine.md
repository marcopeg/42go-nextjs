<!-- NOTE: Legacy wildcard removal summary moved into main sections below; this header block cleaned during refinement. -->

# Unified Policy Engine [adt]

Single policy system for: feature gating, auth/session, role, and grants. Works server (authoritative) + client (visual only). Replace legacy RBAC & feature flag wrappers with one declarative shape.

## Problem Statement

We had scattered logic: (now removed) legacy feature flag system (only historical mentions in archived tasks), scattered RBAC lookups, duplicated guards. Current implementation (server: `evaluatePolicy`, client: `useEvaluatePolicy`, wrappers: `protectPage`, `protectRoute`, `ProtectComponent`) mostly unifies this, but minor clarity gaps remain (feature prefix validation duplication, unused experimental fields). The protectPage switch bug is now handled in a separate story; this story focuses on annotation, lightweight warnings, and documentation.

## Current State Summary

Implemented:

## Identified Issues & Risks

| Issue | Impact | Action |
| `protectPage` switch fall-through (missing breaks) | Wrong redirect (feature 404 may redirect to login/unauthorized) | FIX (add breaks / explicit returns) |
| Duplicate helpers (feature validation, toArray) | Drift risk, larger bundle | Deferred (utility module story) |
| Mixed responsibility in `protectRoute` (logging + formatting) | Harder to test | Extract formatFailure / deriveFeature helpers |
| Lack of tests | Regression risk | Create stub list here (tests follow in separate story) |

## Scope (This Story)

Focused, minimal hardening & documentation only. Implementation work delegated elsewhere is explicitly out of scope.

In-Scope:

1. Annotate & warn (dev-only, once) on experimental `strict` / `strictMode` usage.
2. Add single dev warning (once) for invalid feature prefix.
3. Create `POLICY.md` and add cross-doc pointers (FEATURE_FLAGS, ARCHITECTURE).
4. Remove stray console logging from `protectRoute`.
5. Run quality gates (lint, typecheck) & manual smoke.
6. Update this task file (progress, decisions) as actions complete.

Out of Scope (handled by separate stories):

- Wildcard grant removal (delegated).
- Utility module extraction & helper unification.
- OR helper design / composite semantics.
- Comprehensive test suite & matrix execution.

## Goals

- (protectPage bug handled externally.)
- Clarify experimental nature of `strict` fields (documentation + one dev warning) without changing behavior.
- Provide authoritative POLICY.md documenting semantics (AND, onFail override, feature inference, no wildcard support).
- Add lightweight dev warnings (prefix validity, experimental strict) exactly once each.
- Remove noisy console logging from `protectRoute`.
- Leave code prepared (but not implementing) for future OR and utility consolidation stories.

## Acceptance Criteria

- [ ] Experimental fields annotated + one-time dev warning emits when used.
- [ ] Prefix validation dev warning (once) implemented.
- [ ] POLICY.md authored; FEATURE_FLAGS & ARCHITECTURE docs link to it.
- [ ] Console logging removed from `protectRoute` (no stray logs in dev).
- [ ] No regression in existing page/API protection (manual smoke passes).
- [ ] This task file updated with progress & decisions.

## Planned Artifacts

- Updated `src/42go/policy/types.ts` (experimental annotations & JSDoc).
- POLICY.md (new) with: overview, policy shape, AND semantics, onFail override example, inference examples, statement that wildcard grant patterns are unsupported (exact IDs only).
- Updated FEATURE_FLAGS.md & ARCHITECTURE.md with pointer links to POLICY.md.

Notes:

- Test matrix & utility consolidation intentionally excluded (other stories).
- OR semantics explicitly deferred.

## execute task (k2)

Development Steps (execute in order):

1. Annotate `strict` / `strictMode` in types + implement `warnOnce` helper (if not already available) for experimental usage.
2. Implement prefix validation warning (single emission) in evaluator/guards.
3. Author POLICY.md & add cross-doc links.
4. Remove console logging from `protectRoute`.
5. Run quality gates (`npm run qa`) & manual smoke routes/pages.
6. Update Progress Log & tick acceptance criteria.

### Edge Cases / Considerations

| Edge                               | Handling                                              |
| ---------------------------------- | ----------------------------------------------------- |
| Empty features list                | Fails fast → 404 semantics correct                    |
| Feature name uppercase             | Do not auto-normalize; document lowercase expectation |
| Wildcard characters in grant IDs   | Treated literally; note in docs only                  |
| Experimental strict fields present | Emit single dev warning; no behavior change           |

### Rollback Strategy

1. Revert `protectPage` change if redirect logic misbehaves.
2. Revert `protectPage` change if redirect logic misbehaves (unlikely) – old bug is non-fatal.

- Minimal; changes are local (no structural refactor in this story).
- Missed replacement causing duplicate logic → run grep for `matchesPattern(` and `startsWith("page:")` after refactor.

### Success Criteria Recap

- Experimental fields clearly annotated + warning once.
- Prefix warning implemented.
- POLICY.md published & linked.
- No stray `protectRoute` logs.
- No behavior regressions (manual smoke passes).

---
