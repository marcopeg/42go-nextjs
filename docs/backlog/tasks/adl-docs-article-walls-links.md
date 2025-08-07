# Docs - Article Wall Links are broken [adl]

The route `/docs` provides the wall of available articles and each one should link to the page following similar logic as it is implemented for the sidebar, but those links don't work right now.

## Problem Analysis

The sidebar navigation works correctly because it uses the `createLink` component from the Markdown renderer, which applies `cleanupHref` logic to process relative links properly. However, the `DocsList` component (the article wall) is using raw `doc.slug` values to create links without applying the same cleanup logic.

**Current behavior:**

- DocsList creates links like `/docs/getting-started/README`
- These links fail because the routing expects `/docs/getting-started`

**Expected behavior:**

- DocsList should create links like `/docs/getting-started` (same as sidebar)
- Links should work consistently with the sidebar navigation

## Root Cause

The `DocsList` component in `/src/42go/components/docs/DocsList/DocsList.tsx` builds links using:

```tsx
href={`/${basePath}/${doc.slug}`}
```

But it should apply the same `cleanupHref` logic that the sidebar uses via `createLink`.

## Goals

- [ ] Fix broken links in the documentation article wall (`/docs`)
- [ ] Ensure consistent link generation between sidebar and article wall
- [ ] Apply the same `cleanupHref` logic used by the sidebar to the DocsList component
- [ ] Maintain existing functionality and styling

## Acceptance Criteria

- [ ] All article links in the `/docs` wall should work correctly
- [ ] Links should follow the same pattern as sidebar navigation
- [ ] Article wall links should navigate to the correct documentation pages
- [ ] No breaking changes to existing docs functionality
- [ ] Links should be clean (no file extensions, proper path cleanup)

# Development Plan

Chuck Norris doesn't just fix broken links. He creates a roundhouse kick of navigation consistency.

## Implementation Strategy

### Phase 1: Link Processing Analysis ✅

**Current State Analysis:**

- **Problem**: `DocsList` component uses raw `doc.slug` without cleanup
- **Working Pattern**: Sidebar uses `createLink` component with `cleanupHref` function
- **Impact**: Article wall links fail while sidebar navigation works correctly

**Key Finding**: Only one component (`DocsList`) has this issue - no other components need fixing.

### Phase 2: Apply Cleanup Logic

**Target File**: `/src/42go/components/docs/DocsList/DocsList.tsx`

**Implementation Steps**:

1. **Import cleanupHref function**:

   ```tsx
   import { cleanupHref } from "@/42go/components/Markdown";
   ```

2. **Apply cleanup to link generation**:

   ```tsx
   // Current (broken):
   href={`/${basePath}/${doc.slug}`}

   // Fixed (cleaned):
   href={`/${basePath}/${cleanupHref(doc.slug)}`}
   ```

**Technical Details**:

- `cleanupHref` removes file extensions (`.md`, `.mdx`)
- Removes `/readme` and `/index` suffixes (case insensitive)
- Handles relative path cleanup consistent with sidebar behavior

### Phase 3: Testing & Validation

**Testing Scenarios**:

1. Navigate to `/docs` and test all article links
2. Verify README-based articles work (e.g., `/docs/getting-started/README.md` → `/docs/getting-started`)
3. Test nested folder navigation
4. Compare behavior with sidebar navigation for consistency
5. Ensure no regression in existing functionality

**Validation Steps**:

1. Run `npm run qa` to ensure no linting/build errors
2. Manual testing of article wall navigation
3. Cross-reference with working sidebar navigation patterns

### Phase 4: Documentation Update

**Files to Update**:

- Task file with implementation notes and completion status
- Memory Bank if any architectural insights emerge

## Expected Changes

**Single File Modification**:

- `/src/42go/components/docs/DocsList/DocsList.tsx` (2 lines changed)

**Dependencies**:

- Existing `cleanupHref` function (no new dependencies)
- Maintains current component architecture and styling

## Risk Assessment

**Low Risk Implementation**:

- ✅ Single component change
- ✅ Uses existing, proven `cleanupHref` function
- ✅ No architectural changes required
- ✅ Easy to rollback if needed

**Validation Strategy**:

- Manual testing preferred (as requested)
- QA check for build errors
- Comparison with working sidebar behavior

## Success Criteria

- [ ] All `/docs` article wall links navigate correctly
- [ ] Link behavior matches sidebar navigation exactly
- [ ] No build or linting errors
- [ ] No regression in existing docs functionality
- [ ] Clean URLs (no file extensions, proper path cleanup)

Chuck Norris has analyzed the target and prepared the precision strike.

## Technical Details

**Root Cause:** The `DocsList` component uses raw slugs while the sidebar applies `cleanupHref` through `createLink`.

**Files to Modify:**

1. `/src/42go/components/docs/DocsList/DocsList.tsx` - Apply cleanupHref to doc.slug

**Dependencies:**

- Existing `cleanupHref` function from `/src/42go/components/Markdown/link.tsx`
- No new dependencies required

## Next Steps

plan task (k1) ✅ **COMPLETED**
execute task (k2)
