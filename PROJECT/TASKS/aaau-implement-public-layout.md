# Implement Public Layout - aaau

Simplify the root layout by moving Nav and other UI responsibilities into a dedicated component that might be used as Page's wrapper instead.

# Acceptance Criteria

- [x] Root's layout has no presentation responsibilities in it
- [x] Root's layout has one single version for app/non-app renderings
- [x] Find a cleaner NextJS approach for the HomePage

# Implementation Notes

I've created the `@/components/PublicLayout` that hosts the navigation responsibility (pure presentational) and cleaned out the `RootLayout` from any presentational respnsibility.

I'm happy now with the root layout cleanliness.

I'm happy how I've managed to apply the PublicLayout to the `/todos` route, but less satisfied with the `HomePage` where I had to import it and use it as a wrapper at React level. There must be a better approach.

## Development Plan - Route Group Approach

**Objective**: Use Next.js Route Groups to organize pages that need PublicLayout, applying the layout at the proper architectural level instead of wrapping at component level.

### Step 1: Create Route Group Structure

1. Create `src/app/(public)/` directory - route groups use parentheses and don't affect URL structure
2. Create `src/app/(public)/layout.tsx` that exports the PublicLayout component
3. Move `src/app/page.tsx` to `src/app/(public)/page.tsx` (HomePage)
4. Move `src/app/todos/` directory to `src/app/(public)/todos/`
5. Remove the existing `src/app/todos/layout.tsx` since PublicLayout will be applied at group level

### Step 2: Implement Group Layout

Create `src/app/(public)/layout.tsx`:

```tsx
import { PublicLayout } from "@/components/PublicLayout";

export default function PublicRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicLayout>{children}</PublicLayout>;
}
```

### Step 3: Clean Up HomePage

Update the moved `src/app/(public)/page.tsx`:

- Remove `import { PublicLayout } from "@/components/PublicLayout";`
- Remove the `<PublicLayout>` wrapper from the JSX
- The layout will be automatically applied by the route group

### Step 4: Clean Up Todos

Remove `src/app/(public)/todos/layout.tsx` since it's redundant now - the PublicLayout is applied at the group level.

### Final Structure

```
src/app/
  layout.tsx (root layout - themes, metadata, etc.)
  (public)/
    layout.tsx (PublicLayout applied here)
    page.tsx (home page - clean, no layout wrapper)
    todos/
      page.tsx (todos page - clean, no layout needed)
  api/
    todos/
      route.ts
```

### Benefits

- **Clean Separation**: Layout logic is at the architectural level, not component level
- **DRY Principle**: No need to import and wrap PublicLayout in every page
- **Next.js Best Practices**: Using route groups as intended for shared layouts
- **Maintainability**: Adding new public pages just requires placing them in the (public) group
- **URL Structure**: Route groups don't affect URLs - `/` and `/todos` remain unchanged

### Verification Steps

1. Ensure home page (`/`) still renders correctly with navigation
2. Ensure todos page (`/todos`) still renders correctly with navigation
3. Verify no duplicate navigation elements
4. Run `npm run lint && npm run build` to ensure no build errors

### Future Considerations - Route Groups Architecture

#### Adding Private Routes

This approach sets up the foundation for a clean public/private route architecture:

```
src/app/
  layout.tsx (root layout)
  (public)/
    layout.tsx (PublicLayout)
    page.tsx → "/" (public homepage)
    todos/
      page.tsx → "/todos" (public todos)
    about/
      page.tsx → "/about"
  (private)/
    layout.tsx (PrivateLayout with auth checks)
    dashboard/
      page.tsx → "/dashboard"
    profile/
      page.tsx → "/profile"
  api/
    todos/
      route.ts
```

#### Route Matching Rules

- **URL-based matching**: Next.js matches routes based on the exact URL path
- **No conflicts allowed**: The same URL cannot exist in multiple route groups
- **Single layout per route**: Each route gets exactly one layout chain (root → group → page)

#### HomePage Layout Limitation

**IMPORTANT**: The HomePage (`/`) cannot dynamically switch between public and private layouts based on authentication status. This is because:

1. **Static Route Resolution**: Next.js determines the layout at build time, not runtime
2. **Single Path Rule**: `/` can only exist in one route group - either `(public)` or `(private)`
3. **No Conditional Layouts**: You cannot conditionally apply different group layouts to the same URL

#### Workaround Options for Dynamic HomePage

If you need the homepage to behave differently for authenticated vs. non-authenticated users:

1. **Client-side rendering**: Use `useEffect` and auth state to render different content
2. **Server-side logic**: Use middleware to redirect authenticated users to `/dashboard`
3. **Separate routes**: Keep `/` as public landing page, redirect authenticated users to `/dashboard`

This architectural choice forces clean separation of concerns - public routes stay public, private routes stay private.

## Implementation Results

**✅ COMPLETED** - Route group approach successfully implemented on 2025-06-25.

### Actions Taken:

1. **Created Route Group Structure**:

   - Created `src/app/(public)/` directory
   - Created `src/app/(public)/layout.tsx` with PublicLayout wrapper

2. **Moved Pages**:

   - Moved `src/app/page.tsx` → `src/app/(public)/page.tsx`
   - Moved `src/app/todos/` → `src/app/(public)/todos/`
   - Cleaned up HomePage by removing PublicLayout import and wrapper

3. **Removed Redundant Files**:

   - Deleted original `src/app/page.tsx`
   - Deleted `src/app/(public)/todos/layout.tsx` (no longer needed)

4. **Verification**:
   - ✅ `npm run lint` - No warnings or errors
   - ✅ `npm run build` - Compiled successfully
   - ✅ Route structure shows both `/` and `/todos` are properly configured

### Final Structure Achieved:

```
src/app/
  layout.tsx (root layout)
  (public)/
    layout.tsx (PublicLayout applied here)
    page.tsx (homepage - clean, no layout wrapper)
    todos/
      page.tsx (todos page - clean, no layout needed)
  api/
    todos/
      route.ts
```

### Key Benefits Realized:

- **Clean Architecture**: Layout logic is now at the proper architectural level
- **DRY Principle**: No more importing/wrapping PublicLayout in individual pages
- **Maintainability**: Adding new public pages requires only placing them in `(public)` group
- **Next.js Best Practices**: Using route groups as intended for shared layouts
