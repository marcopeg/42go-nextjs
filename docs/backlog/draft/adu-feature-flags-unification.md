# Feature Flags Unification to AppConfig.features [adu]

Flatten and unify feature flags into a single `AppConfig.features: string[]` source of truth and bridge legacy configuration during migration.

## Goals

- [x] Add `features: string[]` to AppConfig
- [x] Create compatibility layer for existing `featureFlags.pages|apis` to populate `features`
- [x] Document conventions for `page:` and `api:` prefixes (ADR updated)
- [x] Update docs and samples (FEATURE_FLAGS.md examples now use protectPage/protectRoute)

## Acceptance Criteria

- [x] Feature checks resolve from a single list
- [x] Old config still works during migration window (bridge existed, now removed)
- [x] Clear docs: how to name, how to check, examples (complete at ADR + article level)

## Progress

- Added `features` to `AppConfigItem`.
- Migrated all apps to explicit unified `features` lists.
- Bridge introduced then removed after full migration.
- Server/client evaluators consume unified list.
- `appRoute` removed; `protectRoute` + policies standard.
- Docs & ADR updated; legacy fields purged.

## Next Steps

- None. Story complete. Tests for evaluator deferred to [aea].

## Status

✅ COMPLETE
