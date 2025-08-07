# RBAC Menu Integration [aal]

Integrate RBAC permissions with AppConfig menu system to filter menu items based on user permissions. Implements client-side menu filtering with smooth loading transitions.

**Part of RBAC Series**: [aai] → [aaj] → [aak] → **[aal]** → [aam]

**Prerequisites**:

- [aai] RBAC Database Schema & Core Infrastructure
- [aaj] RBAC useGrants Hook & Client Components
- [aak] RBAC Page & Route Protection

## Requirements Analysis

Extend AppConfig menu system with RBAC support:

- **AppConfig Integration**: Add optional `rbac` property to menu items
- **Menu Filtering**: Client-side filtering based on user permissions
- **Loading States**: Smooth transitions during permission checks
- **TypeScript**: Extend existing menu types with RBAC support

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

### Enhanced Structure (with RBAC)

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
          rbac: {
            grants: ["users:list"],
            roles: ["backoffice"],
          },
        },
        {
          title: "Admin Panel",
          href: "/admin",
          icon: Settings,
          rbac: {
            grants: ["admin:*"],
            roles: ["administrator"],
            grantsStrategy: "ANY", // User needs ANY of the specified grants
          },
        },
      ];
    }
  }
}
```

## Menu Component Integration

### Enhanced Menu Item Interface

```ts
// Extend existing TAppLayoutNavItem
interface TAppLayoutNavItem {
  title: string;
  href: string;
  icon?: ComponentType<{ className?: string }>;
  rbac?: RBACPolicyClient; // Optional RBAC configuration
  // ... existing properties
}
```

### Menu Filtering Component

```tsx
const FilteredMenuItems: React.FC<{
  items: TAppLayoutNavItem[];
  onLoadingChange?: (loading: boolean) => void;
}> = ({ items, onLoadingChange }) => {
  const [filteredItems, setFilteredItems] = useState<TAppLayoutNavItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter items based on permissions
  useEffect(() => {
    const filterItems = async () => {
      setLoading(true);
      onLoadingChange?.(true);

      const results = await Promise.all(
        items.map(async (item) => {
          if (!item.rbac) {
            return { item, allowed: true };
          }

          const permission = await checkPermissions(item.rbac);
          return { item, allowed: permission };
        })
      );

      const allowed = results
        .filter(({ allowed }) => allowed)
        .map(({ item }) => item);

      setFilteredItems(allowed);
      setLoading(false);
      onLoadingChange?.(false);
    };

    filterItems();
  }, [items, onLoadingChange]);

  if (loading) {
    return <MenuSkeleton />;
  }

  return (
    <>
      {filteredItems.map((item, index) => (
        <MenuItem key={index} item={item} />
      ))}
    </>
  );
};
```

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

## Goals

- [ ] Extend `TAppLayoutNavItem` type to include optional `rbac` property
- [ ] Create menu filtering logic using permissions from [aaj]
- [ ] Update sidebar menu components to support RBAC filtering
- [ ] Implement smooth loading transitions during permission checks
- [ ] Add menu skeleton components for loading states
- [ ] Create batch permission checking for menu items
- [ ] Support all menu locations (top, bottom, mobile)
- [ ] Add TypeScript support for RBAC menu configuration
- [ ] Create integration tests for menu filtering
- [ ] Document menu RBAC configuration patterns

## Acceptance Criteria

### Type System

- [ ] `TAppLayoutNavItem` supports optional `rbac: RBACPolicyClient`
- [ ] AppConfig interface properly typed for RBAC menu items
- [ ] TypeScript compilation succeeds with new menu types
- [ ] Backward compatibility maintained for non-RBAC menus

### Menu Filtering

- [ ] Menu items without `rbac` property always show
- [ ] Menu items with `rbac` property filtered based on user permissions
- [ ] Wildcard grants work in menu item permissions
- [ ] Menu filtering works for all menu locations (top, bottom, mobile)

### Loading & Performance

- [ ] Menu skeleton shows during permission checks
- [ ] Smooth transitions when menu items appear/disappear
- [ ] Batch permission checking optimizes performance
- [ ] Menu doesn't flicker during permission resolution

### Integration

- [ ] Works with existing sidebar menu components
- [ ] Integrates with useGrants hook from [aaj]
- [ ] Uses core RBAC infrastructure from [aai]
- [ ] Client-side only filtering (no SSR for app layouts)

### Testing & Quality

- [ ] Unit tests for menu filtering logic
- [ ] Integration tests with actual menu components
- [ ] Tests verify loading state behavior
- [ ] Tests cover permission batch processing

## Development Plan

### Phase 1: Type System Extension

**1.1 Menu Types** (`src/42go/layouts/app/types.ts`)

```ts
import type { RBACPolicyClient } from "@/42go/rbac/types";

interface TAppLayoutNavItem {
  title: string;
  href: string;
  icon?: ComponentType<{ className?: string }>;
  rbac?: RBACPolicyClient; // New optional RBAC property
  // ... existing properties
}

// Update AppConfig types
interface AppLayoutMenu {
  top?: {
    items?: TAppLayoutNavItem[];
  };
  bottom?: {
    items?: TAppLayoutNavItem[];
  };
  mobile?: {
    items?: TAppLayoutNavItem[];
  };
}
```

**1.2 AppConfig Integration** (`src/AppConfig.ts`)

- Update type imports
- Ensure backward compatibility
- Add example RBAC menu configuration

### Phase 2: Menu Filtering Logic

**2.1 Permission Batch Checker** (`src/42go/rbac/lib/menuPermissions.ts`)

```ts
export const checkMenuPermissions = async (
  items: TAppLayoutNavItem[]
): Promise<TAppLayoutNavItem[]> => {
  // Batch check permissions for all menu items
  const permissionChecks = items.map(async (item) => {
    if (!item.rbac) {
      return { item, allowed: true };
    }

    const allowed = await checkPermissions(item.rbac);
    return { item, allowed };
  });

  const results = await Promise.all(permissionChecks);

  return results.filter(({ allowed }) => allowed).map(({ item }) => item);
};
```

**2.2 Menu Hook** (`src/42go/rbac/hooks/useFilteredMenu.ts`)

```ts
export const useFilteredMenu = (items: TAppLayoutNavItem[]) => {
  const [filteredItems, setFilteredItems] = useState<TAppLayoutNavItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const filterMenu = async () => {
      setLoading(true);

      try {
        const filtered = await checkMenuPermissions(items);

        if (mounted) {
          setFilteredItems(filtered);
          setLoading(false);
        }
      } catch (error) {
        console.error("Menu filtering error:", error);

        if (mounted) {
          // Show all items on error to avoid breaking UI
          setFilteredItems(items.filter((item) => !item.rbac));
          setLoading(false);
        }
      }
    };

    filterMenu();

    return () => {
      mounted = false;
    };
  }, [items]);

  return { filteredItems, loading };
};
```

### Phase 3: Menu Component Updates

**3.1 Sidebar Menu Component** (`src/42go/layouts/app/SidebarMenu.tsx`)

```tsx
// Update existing SidebarMenu to use filtering
export const SidebarMenu: React.FC<{
  items: TAppLayoutNavItem[];
}> = ({ items }) => {
  const { filteredItems, loading } = useFilteredMenu(items);

  if (loading) {
    return <MenuSkeleton />;
  }

  return (
    <nav className="space-y-1">
      <AnimatedMenuItems items={filteredItems} />
    </nav>
  );
};
```

**3.2 Loading Components** (`src/42go/rbac/components/MenuSkeleton.tsx`)

- Menu skeleton for loading states
- Animated transitions
- Responsive design

### Phase 4: Integration & Polish

**4.1 Menu Integration Tests**

- Test menu filtering with various permission scenarios
- Test loading states and transitions
- Test error handling

**4.2 Performance Optimization**

- Memoize permission results
- Optimize batch permission checking
- Reduce unnecessary re-renders

## Key Implementation Details

### Batch Permission Checking

```ts
const optimizedPermissionCheck = async (
  items: TAppLayoutNavItem[]
): Promise<PermissionResult[]> => {
  // Group similar permission checks to optimize database queries
  const permissionGroups = groupPermissionsByPolicy(items);

  const results = await Promise.all(
    permissionGroups.map((group) =>
      checkBatchPermissions(group.policy, group.items)
    )
  );

  return flattenResults(results);
};
```

### Error Handling Strategy

```ts
const safeMenuFiltering = async (
  items: TAppLayoutNavItem[]
): Promise<TAppLayoutNavItem[]> => {
  try {
    return await checkMenuPermissions(items);
  } catch (error) {
    console.error("Menu permission check failed:", error);

    // Fallback: show items without RBAC requirements
    return items.filter((item) => !item.rbac);
  }
};
```

### Performance Considerations

- **Memoization**: Cache permission results for identical policies
- **Batch Processing**: Group similar permission checks
- **Lazy Loading**: Only check permissions when menu is visible
- **Error Boundaries**: Graceful degradation on permission failures

## Architecture Decisions

### Client-Side Only Filtering

- **Decision**: All menu filtering happens client-side
- **Rationale**: Consistent with "client-side only app layout" decision
- **Trade-off**: Initial loading state vs server performance
- **Implementation**: Loading skeletons during permission resolution

### Backward Compatibility

- **Decision**: Optional `rbac` property maintains compatibility
- **Rationale**: Existing menus continue to work without changes
- **Implementation**: Items without `rbac` property always show

### Batch Permission Optimization

- **Decision**: Check all menu permissions in single batch
- **Rationale**: Better performance than individual checks
- **Implementation**: Parallel async permission resolution

## Integration Points

### AppConfig Usage Example

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
            rbac: {
              grants: ["users:list"],
              roles: ["admin", "user-manager"],
              rolesStrategy: "ANY",
            },
          },
          {
            title: "Settings",
            href: "/settings",
            icon: Settings,
            rbac: {
              grants: ["admin:*"],
              roles: ["administrator"],
            },
          },
        ],
      },
    },
  },
};
```

## Next Steps

Implement [aam] RBAC Advanced Features (Auth Ping & Session Management)
