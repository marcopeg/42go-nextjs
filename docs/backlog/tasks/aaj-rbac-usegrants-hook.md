# RBAC useGrants Hook & Client Components [aaj]

Implement the `useGrants` React hook and client-side components for permission checking. Focus on session-cached JWT decode for lightweight UI protection, with HTTP fallback for realtime checks.

**Part of RBAC Series**: [aai] → **[aaj]** → [aak] → [aal] → [aam]

**Prerequisites**: [aai] RBAC Database Schema & Core Infrastructure

## Requirements Analysis

Build on the foundation from [aai] to create client-side permission checking:

- **Database**: Multi-app RBAC schema with `app_id` support from [aai]
- **Core Infrastructure**: Types and database utilities from [aai]
- **Session Strategy**: JWT-embedded permissions for client cache, HTTP for realtime
- **NextAuth Integration**: Enhance JWT/session callbacks to embed grants/roles
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

## Session Integration & JWT Enhancement

### Enhanced NextAuth Callbacks

**UPDATE REQUIRED**: Modify JWT and session callbacks to embed permissions:

```ts
// src/42go/auth/lib/callbacks.ts - ENHANCED JWT CALLBACK
export const jwt = async ({ token, user }: any) => {
  if (user) {
    token.id = user.id;
    token.email = user.email;
    token.name = user.name;

    // NEW: Embed user grants and roles for session cache
    try {
      const appId = "default"; // TODO: Get from request context in [aan]
      const [userGrants, userRoles] = await Promise.all([
        getUserGrants(user.id, appId),
        getUserRoles(user.id, appId),
      ]);

      token.grants = userGrants;
      token.roles = userRoles;
      token.appId = appId;
    } catch (error) {
      console.error("Failed to load user permissions:", error);
      token.grants = [];
      token.roles = [];
      token.appId = "default";
    }
  }
  return token;
};

// src/42go/auth/lib/callbacks.ts - ENHANCED SESSION CALLBACK
export const session = async ({ session, token }: any) => {
  if (token && session.user) {
    session.user.id = token.id;
    session.user.email = token.email;
    session.user.name = token.name;

    // NEW: Add permissions to session for client access
    session.user.grants = token.grants || [];
    session.user.roles = token.roles || [];
    session.user.appId = token.appId || "default";
  }
  return session;
};
```

### Session-Cached Permission Strategy

**Primary Approach**: JWT decode on client for UI protection (NO HTTP)
**Fallback**: HTTP request only when `realtime: true`

```tsx
const useRBACSession = () => {
  const { data: session, status } = useSession();

  return {
    user: session?.user,
    isLoading: status === "loading",
    isAuthenticated: !!session?.user,
    userId: session?.user?.id,
    grants: session?.user?.grants || [],
    roles: session?.user?.roles || [],
    appId: session?.user?.appId || "default",
  };
};
```

## Goals

- [ ] **PREREQUISITE**: Update NextAuth JWT/session callbacks to embed grants/roles
- [ ] **PREREQUISITE**: Add session type declarations for permissions
- [ ] **PREREQUISITE**: Test session enhancement works correctly
- [ ] Implement `useGrants` hook with session-first strategy
- [ ] Implement `useRBACSession` hook for permission access
- [ ] Create client-side session permission checker (NO HTTP)
- [ ] Create HTTP permission checker for realtime validation
- [ ] Add wildcard grant support in client checker
- [ ] Create `AccessDenied` and loading components
- [ ] Create `ProtectedComponent` wrapper
- [ ] Implement RBAC check API route (`/api/rbac/check`)
- [ ] Add comprehensive error handling
- [ ] Create complete module exports
- [ ] Write unit and integration tests

## Acceptance Criteria

### Session Enhancement (Phase 0)

- [ ] NextAuth JWT callback embeds user grants and roles from database
- [ ] NextAuth session callback exposes permissions to client
- [ ] Session types include `grants: string[]`, `roles: string[]`, `appId: string`
- [ ] Session permissions update on login/token refresh
- [ ] Session enhancement handles database errors gracefully

### Core Hook Functionality

- [ ] `useGrants(policy)` returns `{ loading, allowed, error, loadingComponent }`
- [ ] Hook uses session cache by default (NO HTTP for UI protection)
- [ ] Hook falls back to HTTP only when `realtime: true`
- [ ] Hook supports wildcard grants (`users:*` matches `users:list`)
- [ ] Hook supports both `ALL` and `ANY` strategies for grants/roles
- [ ] Loading state prevents UI flickering during permission checks

### Session-First Permission Strategy

- [ ] Client permission checker uses JWT-decoded session grants/roles
- [ ] Session permission check is synchronous (no loading state needed)
- [ ] HTTP checker only called when `realtime: true` (async with loading)
- [ ] App ID validation works for future multi-app support
- [ ] Hook handles unauthenticated users gracefully

### HTTP Realtime Support

- [ ] `/api/rbac/check` API validates user can only check own permissions
- [ ] API integrates with database utilities from [aai]
- [ ] HTTP checker handles API errors gracefully (fail closed)
- [ ] API supports app-scoped permissions
- [ ] Real-time checks bypass session cache completely

### UI Components

- [ ] `AccessDenied` component provides user-friendly messaging
- [ ] Loading components work correctly with custom styling
- [ ] `ProtectedComponent` wrapper handles all permission scenarios
- [ ] All components handle loading states smoothly
- [ ] Components support custom fallback content

### Developer Experience

- [ ] Clear TypeScript types for all hook parameters and returns
- [ ] Comprehensive error messages for permission failures
- [ ] Hook performance optimized for frequent re-renders
- [ ] Complete module exports in `src/42go/rbac/index.ts`
- [ ] Documentation includes usage examples

### Testing & Quality

- [ ] Unit tests cover hook with various permission scenarios
- [ ] Tests verify session-first vs HTTP strategy
- [ ] Tests cover error handling edge cases
- [ ] Integration tests verify component rendering
- [ ] Tests verify wildcard pattern matching

## Development Plan

### Phase 0: NextAuth Session Enhancement (PREREQUISITE)

**0.1 Update JWT/Session Callbacks** (`src/42go/auth/lib/callbacks.ts`)

Import RBAC utilities from [aai]:

```ts
import { getUserGrants, getUserRoles } from "@/42go/rbac/lib/db";
```

Add permission embedding to JWT callback (see code above).
Add permission exposure to session callback (see code above).

**0.2 Update Session Types** (`src/42go/auth/types.ts` - CREATE IF MISSING)

```ts
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      grants: string[];
      roles: string[];
      appId: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    grants: string[];
    roles: string[];
    appId: string;
  }
}
```

**0.3 Test Session Enhancement**

Verify permissions appear in client session:

```tsx
// Test component to verify session contains permissions
const SessionDebug = () => {
  const { data: session } = useSession();

  return <pre>{JSON.stringify(session?.user, null, 2)}</pre>;
};
```

### Phase 1: Core Hook Implementation

**1.1 RBAC Session Hook** (`src/42go/rbac/hooks/useRBACSession.ts`)

```ts
import { useSession } from "next-auth/react";

export const useRBACSession = () => {
  const { data: session, status } = useSession();

  return {
    user: session?.user,
    isLoading: status === "loading",
    isAuthenticated: !!session?.user,
    userId: session?.user?.id,
    grants: session?.user?.grants || [],
    roles: session?.user?.roles || [],
    appId: session?.user?.appId || "default",
  };
};
```

**1.2 Client Permission Checker** (`src/42go/rbac/lib/client.ts`)

```ts
import { RBACPolicyClient } from "../types";
import { matchesPattern } from "./grants";

export const checkSessionPermissions = (
  sessionGrants: string[],
  sessionRoles: string[],
  policy: RBACPolicyClient
): boolean => {
  // Check grants if specified
  if (policy.grants && policy.grants.length > 0) {
    const grantMatches = policy.grants.map((requiredGrant) => {
      // Support wildcard matching
      if (requiredGrant.includes("*")) {
        return sessionGrants.some((userGrant) =>
          matchesPattern(requiredGrant, userGrant)
        );
      }
      return sessionGrants.includes(requiredGrant);
    });

    const grantsAllowed =
      policy.grantsStrategy === "ANY"
        ? grantMatches.some(Boolean)
        : grantMatches.every(Boolean);

    if (!grantsAllowed) return false;
  }

  // Check roles if specified
  if (policy.roles && policy.roles.length > 0) {
    const roleMatches = policy.roles.map((requiredRole) =>
      sessionRoles.includes(requiredRole)
    );

    const rolesAllowed =
      policy.rolesStrategy === "ANY"
        ? roleMatches.some(Boolean)
        : roleMatches.every(Boolean);

    if (!rolesAllowed) return false;
  }

  return true;
};
```

**1.3 HTTP Permission Checker** (`src/42go/rbac/lib/http.ts`)

```ts
import { RBACPolicyClient } from "../types";

export const checkDatabasePermissions = async (
  userId: string,
  policy: RBACPolicyClient
): Promise<boolean> => {
  try {
    const response = await fetch("/api/rbac/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        grants: policy.grants,
        roles: policy.roles,
        grantsStrategy: policy.grantsStrategy || "ALL",
        rolesStrategy: policy.rolesStrategy || "ANY",
        appId: policy.appId || "default",
      }),
    });

    if (!response.ok) {
      throw new Error(`Permission check failed: ${response.status}`);
    }

    const result = await response.json();
    return result.allowed === true;
  } catch (error) {
    console.error("Database permission check failed:", error);
    return false; // Fail closed
  }
};
```

**1.4 Main useGrants Hook** (`src/42go/rbac/hooks/useGrants.ts`)

```ts
import { useState, useEffect } from "react";
import { RBACPolicyClient, GrantResult } from "../types";
import { useRBACSession } from "./useRBACSession";
import { checkSessionPermissions } from "../lib/client";
import { checkDatabasePermissions } from "../lib/http";

export function useGrants(policy: RBACPolicyClient): GrantResult {
  const [state, setState] = useState<GrantResult>({
    loading: true,
    allowed: false,
    loadingComponent: policy.loadingComponent || null,
  });

  const session = useRBACSession();

  useEffect(() => {
    const checkPermissions = async () => {
      // Not authenticated = not allowed
      if (!session.isAuthenticated || !session.userId) {
        setState({
          loading: false,
          allowed: false,
          error: "User not authenticated",
          loadingComponent: policy.loadingComponent || null,
        });

        if (policy.onUnauthorized) {
          policy.onUnauthorized("User not authenticated");
        }
        return;
      }

      // App ID mismatch = not allowed (for future multi-app support)
      if (policy.appId && policy.appId !== session.appId) {
        setState({
          loading: false,
          allowed: false,
          error: `App context mismatch: expected ${policy.appId}, got ${session.appId}`,
          loadingComponent: policy.loadingComponent || null,
        });

        if (policy.onUnauthorized) {
          policy.onUnauthorized(`Wrong app context: ${session.appId}`);
        }
        return;
      }

      try {
        let allowed: boolean;

        if (policy.realtime) {
          // Force database check for realtime permissions
          allowed = await checkDatabasePermissions(session.userId, policy);
        } else {
          // Use session cache (JWT decode) for UI protection
          allowed = checkSessionPermissions(
            session.grants,
            session.roles,
            policy
          );
        }

        setState({
          loading: false,
          allowed,
          loadingComponent: policy.loadingComponent || null,
        });

        if (!allowed && policy.onUnauthorized) {
          const reason = policy.realtime
            ? "Database permission check failed"
            : "Session permissions insufficient";
          policy.onUnauthorized(reason);
        }
      } catch (error) {
        setState({
          loading: false,
          allowed: false,
          error:
            error instanceof Error ? error.message : "Permission check failed",
          loadingComponent: policy.loadingComponent || null,
        });

        if (policy.onUnauthorized) {
          policy.onUnauthorized("Permission check error");
        }
      }
    };

    if (session.isLoading) {
      // Wait for session to load
      setState((prev) => ({ ...prev, loading: true }));
    } else {
      checkPermissions();
    }
  }, [
    session.isLoading,
    session.isAuthenticated,
    session.userId,
    session.grants,
    session.roles,
    session.appId,
    JSON.stringify(policy), // Re-check when policy changes
  ]);

  return state;
}
```

### Phase 2: HTTP Permission API (Realtime Support)

**2.1 RBAC Check API** (`src/app/api/rbac/check/route.ts`)

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { hasGrants, hasRoles } from "@/42go/rbac/lib/db";

interface CheckRequest {
  userId: string;
  grants?: string[];
  roles?: string[];
  grantsStrategy?: "ALL" | "ANY";
  rolesStrategy?: "ALL" | "ANY";
  appId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { allowed: false, error: "Unauthenticated" },
        { status: 401 }
      );
    }

    const body: CheckRequest = await request.json();

    // Validate user can only check their own permissions
    if (body.userId !== session.user.id) {
      return NextResponse.json(
        { allowed: false, error: "Cannot check other user's permissions" },
        { status: 403 }
      );
    }

    const appId = body.appId || "default";
    let allowed = true;

    // Check grants if specified
    if (body.grants && body.grants.length > 0) {
      const grantsAllowed = await hasGrants(
        body.userId,
        body.grants,
        appId,
        body.grantsStrategy || "ALL"
      );
      if (!grantsAllowed) allowed = false;
    }

    // Check roles if specified
    if (body.roles && body.roles.length > 0) {
      const rolesAllowed = await hasRoles(
        body.userId,
        body.roles,
        appId,
        body.rolesStrategy || "ANY"
      );
      if (!rolesAllowed) allowed = false;
    }

    return NextResponse.json({ allowed });
  } catch (error) {
    console.error("RBAC check API error:", error);
    return NextResponse.json(
      { allowed: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Phase 3: UI Components & Error Handling

**3.1 AccessDenied Component** (`src/42go/rbac/components/AccessDenied.tsx`)

```tsx
import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
    <div
      className={cn(
        "text-center p-6 bg-red-50 rounded-lg border border-red-200",
        className
      )}
    >
      <div className="text-red-700 text-lg font-semibold mb-2">
        Access Denied
      </div>
      {reason && <div className="text-red-600 text-sm mb-4">{reason}</div>}
      {children || (
        <div className="text-gray-600 text-sm">
          You don't have permission to view this content.
        </div>
      )}
    </div>
  );
};
```

**3.2 Loading Components** (`src/42go/rbac/components/LoadingStates.tsx`)

```tsx
import React from "react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  className,
  size = "md",
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-gray-300 border-t-blue-600",
        sizeClasses[size],
        className
      )}
    />
  );
};

export const RBACLoadingSkeleton: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <div className={cn("animate-pulse", className)}>
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
};
```

**3.3 RBAC Wrapper Components** (`src/42go/rbac/components/ProtectedComponent.tsx`)

```tsx
import React, { ReactNode } from "react";
import { useGrants } from "../hooks/useGrants";
import { RBACPolicyClient } from "../types";
import { AccessDenied } from "./AccessDenied";
import { LoadingSpinner } from "./LoadingStates";

interface ProtectedComponentProps extends RBACPolicyClient {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

export const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  children,
  fallback,
  loadingFallback,
  ...policy
}) => {
  const access = useGrants(policy);

  if (access.loading) {
    return <>{loadingFallback || <LoadingSpinner />}</>;
  }

  if (!access.allowed) {
    return <>{fallback || <AccessDenied reason={access.error} />}</>;
  }

  return <>{children}</>;
};
```

### Phase 4: Integration & Module Export

**4.1 Main Export File** (`src/42go/rbac/index.ts`)

```ts
// Hooks
export { useGrants } from "./hooks/useGrants";
export { useRBACSession } from "./hooks/useRBACSession";

// Components
export { AccessDenied } from "./components/AccessDenied";
export {
  LoadingSpinner,
  RBACLoadingSkeleton,
} from "./components/LoadingStates";
export { ProtectedComponent } from "./components/ProtectedComponent";

// Types
export type {
  RBACPolicyClient,
  GrantResult,
  ServerAccessResult,
} from "./types";

// Client utilities
export { checkSessionPermissions } from "./lib/client";
export { checkDatabasePermissions } from "./lib/http";
```

**4.2 Update RBAC Types** (`src/42go/rbac/types.ts`)

Add client-specific types:

```ts
import { ComponentType } from "react";

// Extend base types from [aai]
export interface RBACPolicyClient extends RBACPolicyBase {
  loadingComponent?: ComponentType | null; // Default: null (no loading UI)
  onUnauthorized?: (reason: string) => void; // Custom unauthorized handler
  redirectTo?: string | ((reason: string) => string); // For future use in [aak]
}

export interface GrantResult {
  loading: boolean;
  allowed: boolean;
  error?: string;
  loadingComponent?: ComponentType | null;
}
```

### Phase 5: Testing & Validation

**5.1 Hook Unit Tests** (`src/42go/rbac/hooks/__tests__/useGrants.test.tsx`)

```tsx
import { renderHook, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { useGrants } from "../useGrants";

// Mock NextAuth
jest.mock("next-auth/react");
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock HTTP permission checker
jest.mock("../lib/http", () => ({
  checkDatabasePermissions: jest.fn(),
}));

describe("useGrants", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns loading=true while session is loading", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "loading",
    });

    const { result } = renderHook(() => useGrants({ grants: ["users:list"] }));

    expect(result.current.loading).toBe(true);
    expect(result.current.allowed).toBe(false);
  });

  it("returns allowed=false for unauthenticated user", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    const { result } = renderHook(() => useGrants({ grants: ["users:list"] }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.allowed).toBe(false);
    expect(result.current.error).toBe("User not authenticated");
  });

  it("grants access with session-cached permissions", async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "user123",
          grants: ["users:list", "users:edit"],
          roles: ["admin"],
          appId: "default",
        },
      },
      status: "authenticated",
    });

    const { result } = renderHook(() => useGrants({ grants: ["users:list"] }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.allowed).toBe(true);
  });

  it("supports wildcard grant matching", async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "user123",
          grants: ["users:list", "users:edit"],
          roles: [],
          appId: "default",
        },
      },
      status: "authenticated",
    });

    const { result } = renderHook(() => useGrants({ grants: ["users:*"] }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.allowed).toBe(true);
  });

  it("calls HTTP API when realtime=true", async () => {
    const mockCheckDatabase = require("../lib/http").checkDatabasePermissions;
    mockCheckDatabase.mockResolvedValue(true);

    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "user123",
          grants: [],
          roles: [],
          appId: "default",
        },
      },
      status: "authenticated",
    });

    const { result } = renderHook(() =>
      useGrants({ grants: ["admin:delete"], realtime: true })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockCheckDatabase).toHaveBeenCalledWith("user123", {
      grants: ["admin:delete"],
      realtime: true,
    });
    expect(result.current.allowed).toBe(true);
  });
});
```

**5.2 Integration Tests** (`src/42go/rbac/__tests__/integration.test.tsx`)

```tsx
import { render, screen } from "@testing-library/react";
import { SessionProvider } from "next-auth/react";
import { ProtectedComponent } from "../components/ProtectedComponent";

const mockSession = {
  user: {
    id: "user123",
    grants: ["users:list"],
    roles: ["editor"],
    appId: "default",
  },
};

describe("RBAC Integration", () => {
  it("renders protected content for authorized user", () => {
    render(
      <SessionProvider session={mockSession}>
        <ProtectedComponent grants={["users:list"]}>
          <div>Protected Content</div>
        </ProtectedComponent>
      </SessionProvider>
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("renders access denied for unauthorized user", () => {
    render(
      <SessionProvider session={mockSession}>
        <ProtectedComponent grants={["admin:delete"]}>
          <div>Protected Content</div>
        </ProtectedComponent>
      </SessionProvider>
    );

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });
});
```

## File Structure & Implementation Checklist

```
src/42go/rbac/
├── index.ts                    # Main exports
├── types.ts                    # Client-specific RBAC types
├── hooks/
│   ├── useGrants.ts           # Main permission hook
│   └── useRBACSession.ts      # Session wrapper hook
├── lib/
│   ├── client.ts              # Session permission checker
│   ├── http.ts                # HTTP permission checker
│   └── grants.ts              # Import from [aai] - wildcard matching
├── components/
│   ├── AccessDenied.tsx       # Access denied UI
│   ├── LoadingStates.tsx      # Loading components
│   └── ProtectedComponent.tsx # Permission wrapper
└── __tests__/
    ├── useGrants.test.tsx     # Hook unit tests
    └── integration.test.tsx   # Component integration tests

src/42go/auth/
├── types.ts                   # NextAuth type extensions (NEW)
└── lib/callbacks.ts           # Enhanced with permissions (UPDATED)

src/app/api/rbac/
└── check/route.ts             # Realtime permission API (NEW)
```

### Implementation Dependencies

**From [aai] RBAC Infrastructure** (Must be completed first):

- `src/42go/rbac/lib/db.ts` - `getUserGrants()`, `getUserRoles()`, `hasGrants()`, `hasRoles()`
- `src/42go/rbac/lib/grants.ts` - `matchesPattern()` wildcard support
- `src/42go/rbac/types.ts` - `RBACPolicyBase` interface

**Imports Required**:

```ts
// From [aai]
import {
  getUserGrants,
  getUserRoles,
  hasGrants,
  hasRoles,
} from "@/42go/rbac/lib/db";
import { matchesPattern } from "@/42go/rbac/lib/grants";
import { RBACPolicyBase } from "@/42go/rbac/types";

// NextAuth
import { useSession } from "next-auth/react";
import { getServerSession } from "next-auth";

// App utilities
import { cn } from "@/lib/utils";
```

## Execution Strategy

### Critical Path: Session Enhancement FIRST

**Phase 0 is MANDATORY** - the entire hook depends on permissions being available in the session. Without this, the session-first strategy fails.

1. **Update callbacks.ts** to embed permissions in JWT/session
2. **Add type declarations** for extended session interface
3. **Test session** contains grants/roles before proceeding
4. **Then implement** the hooks and components

### Permission Strategy: Session-First, HTTP-Fallback

- **Default Behavior**: Use session cache (fast, no HTTP)
- **Realtime Checks**: Use HTTP API (slow, but current data)
- **Security Note**: Client permissions are for UI only - server validation is ALWAYS required

### Testing Strategy

- **Unit Tests**: Mock useSession and verify hook logic
- **Integration Tests**: Render components with SessionProvider
- **Manual Testing**: Verify JWT contains permissions after login

## Error Handling Strategy

### Permission Check Failures

- **Session Unavailable**: Return `allowed: false, loading: false`
- **HTTP API Failure**: Fail closed (`allowed: false`) with error message
- **Database Error**: Logged but doesn't crash user experience
- **Invalid Policy**: Clear error messages for debugging

### Loading State Management

- **Session Loading**: Show loading until session available
- **Realtime Loading**: Show loading during HTTP request
- **Quick Checks**: Debounce loading state to prevent flicker
- **Error Recovery**: Clear loading on error

## Architecture Decisions

### JWT Permission Embedding

- **Decision**: Embed grants/roles in NextAuth JWT token
- **Rationale**: Enables client-side cache without HTTP requests
- **Trade-off**: Permissions are snapshot at login, not realtime
- **Mitigation**: `realtime: true` forces fresh database lookup

### Session-First Strategy

- **Decision**: Check session cache before HTTP
- **Rationale**: 99% of UI protection doesn't need realtime data
- **Performance**: Zero HTTP requests for normal permission checks
- **Security**: Server-side validation still required for actual access

### Fail-Closed Security

- **Decision**: Default to `allowed: false` on errors
- **Rationale**: Security over convenience
- **Implementation**: Catch all errors and deny access
- **User Experience**: Clear error messages explain why access denied

## Real-World Usage Examples

### Menu Item Protection

```tsx
const UserMenu = () => {
  const access = useGrants({ grants: ["users:list"] });

  return (
    <nav>
      <Link href="/dashboard">Dashboard</Link>
      {access.allowed && <Link href="/users">Users</Link>}
      <Link href="/profile">Profile</Link>
    </nav>
  );
};
```

### Component Protection

```tsx
const AdminPanel = () => (
  <ProtectedComponent
    roles={["admin"]}
    fallback={<div>Admin access required</div>}
  >
    <AdminDashboard />
  </ProtectedComponent>
);
```

### Realtime Permission Check

```tsx
const DeleteButton = ({ userId }) => {
  const access = useGrants({
    grants: ["users:delete"],
    realtime: true, // Forces database check
  });

  if (access.loading) return <Spinner />;
  if (!access.allowed) return null;

  return <button onClick={() => deleteUser(userId)}>Delete</button>;
};
```

## Next Steps

**Execute task (k3)** - This story is ready for implementation.

After completing [aaj]:

1. **[aak]** RBAC Page & Route Protection - Server-side middleware
2. **[aal]** RBAC Menu Integration - Hook integration with existing menus
3. **[aam]** RBAC Advanced Features - Multi-app support, role inheritance

---

## Progress (2025-08-10)

This story has been implemented and integrated. The Users page is now protected for admins only using the client guard. A render loop issue was found and fixed.

### What shipped

- useRBACSession and useGrants hooks with session-first checks and realtime fallback
- Client permission checker with wildcard and ALL/ANY strategies
- HTTP realtime checker and `/api/rbac/check` endpoint
- UI components: AccessDenied, LoadingSpinner, ProtectedComponent
- RBAC docs with usage examples (`docs/articles/RBAC.md`)
- NextAuth JWT/session callbacks embedding roles/grants and a forced-RBAC-refresh via `update({ rbacRefresh: true })`
- Page protection added to `src/app/(app)/users/page.tsx` with `roles=["admin"]`

### Files changed (representative)

- src/42go/rbac/hooks/useRBACSession.ts
- src/42go/rbac/hooks/useGrants.ts
- src/42go/rbac/lib/client.ts
- src/42go/rbac/lib/http.ts
- src/42go/rbac/components/AccessDenied.tsx
- src/42go/rbac/components/LoadingStates.tsx
- src/42go/rbac/components/ProtectedComponent.tsx
- src/42go/rbac/index.ts and src/42go/rbac/client.ts
- src/42go/auth/lib/callbacks.ts (JWT/session embedding + refresh)
- src/app/api/rbac/check/route.ts
- src/app/(app)/users/page.tsx (guarded to admin)
- docs/articles/RBAC.md (guide)

### Issues encountered & fixes

- Symptom: Infinite re-render, “Maximum update depth exceeded” from `useGrants` in dev inspector.
- Root cause: Effect depended on the raw `policy` object identity; props change each render in React 19 + HMR.
- Fix: Memoized a normalized policy and switched effect deps to stable, primitive keys. Updated loading component handling to use memoized value.

### Acceptance Criteria — status

- Session Enhancement (JWT + session) — Done
- Session types include grants/roles/appId — Done
- useGrants returns loading/allowed/error and respects session-first — Done
- Realtime fallback via HTTP when `realtime: true` — Done
- Wildcards and ALL/ANY strategies — Done
- Loading states and friendly AccessDenied — Done
- ProtectedComponent wrapper — Done
- RBAC check API with fail-closed handling — Done
- Module exports wired — Done
- Documentation added — Done
- Tests — Deferred (explicitly skipped for now)

### Notes

- For server-side enforcement, continue with [aak].
- App-aware RBAC on JWT (per-request appId) is planned in [aan].

### Next steps

- Optional: add unit/integration tests for hooks and wrapper (deferred by request)
- Proceed to [aak] for server-side route/page protection
