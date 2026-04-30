---
taskId: ADY
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-08-14T05:53:48+02:00
---

# Cleanup Legacy Feature Flags [ady]

Remove `featureFlags.pages|apis` after migration, update docs and code to only use `AppConfig.features`.

## Goals

- [x] Remove deprecated keys from config
- [x] Delete compatibility bridge code
- [x] Update docs and examples

## Acceptance Criteria

- [x] No remaining references to legacy keys
- [x] QA: build + lint pass

## Progress

- Unified `features[]` fully adopted in `AppConfig` (legacy fields removed).
- Bridge + `appRoute` removed.
- API routes migrated to `protectRoute` with explicit `api:` features.
- Feature flags article rewritten for unified list.
- Global grep: no `featureFlags`, `appRoute`, `appPage`, `pageWithConfig` remaining.

## Next Steps

- None; task complete. ADR updated to reflect removal. Follow-up hardening tests tracked in [aea].

## Status

✅ COMPLETE
