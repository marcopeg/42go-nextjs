---
taskId: ADI
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-08-06T17:15:28+02:00
---

# Create PublicLayout TActionItem Type [adi]

Create a specific `TActionItem` type for PublicLayout that only includes appropriate block types for toolbar contexts while maintaining full SSR compatibility.

## Goals

- [ ] Create SSR-compatible `TActionItem` type for PublicLayout
- [ ] Restrict to only `link` and `component` block types
- [ ] Update ToolbarActions component to use new type
- [ ] Maintain backward compatibility with existing configurations

## Acceptance Criteria

- [ ] Create `TActionItem` type in `/src/42go/layouts/public/types.ts`
- [ ] Move `ToolbarConfig` interface from `AppConfig.ts` to `/src/42go/layouts/public/types.ts`
- [ ] Type should only include `TLinkBlock` and `TComponentBlock` from server ContentBlock
- [ ] Update `ToolbarActions.tsx` to use `TActionItem[]` instead of `ContentBlockItem[]`
- [ ] Update `AppConfig.ts` to import `ToolbarConfig` from new location
- [ ] Update `ToolbarConfig.actions` type to use `TActionItem[]`
- [ ] Ensure full SSR compatibility is maintained
- [ ] Test that invalid block types are caught by TypeScript
- [ ] Verify existing toolbar configurations still work
- [ ] Document the new type and its constraints

## Development Plan

### Current Situation Analysis

The PublicLayout uses server-side ContentBlock for SSR optimization. The current `ToolbarActions.tsx` accepts the full `ContentBlockItem[]` type, which includes all 5 block types (hero, demo, markdown, component, link). However, only `link` and `component` blocks make sense in toolbar contexts.

Additionally, the `ToolbarConfig` interface is currently defined in `AppConfig.ts` but it's specific to PublicLayout functionality and should be moved to the appropriate module for better architectural organization.

### Implementation Steps

#### 1. Create PublicLayout Types File

**File:** `/src/42go/layouts/public/types.ts`

Create a new types file with both the `TActionItem` type and moved `ToolbarConfig`:

```typescript
import type { ComponentType } from "react";
import { type TLinkBlock } from "@/42go/components/ContentBlock/blocks/LinkBlock";
import { type TComponentBlock } from "@/42go/components/ContentBlock/blocks/ComponentBlock";

// PublicLayout-specific toolbar action type: only link and component blocks for SSR
export type TActionItem = TLinkBlock | TComponentBlock;

// Toolbar configuration interface (moved from AppConfig.ts)
export interface ToolbarConfig {
  title?: string;
  subtitle?: string;
  icon?: string | ComponentType<{ className?: string }>;
  href?: string;
  actions?: TActionItem[]; // Now uses the restricted type
}
```

#### 2. Update ToolbarActions Component

**File:** `/src/42go/layouts/public/ToolbarActions.tsx`

Update the component to use the new `TActionItem` type:

```typescript
import { type TActionItem } from "./types";
import { ContentBlock } from "@/42go/components/ContentBlock/server";

interface ToolbarActionsProps {
  actions?: TActionItem[]; // Changed from ContentBlockItem[]
}
```

#### 3. Update AppConfig Imports

**File:** `/src/AppConfig.ts`

Remove the `ToolbarConfig` interface and import it from the new location:

```typescript
// Add this import
import type { ToolbarConfig } from "@/42go/layouts/public/types";

// Remove the existing ToolbarConfig interface definition
// export interface ToolbarConfig { ... } // DELETE THIS

// Remove the ContentBlockItem import since it's no longer needed for ToolbarConfig
```

#### 4. Test Type Safety

Verify that TypeScript catches invalid block types at compile time:

- Try adding a `hero` or `markdown` block to toolbar actions
- Ensure compilation fails with clear error messages
- Verify existing `link` and `component` actions still work

#### 5. Verify SSR Compatibility

Ensure the new type maintains full server-side rendering:

- Check that toolbar actions render correctly on initial page load
- Verify no hydration mismatches
- Confirm SEO optimization is preserved

### Architectural Benefits

1. **Better Module Organization:** `ToolbarConfig` lives with related PublicLayout components
2. **Semantic Clarity:** `TActionItem` clearly indicates PublicLayout toolbar context
3. **SSR Optimization:** Maintains server-side rendering benefits
4. **Type Restriction:** Prevents inappropriate block types in toolbar
5. **Maintainability:** PublicLayout type system independent of ContentBlock evolution
6. **Separation of Concerns:** AppConfig focuses on high-level configuration, not component-specific types

### Testing Strategy

1. **TypeScript Compilation:** Ensure no build errors after changes
2. **Import Resolution:** Verify `ToolbarConfig` import works correctly in AppConfig.ts
3. **SSR Verification:** Check toolbar renders correctly on page load
4. **Type Restrictions:** Confirm invalid block types caught at compile time
5. **Existing Configurations:** Verify current toolbar setups still work
6. **Module Isolation:** Ensure PublicLayout types are properly encapsulated

### Next Steps

execute task (k3)
