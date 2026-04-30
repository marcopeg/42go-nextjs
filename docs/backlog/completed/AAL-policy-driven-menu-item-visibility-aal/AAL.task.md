---
taskId: AAL
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-08-20T11:25:47+02:00
---

# Policy–Driven Menu Item Visibility [aal]

Integrate the new generic Policy system with the AppConfig menu so items declare an optional `policy` (single or array) and are automatically hidden (not rendered, no errors) when the policy fails. This replaces the original RBAC‑only concept with the unified `Policy` abstraction (session / feature / role / grants / anyGrant).

**Series Context**: [aai] → [aaj] → [aak] → **[aal]** → [aam]

**Prerequisites** (already implemented):

- Policy evaluation hook `useEvaluatePolicy`
- `<ProtectComponent>` visual guard (used elsewhere for panels/pages)
- AppConfig menu structure (top / bottom / mobile)

## Requirements Analysis (Updated)

Extend AppConfig menu system with Policy support:

- **Type Extension**: Add optional `policy?: Policy | Policy[]` to `TAppLayoutNavItem` (current file: `src/42go/layouts/app/types.ts`).
- **Rendering Rule**: If `policy` provided and evaluation fails (pass === false, loading === false) do NOT render the item (pure omission; no placeholder, no error component, no skeleton inside the menu list).
- **Loading Behavior**: While a menu item's policy is loading, we may optimistically hide it to avoid flicker OR (simpler v1) treat loading as "not yet decided" and withhold rendering; no global skeleton for the whole menu (keep existing instant menu rendering for items without policy). Simplicity first.
- **Batching / Optimization**: Minimal v1—call `useEvaluatePolicy` per item. (Future optimization: batch evaluate unique policy sets). Note this is acceptable because policy evaluation is synchronous-over-session + feature flags (no network) today.
- **Backward Compatibility**: Existing menus (no policy fields) remain unchanged.
- **No RBAC Terminology**: Replace previous `rbac` references with generic `policy`.

## Reality Check (as of Aug 14, 2025)

- Types: `TAppLayoutNavItem` exists in `src/42go/layouts/app/types.ts` and currently has no `policy` field. It already imports `type Policy, PolicyErrorCode` from `@/42go/policy/client` so adding `policy?: Policy | Policy[]` is consistent with existing imports.
- Guards: `<ProtectComponent>` exists in `src/42go/policy/ProtectComponent.tsx` and supports `renderOnLoading` / `renderOnError` props (we’ll pass null renderers for silent omission in menus).
- Hooks: `useEvaluatePolicy` is available at `src/42go/policy/useEvaluatePolicy.ts` and relies on client session + app features (no network calls for the visual check).
- Menus today:
  - Sidebar: `src/42go/layouts/app/SidebarMenu.tsx` maps items and renders `Link` directly (no policy yet).
  - Mobile bottom: `src/42go/layouts/app/MobileBottomNav.tsx` maps items and renders `Link` directly (no policy yet).
  - Toolbar actions: `src/42go/layouts/app/ToolbarActions.tsx` uses ContentBlock; out-of-scope for this story.

Conclusion: We only need a minimal additive change to the types and to both menu renderers.

## AppConfig Menu Enhancement

### Current Structure

```ts
// Current AppConfig structure
app: {
  menu: {
    top: {
      items: [
        {
          title: "Users",
          href: "/users",
          icon: Users,
        },
      ];
    }
  }
}
```

### Enhanced Structure (with Policy)

```ts
// Enhanced with RBAC support
app: {
  menu: {
    top: {
      items: [
        {
          title: "Users",
          href: "/users",
          icon: Users,
          policy: { require: { anyGrant: ["users:list", "admin:*"] } },
        },
        {
          title: "Admin Panel",
          href: "/admin",
          icon: Settings,
          policy: [
            { require: { role: "administrator" } },
            { require: { grants: ["admin:panel"] } }, // both must pass
          ],
        },
      ];
    }
  }
}
```

## Menu Component Integration

### Updated Menu Item Interface (concept)

```ts
interface TAppLayoutNavItem {
  // ... existing fields
  policy?: Policy | Policy[]; // Optional visibility policy
}
```

### Rendering Strategy

Instead of pre-filtering arrays, we can inline wrap each menu link:

```tsx
{
  items.map((item) => {
    if (!item.policy) return <MenuLink key={k(item)} item={item} />;
    return (
      <ProtectComponent
        key={k(item)}
        policy={item.policy}
        renderOnLoading={() => null}
        renderOnError={() => null}
      >
        <MenuLink item={item} />
      </ProtectComponent>
    );
  });
}
```

Pros: minimal new code, reuse existing policy evaluation & caching semantics. Cons: multiple hooks (acceptable for typical small menu sizes).

## Loading States & Transitions

### Menu Skeleton Component

```tsx
const MenuSkeleton: React.FC = () => {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="flex items-center space-x-3 px-3 py-2">
            <div className="w-5 h-5 bg-gray-300 rounded"></div>
            <div className="w-24 h-4 bg-gray-300 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
};
```

### Smooth Loading Transitions

```tsx
const AnimatedMenuItems: React.FC<{
  items: TAppLayoutNavItem[];
}> = ({ items }) => {
  return (
    <AnimatePresence>
      {items.map((item, index) => (
        <motion.div
          key={item.href}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ delay: index * 0.1 }}
        >
          <MenuItem item={item} />
        </motion.div>
      ))}
    </AnimatePresence>
  );
};
```

## Goals (Revised)

- [ ] Extend `TAppLayoutNavItem` with optional `policy` field
- [ ] Update `SidebarMenu` (and any mobile menu components) to hide items failing policy
- [ ] Ensure loading state causes silent omission (no layout jump flicker beyond natural list shrink)
- [ ] Maintain backward compatibility (menus without policy unaffected)
- [ ] Add types & inline JSDoc for `policy` field
- [ ] Document usage in `docs/articles/POLICY.md` or dedicated snippet
- [ ] (Optional) Extract small helper `wrapWithPolicy(item, node)` for reuse

Testing note: No test runner is configured in `package.json`. If tests are required, add a separate story to introduce Jest/Vitest + RTL; otherwise validate via local smoke and `npm run qa`.

## Acceptance Criteria

### Type System

- [ ] `TAppLayoutNavItem` supports optional `policy?: Policy | Policy[]`
- [ ] TypeScript compiles with updated interface
- [ ] No breaking changes to existing config objects

### Visibility Logic

- [ ] Items without `policy` always render
- [ ] Items with failing policy never render (no spacer)
- [ ] Items while loading are not rendered (no flicker)
- [ ] Works across top / bottom / mobile menus

### Performance & UX

- [ ] No perceptible layout thrash (React key stability maintained)
- [ ] Acceptable performance with N items (no extra re-renders)
- [ ] (Stretch) Avoid duplicate identical policy hook executions if easily possible

### Integration

- [ ] Uses `ProtectComponent` (preferred) or `useEvaluatePolicy` directly if needed
- [ ] Pure client-side behavior only

## File Touchpoints

- `src/42go/layouts/app/types.ts` — add `policy?: Policy | Policy[]` to `TAppLayoutNavItem` (keep existing imports; add JSDoc explaining silent hide).
- `src/42go/layouts/app/SidebarMenu.tsx` — wrap each item that has `policy` with `<ProtectComponent policy={...} renderOnLoading={() => null} renderOnError={() => null}>`.
- `src/42go/layouts/app/MobileBottomNav.tsx` — same wrapping logic for bottom mobile items.
- (Docs) `docs/articles/POLICY.md` — add a short subsection “Menu visibility via policies” with an AppConfig example.

### Testing & Quality

- [ ] Unit test: policy pass renders; fail omits
- [ ] Component test: combination of items renders only allowed subset
- [ ] Snapshot or DOM assertions stable when toggling policy pass/fail
- [ ] Type test (dts) for new field

## Development Plan (Revised)

### Phase 1: Types

1. Add `policy?: Policy | Policy[]` to `TAppLayoutNavItem` (`src/42go/layouts/app/types.ts`). Include JSDoc explaining silent hide behavior.
2. Ensure `AppConfig` inference still works (no changes needed besides the nav item interface).

### Phase 2: Rendering Update

1. In `SidebarMenu.tsx` modify `renderMenuItems`:

- Extract existing link body into `renderSingleItem(item)`.
- If `item.policy` wrap with `<ProtectComponent policy={item.policy} renderOnLoading={() => null} renderOnError={() => null}>`.

2. Repeat for mobile nav component(s) if they map items similarly (`MobileBottomNav.tsx`).

### Phase 3: Tests

1. Optional (separate story): Introduce Jest/Vitest + RTL. Otherwise, perform manual smoke validation.
2. Manual validation checklist:

- Item without policy renders.
- Item with passing policy renders.
- Item with failing policy is absent.
- Loading state shows absence (no placeholder), then appears when pass.

### Phase 4: Docs

1. Update `docs/articles/POLICY.md` (append section) OR create a short snippet in the backlog task if doc already exhaustive.
2. Provide configuration example inside `AppConfig` comment block (non-executing) for maintainers.

### Phase 5: (Optional Optimization / Stretch)

- If necessary, create a lightweight helper `PolicyWrapper` to avoid repeating the `renderOnLoading` / `renderOnError` props.

### Non-Goals for This Story

- Batch de-dup of identical policies (future performance story)
- Skeleton / animation transitions (nice-to-have previously; scope reduced to simplicity)

### Rollback Plan

- Removing the `policy` key reverts to prior behavior instantly (pure additive field).

## Key Implementation Details (Adjusted)

### Simplicity First

Each item individually invokes `ProtectComponent` only when it has a `policy`. Evaluation relies on session + feature set already in memory; no network calls => acceptable O(n) hook cost (typical n < 15). Future batching only if evidence of performance issue.

### Error Handling

`ProtectComponent` already renders nothing (due to our override) when failing or loading because we supply `renderOnError/Loading` returning null. So error UI is intentionally suppressed in menu context.

### Performance Considerations

- Lightweight: evaluation synchronous vs session snapshot & feature set
- Stable keys: use existing `item.id || href-title` to avoid remount storms
- Early omission reduces DOM churn

## Architecture Decisions

### Client-Side Only Filtering

- Unchanged: still purely client-side, aligned with existing layout approach.

### Backward Compatibility

- Optional `policy` property maintains full compatibility; no existing item definitions break.

### Batch Permission Optimization

- Deferred; complexity not justified yet. Future story can replace per-item wrappers with a context pre-pass.

## Quality Gates

- Build: `npm run qa` passes with no TypeScript or ESLint errors after changes.
- Smoke: Sidebar and mobile bottom menus visually omit items with failing or loading policies.
- Backward compatibility: Existing configs (no `policy`) behave unchanged.

## Assumptions

- `useEvaluatePolicy` remains synchronous over in-memory session + features for client checks (no network I/O), keeping per-item overhead acceptable.
- Menus have relatively small N (≤ 15); per-item wrappers are fine.

## Open Questions

- Should the Profile link (in the sidebar’s bottom section) ever be policy-guarded? Probably out-of-scope here; leave always visible when session exists.

## Next Steps

execute task (k3)

## Integration Points

### AppConfig Usage Example (Updated)

```ts
// Example AppConfig with RBAC menu
const appConfig: AppConfigItem = {
  name: "admin-app",
  app: {
    menu: {
      top: {
        items: [
          {
            title: "Dashboard",
            href: "/dashboard",
            icon: LayoutDashboard,
            // No rbac - always visible
          },
          {
            title: "Users",
            href: "/users",
            icon: Users,
            policy: { require: { anyGrant: ["users:list", "admin:*"] } },
          },
          {
            title: "Settings",
            href: "/settings",
            icon: Settings,
            policy: [
              { require: { role: "administrator" } },
              { require: { feature: "page:settings" } },
            ],
          },
        ],
      },
    },
  },
};
```

## Follow-ups

- Implement [aam] RBAC Advanced Features (Auth Ping & Session Management)
