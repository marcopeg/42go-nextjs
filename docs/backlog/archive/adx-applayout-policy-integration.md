# AppLayout Policy Integration [adx]

Allow `@/42go/layouts/app` to accept `policy` props and wrap content with `<ProtectComponent>` defaults.

## Goals

- [x] Extend AppLayout props with `policy?: Policy | Policy[]`
- [x] Provide default error UI (PolicyError component via ProtectComponent)
- [x] Provide default loading UI (PolicyScaffold skeleton) for consistent experience
- [x] Ensure consistent UX across pages (align loading + error styling, doc snippet)

## Acceptance Criteria

- [x] Passing a policy protects the inner content
- [x] Backward compatible when no policy is set
- [x] Default error UI renders (PolicyError) when access denied and no custom renderer is provided
- [x] Default loading UI provided & standardized (PolicyScaffold)

## Progress

- AppLayout wraps children with `<ProtectComponent>` when `policy` provided.
- Users page migrated off `rbacPage` to AppLayout policy prop.
- Profile page uses inline `<ProtectComponent>` demo.
- Default error UI implemented via `PolicyError`.
- Default loading skeleton implemented via `PolicyScaffold`.
- Still missing: brief documentation & UX guideline; minor style polish optional.

## Next Steps

- Add ADR/examples snippet referencing defaults (PolicyError + PolicyScaffold).
- Consider minor style polish & accessibility review (focus states when interactive controls added later).
- Tests for layout-level defaults (error + loading) deferred to [aea].

## Progress Update

- Policy prop integrated; children wrapped when provided.
- Error UI standardized (PolicyError). Loading UI standardized (PolicyScaffold).
- Legacy wrappers gone (aeb), no deprecation notice needed.

## Status

In Progress (docs + tests outstanding).
