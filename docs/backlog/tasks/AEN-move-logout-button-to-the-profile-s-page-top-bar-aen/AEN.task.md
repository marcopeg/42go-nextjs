---
taskId: AEN
status: archived
createdAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-08-20T11:25:47+02:00
compressedAt: 2026-07-29T12:00:00+02:00
compressedFromCommit: 27c91fcf1650c9cb49d27cb7c10a6484fbfe4329
---
# Move logout button to the profile's page top bar

## Historical Summary

Archived proposal to relocate logout from the profile session panel into the profile top bar for a consistent, accessible action surface.

## Retrieval Anchors

- `AEN` — Move logout button to the profile's page top bar.
- `src/app/(app)/profile/page.tsx`, `LogoutAction`, `PolicySessionPanel`.
- `AppLayout` actions, `ToolbarActions`, `TActionItem[]`.
- `signOut()` and `variant="outline"`.

## Durable Outcome and Decisions

The intended implementation was a small reusable `src/42go/auth/components/LogoutAction.tsx` component using the standard Button. The prior panel logout was to be removed while keeping Refresh Session.

## Validation and Limitations

The artifact is an archived plan and supplies no implementation or test proof. Mobile and desktop behavior, plus sign-out parity, were explicit acceptance checks.

## Task Relationships

### Supersedes

None identified.

### Superseded by

None identified.

### Related Tasks

None identified.

## Compression Provenance

Consolidated `AEN.task.md`. Its exact version is recoverable from `compressedFromCommit` (`27c91fcf1650c9cb49d27cb7c10a6484fbfe4329`).
