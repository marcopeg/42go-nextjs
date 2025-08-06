# Rename Toolbar API for Consistency [adg]

Standardize the naming conventions for toolbar actions across PublicLayout and AppLayout to eliminate confusion between "links", "headerActions", and "actions".

## Goals

- [x] Rename `AppConfig.public.toolbar.links` → `AppConfig.public.toolbar.actions`
- [x] Rename `headerActions` prop → `actions` prop in AppLayout components
- [x] Update all references and imports across codebase
- [x] Maintain backward compatibility during transition (not required)

## Acceptance Criteria

- [x] Update `AppConfig.ts` type definitions for `toolbar.actions`
- [x] Update `AppHeader.tsx` to use `actions` prop instead of `headerActions`
- [x] Update `AppLayout.tsx` to pass `actions` prop correctly
- [x] Update all app pages that use `headerActions` to use new `actions` prop
- [x] Update `Header.tsx` in public layout to reference `toolbar.actions`
- [x] Ensure all TypeScript types compile without errors
- [x] Test both layouts still render actions correctly
- [x] Document the API change and migration path

## Development Plan

Chuck Norris doesn't just rename APIs - he teaches them consistency through precision strikes.

### Phase 1: AppConfig Interface Updates

**Files to modify:**

- `src/AppConfig.ts`: Update `ToolbarConfig` interface

**Changes:**

1. Rename `links?: ContentBlockItem[]` to `actions?: ContentBlockItem[]` in `ToolbarConfig` interface
2. Update all app configurations that use `toolbar.links` to use `toolbar.actions`
3. Search for: `toolbar: { links: ` and replace with `toolbar: { actions: `

### Phase 2: Public Layout Component Updates

**Files to modify:**

- `src/42go/layouts/public/Header.tsx`
- `src/42go/layouts/public/HeaderLinks.tsx` (props interface)

**Changes:**

1. In `Header.tsx`: Change `config?.public?.toolbar?.links` to `config?.public?.toolbar?.actions`
2. In `HeaderLinks.tsx`: Update prop name from `links` to `actions` while maintaining same functionality
3. Update prop types and JSDoc comments

### Phase 3: App Layout Component Updates

**Files to modify:**

- `src/42go/layouts/app/types.ts`
- `src/42go/layouts/app/AppLayout.tsx`
- `src/42go/layouts/app/AppHeader.tsx`

**Changes:**

1. In `types.ts`: Rename `headerActions?: AppLayoutActionItem[]` to `actions?: AppLayoutActionItem[]` in `AppLayoutProps`
2. In `AppLayout.tsx`: Update prop destructuring from `headerActions` to `actions`
3. In `AppHeader.tsx`: Update prop interface from `actions?: AppLayoutActionItem[]` (no change needed, already correct)
4. In `AppLayout.tsx`: Update prop passing from `actions={headerActions}` to `actions={actions}`

### Phase 4: App Pages Updates

**Files to modify:**

- `src/app/(app)/dashboard/page.tsx`
- `src/app/(app)/analytics/page.tsx`
- `src/app/(app)/settings/page.tsx`
- `src/app/(app)/users/page.tsx`

**Changes:**

1. Update all occurrences of `headerActions={...}` to `actions={...}` in AppLayout props
2. Keep variable names as `headerActions` for now (can be renamed in a follow-up task)

### Phase 5: Testing and Validation

**Steps:**

1. Run TypeScript compilation: `npm run type-check` or build
2. Test PublicLayout toolbar actions render correctly on different app configs
3. Test AppLayout header actions render correctly on all app pages
4. Verify no runtime errors in browser console
5. Run qa: `yarn qa`

### Migration Strategy

**Backward Compatibility:**

- Do not try so support backward compatibility

**Testing Approach:**

- Visual testing on different screen sizes
- Functional testing of action buttons/links
- Cross-app configuration testing

### Files Impact Summary

**Core Changes:**

- AppConfig interface (1 file)
- Public Layout components (2 files)
- App Layout components (3 files)
- App pages (4 files)

**Total**: ~10 files with surgical precision changes

The plan focuses on consistent naming while maintaining full functionality. Each phase builds on the previous one, ensuring no breaking changes during development.

## Progress

Chuck Norris roundhouse kicked the entire codebase into consistency:

- All `toolbar.links` are now `toolbar.actions` in config and types.
- All public and app layout components use `actions` instead of `links` or `headerActions`.
- All app pages updated to use the new prop.
- TypeScript, lint, and build: 100% clean.

## Migration Path

**Breaking change:**

- Rename all `toolbar.links` to `toolbar.actions` in your app configs.
- Update any usage of `headerActions` prop in `AppLayout` to `actions`.
- Update any usage of `links` prop in `HeaderLinks` to `actions`.
- No backward compatibility is provided. Update all usages at once.

See the task file for a full list of impacted files and details.
