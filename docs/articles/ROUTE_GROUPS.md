# Route Groups Architecture

This document explains how Route Groups are implemented in this Next.js project for organizing pages with shared layouts.

## What are Route Groups?

Route Groups are a Next.js 13+ feature that allows you to organize routes without affecting the URL structure. They use parentheses `()` in folder names to group related routes that share common layouts or logic.

**Key Characteristics:**

- Folders with parentheses `(name)` are route groups
- Route groups do **not** affect the URL structure
- Each route group can have its own `layout.tsx`
- Routes are matched based on the file path within the group, not the group name

## Current Implementation

### Structure

```
src/app/
  layout.tsx                    # Root layout (themes, metadata, app config)
  (public)/                     # Public route group
    layout.tsx                  # PublicLayout (navigation, public UI)
    page.tsx                    # Homepage → URL: "/"
    todos/
      page.tsx                  # Todos page → URL: "/todos"
  api/
    todos/
      route.ts                  # API route → URL: "/api/todos"
```

### Layout Hierarchy

Each page gets a nested layout chain:

1. **Homepage (`/`)**:

   - Root Layout → Public Layout → Page Content

2. **Todos (`/todos`)**:

   - Root Layout → Public Layout → Page Content

3. **API Routes**:
   - Only Root Layout (no UI layouts needed)

## Benefits

### 1. Clean Separation of Concerns

- **Root Layout**: Handles app-wide concerns (themes, metadata, config)
- **Public Layout**: Handles public page UI (navigation, footer, etc.)
- **Pages**: Focus only on their specific content

### 2. DRY Principle

- No need to import and wrap layout components in every page
- Layout logic lives at the architectural level
- Consistent UI across all pages in the group

### 3. Maintainability

- Adding new public pages: just drop them in `(public)/`
- Changing public layout: modify one file affects all public pages
- Clear organization makes codebase easier to navigate

### 4. Performance

- Layouts are resolved at build time, not runtime
- No conditional rendering overhead
- Static optimization possible

## Future Expansion

### Adding Private Routes

```
src/app/
  layout.tsx
  (public)/
    layout.tsx
    page.tsx → "/"
    about/
      page.tsx → "/about"
  (private)/                    # New private route group
    layout.tsx                  # PrivateLayout (auth checks, private nav)
    dashboard/
      page.tsx → "/dashboard"
    profile/
      page.tsx → "/profile"
  api/
    todos/
      route.ts
```

### Private Layout Example

```tsx
// src/app/(private)/layout.tsx
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { PrivateLayout } from "@/components/PrivateLayout";

export default async function PrivateRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuth();

  if (!user) {
    redirect("/login");
  }

  return <PrivateLayout user={user}>{children}</PrivateLayout>;
}
```

## Important Limitations

### 1. No URL Conflicts

- The same URL cannot exist in multiple route groups
- `/dashboard` can only be in one place
- Choose the group placement carefully

### 2. Static Route Resolution

- Layouts are determined at build time, not runtime
- Cannot dynamically switch layouts based on user state
- A page like `/` cannot use different layouts for different users

### 3. Single Layout Chain

- Each route gets exactly one layout chain
- Cannot conditionally apply different group layouts to the same URL
- Must choose public OR private, not both

## Best Practices

### 1. Group by Layout Needs

- Group routes that share the same layout requirements
- Don't group by feature if they need different layouts

### 2. Keep Groups Focused

- `(public)` for unauthenticated users
- `(private)` for authenticated users
- `(admin)` for admin-only pages

### 3. Handle Edge Cases

- Use middleware for auth redirects
- Use client-side logic for conditional content within pages
- Keep URLs predictable and clean

### 4. Documentation

- Document which routes belong to which groups
- Explain the layout hierarchy
- Document auth requirements per group

## References

- [Next.js Route Groups Documentation](https://nextjs.org/docs/app/building-your-application/routing/route-groups)
- [Next.js Layouts Documentation](https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates)
- [Next.js App Router Documentation](https://nextjs.org/docs/app)

---

_Last updated: 2025-06-25_
_Implementation: aaau-implement-public-layout_
