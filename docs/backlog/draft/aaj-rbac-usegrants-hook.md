# RBAC useGrants Hook & Client Components [aaj]

Implement the `useGrants` React hook and client-side components for permission checking. This hook provides loading states, session integration, and component-level access control.

**Part of RBAC Series**: [aai] → **[aaj]** → [aak] → [aal] → [aam]

**Prerequisites**: [aai] RBAC Database Schema & Core Infrastructure

## Requirements Analysis

Build on the foundation from [aai] to create client-side permission checking:

- **Database**: Multi-app RBAC schema with `app_id` support
- **Core Infrastructure**: Types and database utilities from [aai]
- **Session**: NextAuth.js integration for user identification
- **Loading States**: Smooth UI transitions during permission checks

## Core Component: useGrants Hook

### Basic Usage

```tsx
const UserMenu = () => {
  const hasUserAccess = useGrants({
    grants: ["users:*"],
    roles: ["backoffice"],
    loadingComponent: () => <Spinner className="w-4 h-4" />,
  } satisfies RBACPolicyClient);

  if (hasUserAccess.loading) return hasUserAccess.loadingComponent;

  return hasUserAccess.allowed ? <UsersList /> : <AccessDenied />;
};
```

### Advanced Usage with Callbacks

```tsx
const AdminPanel = () => {
  const adminAccess = useGrants({
    grants: ["admin:*"],
    roles: ["administrator"],
    onUnauthorized: (reason) => {
      console.log("Access denied:", reason);
      toast.error("You don't have admin privileges");
    },
    loadingComponent: CustomLoadingSpinner,
  });

  return (
    <div>
      {adminAccess.loading && adminAccess.loadingComponent}
      {adminAccess.allowed && <AdminDashboard />}
      {!adminAccess.loading && !adminAccess.allowed && <AccessDenied />}
    </div>
  );
};
```

## Client-Side Policy Interface

Extends the base policy from [aai] with UI-specific options:

```ts
interface RBACPolicyClient extends RBACPolicyBase {
  loadingComponent?: ComponentType | null; // Default: null (no loading UI)
  onUnauthorized?: (reason: string) => void; // Custom unauthorized handler
  redirectTo?: string | ((reason: string) => string); // For future use in [aak]
}

interface GrantResult {
  loading: boolean;
  allowed: boolean;
  error?: string;
  loadingComponent?: ComponentType | null;
}
```

## Session Integration

### Session Context

```tsx
// Custom session hook for RBAC
const useRBACSession = () => {
  const { data: session, status } = useSession();

  return {
    user: session?.user,
    isLoading: status === "loading",
    isAuthenticated: !!session?.user,
    userId: session?.user?.id,
  };
};
```

### Permission Caching Strategy

1. **Session-First**: Check cached permissions in NextAuth session
2. **Database Fallback**: Query database if cache miss or `realtime: true`
3. **Loading States**: Smooth transitions during async operations
4. **Error Handling**: Graceful degradation on permission check failures

## Goals

- [ ] Implement `useGrants` hook with loading states
- [ ] Create client-side RBAC policy interface
- [ ] Integrate with NextAuth session system
- [ ] Add session-cached permission checking
- [ ] Implement wildcard grant support in hook
- [ ] Create `AccessDenied` component
- [ ] Add comprehensive error handling
- [ ] Support custom loading components
- [ ] Add optional unauthorized callbacks
- [ ] Create unit tests for hook functionality

## Acceptance Criteria

### Core Hook Functionality

- [ ] `useGrants(policy)` returns `{ loading, allowed, error, loadingComponent }`
- [ ] Hook supports wildcard grants (`users:*` matches `users:list`)
- [ ] Hook supports both `ALL` and `ANY` strategies for grants/roles
- [ ] Hook integrates with NextAuth session system
- [ ] Loading state prevents UI flickering during permission checks

### Session Integration

- [ ] Hook uses session-cached permissions when available
- [ ] Hook falls back to database when `realtime: true`
- [ ] Hook handles unauthenticated users gracefully
- [ ] Hook works with app-scoped permissions from [aai]

### UI Components

- [ ] Custom loading components work correctly
- [ ] `onUnauthorized` callbacks execute with proper reason
- [ ] `AccessDenied` component provides user-friendly messaging
- [ ] All components handle loading states smoothly

### Developer Experience

- [ ] Clear TypeScript types for all hook parameters and returns
- [ ] Comprehensive error messages for permission failures
- [ ] Hook performance optimized for frequent re-renders
- [ ] Documentation includes usage examples

### Testing & Quality

- [ ] Unit tests cover hook with various permission scenarios
- [ ] Tests verify loading state transitions
- [ ] Tests cover error handling edge cases
- [ ] Tests verify session integration

## Development Plan

### Phase 1: Core Hook Implementation

**1.1 useGrants Hook** (`src/42go/rbac/hooks/useGrants.ts`)

```ts
export function useGrants(policy: RBACPolicyClient): GrantResult {
  const [state, setState] = useState<GrantResult>({
    loading: true,
    allowed: false,
    loadingComponent: policy.loadingComponent || null,
  });

  const session = useRBACSession();

  useEffect(() => {
    if (!session.isAuthenticated) {
      setState({
        loading: false,
        allowed: false,
        error: "User not authenticated",
        loadingComponent: policy.loadingComponent || null,
      });
      return;
    }

    checkPermissions(session.userId!, policy)
      .then((allowed) => {
        setState({
          loading: false,
          allowed,
          loadingComponent: policy.loadingComponent || null,
        });
      })
      .catch((error) => {
        setState({
          loading: false,
          allowed: false,
          error: error.message,
          loadingComponent: policy.loadingComponent || null,
        });

        if (policy.onUnauthorized) {
          policy.onUnauthorized(error.message);
        }
      });
  }, [session.userId, JSON.stringify(policy)]);

  return state;
}
```

**1.2 Session Utilities** (`src/42go/rbac/hooks/useRBACSession.ts`)

- Custom session hook optimized for RBAC
- Session state management
- User authentication checks

### Phase 2: Permission Checking Logic

**2.1 Permission Checker** (`src/42go/rbac/lib/permissions.ts`)

- Integrate with database utilities from [aai]
- Session-cached permission lookup
- Real-time database fallback
- App-scoped permission filtering

**2.2 Client-Side Utilities** (`src/42go/rbac/lib/client.ts`)

- Client-specific permission helpers
- Loading state management
- Error handling utilities

### Phase 3: UI Components

**3.1 AccessDenied Component** (`src/42go/rbac/components/AccessDenied.tsx`)

```tsx
interface AccessDeniedProps {
  reason?: string;
  children?: ReactNode;
  className?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  reason,
  children,
  className,
}) => {
  return (
    <div className={cn("text-center p-6", className)}>
      <div className="text-red-500 text-lg font-semibold">Access Denied</div>
      {reason && <div className="text-gray-600 mt-2">{reason}</div>}
      {children}
    </div>
  );
};
```

**3.2 Loading Components** (`src/42go/rbac/components/LoadingStates.tsx`)

- Default loading spinners
- Skeleton components
- Loading state utilities

### Phase 4: Integration & Testing

**4.1 Hook Integration Tests**

- Test with various permission scenarios
- Test loading state transitions
- Test error handling

**4.2 Session Integration Tests**

- Test with authenticated/unauthenticated users
- Test session-cached vs database permissions
- Test real-time permission updates

## Key Implementation Details

### Permission Caching Strategy

```ts
const checkPermissions = async (
  userId: string,
  policy: RBACPolicyClient
): Promise<boolean> => {
  // 1. Check session cache first
  if (!policy.realtime) {
    const cachedResult = await checkSessionPermissions(userId, policy);
    if (cachedResult !== null) {
      return cachedResult;
    }
  }

  // 2. Fallback to database
  return await checkDatabasePermissions(userId, policy);
};
```

### Loading State Management

```ts
const useLoadingTransition = (isLoading: boolean, delay = 100) => {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isLoading) {
      timeout = setTimeout(() => setShowLoading(true), delay);
    } else {
      setShowLoading(false);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isLoading, delay]);

  return showLoading;
};
```

### Error Handling Strategy

- Clear error messages for different failure types
- Graceful degradation when permissions can't be determined
- Optional error callbacks for custom handling

## Architecture Decisions

### React Hook Design

- **Decision**: Single hook for all permission checking
- **Rationale**: Consistent API, easy to use, minimal re-renders
- **Implementation**: State management with useEffect for async operations

### Session-First Caching

- **Decision**: Check session cache before database
- **Rationale**: Better performance, reduced database load
- **Fallback**: Database lookup for real-time checks

### Loading State Strategy

- **Decision**: Immediate loading state with configurable delay
- **Rationale**: Prevents UI flicker for fast permission checks
- **Implementation**: Debounced loading indicator

## Legacy Code Adaptation

### Hook Pattern Reference

```ts
// Legacy hook for reference (needs NextAuth adaptation)
export function useUserGrants(requiredGrants?: string[]): boolean {
  const { data: session } = useCachedSession();

  return useMemo(() => {
    if (!requiredGrants || requiredGrants.length === 0) {
      return true;
    }

    if (!session?.user) {
      return false;
    }

    const userGrants = session.user.grants || [];
    return requiredGrants.every((grant) => userGrants.includes(grant));
  }, [session, requiredGrants]);
}
```

## Next Steps

Implement [aak] RBAC Page & Route Protection
