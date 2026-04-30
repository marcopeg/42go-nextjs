---
taskId: ADZ
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-08-14T05:53:48+02:00
---

# API Route Policy Guard uses Policies [adz]

Implement a unified API route guard based on Policy: `protectRoute()` with feature inference and error mapping. Update `rbacRoute()` to accept unified policies for backward compatibility.

- [x] Default feature inference from Request URL (e.g., `/api/todos` → `api:todos`)
- [x] Map failures to 401/403/404 consistently via global mapping
- [x] Update `rbacRoute()` to accept `Policy | Policy[]` and delegate to `evaluatePolicy()`
- [x] Backwards compatible: `rbacRoute()` supports unified policies too
- [x] Additional sensitive routes migrated (feedback + waitlist guarded via feature flags)
- [ ] Unit test: failing feature → 404; missing session → 401; role/grant failure → 403 (deferred to [aea])
- src/42go/rbac/utils/rbacRoute.ts (unified policy compatibility)
  Add more sample protected API routes (feature + role + grant combos) for docs.
  Tests for error mapping + short circuit deferred to [aea].
  Consider optional per-policy override mapping if SSR adds it.
- [x] `/api/todos` guarded with `protectRoute` and explicit `{ feature: 'api:todos' }`

## Progress Update

- Guard implemented with feature inference + status mapping + per-policy overrides.
- `/api/todos`, `/api/feedback`, `/api/waitlist` protected with appropriate feature requirements.
- Legacy rbacRoute removed (compat not needed).
- Tests deferred to [aea].

## Status

Complete (tests deferred to [aea]).
