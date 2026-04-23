---
taskId: ADW
status: draft
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
---

# Client Policy Hook and Component [adw]

Expose `useEvaluatePolicy()` and `<ProtectComponent />` using the unified policy model with session-first checks and strict refresh.

## Goals

- [x] Implement hook
- [x] Implement component wrapper
- [ ] Implement strict refresh path
- [ ] ADR documentation snippet
- [ ] Tests (→ [aea])

## Acceptance Criteria

- [x] Hook exposes pass/loading/error + failedIndex
- [x] Component gates children with renderOn\* props
- [ ] Strict refresh behavior documented & implemented
- [ ] Tests for all error branches

## Progress

- Hook & component used by AppLayout & panels.
- Strict refresh not implemented (deferred).
- Relying on session snapshot for grants/roles.

## Next Steps

- Add unit tests:

  - Fails feature missing → code=feature
  - Fails no session when session required → code=session
  - Role vs grant failure differentiation

- Decide & implement minimal strict refresh approach (if needed soon).
- Add ADR usage examples.

## Status

In Progress.
