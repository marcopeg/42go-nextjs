# Create AppLayout TActionItem Type [adj]

Create a specific `TActionItem` type for AppLayout that only includes appropriate block types for toolbar contexts while focusing on client-only rendering.

## Goals

- [ ] Create client-only `TActionItem` type for AppLayout
- [ ] Restrict to only `link` and `component` block types
- [ ] Update AppHeader component to use new type
- [ ] Ensure zero SSR overhead for app layout actions

## Acceptance Criteria

- [ ] Create `TActionItem` type in `/src/42go/layouts/app/types.ts`
- [ ] Type should only include `TLinkBlock` and `TComponentBlock` from client ContentBlock
- [ ] Update `AppHeader.tsx` to use `TActionItem[]` instead of `AppLayoutActionItem[]`
- [ ] Remove the `AppLayoutActionItem` type alias since it's redundant
- [ ] Update `AppLayout.tsx` prop types to use new `TActionItem[]`
- [ ] Ensure actions are entirely client-rendered (no SSR)
- [ ] Test that invalid block types are caught by TypeScript
- [ ] Verify existing app pages with actions still work
- [ ] Document the client-only rendering strategy

## Development Plan

### Current Situation Analysis

**Current Code Structure:**

- `AppLayoutActionItem` type is just an alias for `ContentBlockItem` from client ContentBlock
- Client ContentBlock only supports `link` and `component` blocks (perfect for toolbar contexts)
- AppHeader.tsx already uses client-side ContentBlock rendering
- Current usage in dashboard and settings pages works correctly

**Type Safety Goal:**
Create a dedicated `TActionItem` type instead of relying on generic `ContentBlockItem` alias. This provides:

1. Better semantic meaning - these are specifically toolbar actions
2. Type isolation - AppLayout doesn't depend on ContentBlock internals
3. Future flexibility - can evolve independently from ContentBlock

### Implementation Steps

#### 1. Create New `TActionItem` Type

**File:** `/src/42go/layouts/app/types.ts`

```typescript
// Import the specific block types we need
import { type TLinkBlock } from "@/42go/components/ContentBlock/blocks/LinkBlock";
import { type TComponentBlock } from "@/42go/components/ContentBlock/blocks/ComponentBlock";

// Define AppLayout-specific action type
export type TActionItem = TLinkBlock | TComponentBlock;
```

#### 2. Update Type Definitions

**Remove the old alias:**

```typescript
// REMOVE: export type AppLayoutActionItem = ContentBlockItem;
```

**Update interface:**

```typescript
export interface AppLayoutProps {
  // ... other props
  headerActions?: TActionItem[]; // Changed from AppLayoutActionItem[]
}
```

#### 3. Update AppHeader Component

**File:** `/src/42go/layouts/app/AppHeader.tsx`

```typescript
import { type TActionItem } from "./types";

interface AppHeaderProps {
  // ... other props
  actions?: TActionItem[]; // Changed from AppLayoutActionItem[]
}
```

#### 4. Verify Client-Only Rendering

Ensure AppHeader component:

- Uses `"use client"` directive (already present)
- Imports from client ContentBlock (already correct)
- Only renders `link` and `component` blocks (already enforced by client ContentBlock)

#### 5. Update Import Statements

Check and update any files importing `AppLayoutActionItem`:

- `/src/app/(app)/dashboard/page.tsx`
- `/src/app/(app)/settings/page.tsx`

### Type Safety Verification

**Before (loose coupling):**

```typescript
// Could theoretically accept any ContentBlockItem
headerActions?: AppLayoutActionItem[]
```

**After (semantic clarity):**

```typescript
// Clearly indicates these are toolbar actions with restricted types
headerActions?: TActionItem[]
```

### Testing Strategy

1. **TypeScript Compilation:** Ensure no build errors after changes
2. **Page Functionality:** Verify dashboard and settings pages still render actions correctly
3. **Type Restrictions:** Confirm TypeScript catches invalid block types at compile time
4. **Client Rendering:** Verify actions are client-rendered without SSR overhead

### Architectural Benefits

1. **Semantic Clarity:** `TActionItem` clearly indicates toolbar context vs generic `ContentBlockItem`
2. **Type Safety:** Explicit restriction to toolbar-appropriate blocks
3. **Maintainability:** AppLayout type system independent of ContentBlock evolution
4. **Client-Only Focus:** Emphasizes zero SSR strategy for app layout actions

## Next Steps

execute task (k3)
