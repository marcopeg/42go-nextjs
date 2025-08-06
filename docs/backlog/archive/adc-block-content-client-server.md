# ContentBlock client/server [adc]

Refactor the dynamic content blocks so to export a client and server component.

NOTE: the client component can't render markdown from a file, but it may render it from an api call with localStorage cache.

## Proposal

the component `@/42go/components/ContentBlock` should be divided internally in:

- `@/42go/components/ContentBlock/server` - the current implementation
- `@/42go/components/ContentBlock/client` - a similar implementation that for now only implements the `LinkBlock` and `ComponentBlock` and works as client side components

NOTE: the new `ClientContentBlock` should be used in the AppLayout's AppHeader component to implement the actions section.

## Acceptance Criteria

- The current usage of `ContentBlock` still works by importing `ContentBlock/server`
  - HomePage still works
  - DynamicPages still work
  - Docs still work
- The dashboard's Logout button is implemented as a simple `type=link, ...` passing the properties to the AppLayout and is implemented with `ContentBlock/client`

## Development Plan

Chuck Norris doesn't refactor code. He makes code realize its true potential.

### Current Analysis

The existing `ContentBlock` component at `@/42go/components/ContentBlock/ContentBlock.tsx` is currently server-side compatible and handles these block types:

- `HeroBlock` - Server component (uses ReactMarkdown)
- `DemoBlock` - Server component
- `MarkdownBlock` - Server component with `async` (file system access)
- `ComponentBlock` - Client compatible (renders arbitrary components)
- `LinkBlock` - Client compatible (marked with `"use client"`)

Current usage:

- `src/42go/layouts/public/HeaderLinks.tsx` - Server component usage
- `src/42go/components/DynamicPage/DynamicPage.tsx` - Server component usage
- Various config files use the types

### Refactoring Strategy

1. **Create Server Component** (`ContentBlock/server.tsx`)

   - Move current implementation as-is
   - Keep all existing block types
   - Maintain async capability for MarkdownBlock

2. **Create Client Component** (`ContentBlock/client.tsx`)

   - Support only `LinkBlock` and `ComponentBlock` initially
   - Remove server-side dependencies (fs, async functions)
   - Add "use client" directive

3. **Update Main Export** (`ContentBlock/index.ts`)

   - Default export points to server component for backward compatibility
   - Named exports for both server and client variants

4. **Implement AppHeader Actions**
   - Use client ContentBlock in AppHeader for action buttons
   - Replace hardcoded logout button with ContentBlock configuration

### Files to Create/Modify

**Create:**

- `src/42go/components/ContentBlock/server.tsx` - Server component implementation
- `src/42go/components/ContentBlock/client.tsx` - Client component implementation

**Modify:**

- `src/42go/components/ContentBlock/index.ts` - Update exports
- `src/42go/components/ContentBlock/ContentBlock.tsx` - Remove (move to server.tsx)
- `src/42go/layouts/app/AppLayout.tsx` - Support ContentBlock actions
- `src/42go/layouts/app/AppHeader.tsx` - Use ContentBlock for actions
- `src/app/(app)/dashboard/page.tsx` - Use ContentBlock for logout button

### Implementation Steps

1. **Phase 1: Split Components**

   - Create `server.tsx` with current implementation
   - Create `client.tsx` with limited block support
   - Update index exports

2. **Phase 2: Test Server Compatibility**

   - Verify all existing usages work with `ContentBlock/server`
   - Run `npm run lint && npm run build` to ensure no regressions

3. **Phase 3: Implement Client Actions**

   - Modify AppLayout to accept actions as ContentBlock items
   - Update AppHeader to render ContentBlock actions
   - Replace dashboard logout button with ContentBlock configuration

4. **Phase 4: Validation**
   - Test all existing pages (Home, Docs, Dynamic pages)
   - Test new dashboard logout functionality
   - Ensure client/server boundaries are respected

### Block Type Support Matrix

| Block Type     | Server Component | Client Component | Notes                                 |
| -------------- | ---------------- | ---------------- | ------------------------------------- |
| HeroBlock      | ✅               | ❌               | Uses ReactMarkdown, complex rendering |
| DemoBlock      | ✅               | ❌               | Server-side only for now              |
| MarkdownBlock  | ✅               | ❌               | Requires filesystem access            |
| ComponentBlock | ✅               | ✅               | Works in both contexts                |
| LinkBlock      | ✅               | ✅               | Already client-compatible             |

### Configuration Example

```typescript
// AppLayout usage with ContentBlock actions
const headerActions = [
  {
    type: "link" as const,
    label: "Sign Out",
    href: "/api/auth/signout",
    variant: "outline" as const,
    size: "sm" as const,
  },
];

<AppLayout headerActions={headerActions}>{children}</AppLayout>;
```

This approach maintains full backward compatibility while enabling client-side action rendering. No existing code breaks, and new functionality gets unlocked.

## Next Steps

## Final Notes

We've provided a crazy good refactoring, paving a way not only to improve the code structure, but also to create new `BlockContent/xxx` that can easily define an arbitrary set of accepted components.

A next possible evolution for the `AppLayout` is to define its own custom set of accepted components in the toolbar.
