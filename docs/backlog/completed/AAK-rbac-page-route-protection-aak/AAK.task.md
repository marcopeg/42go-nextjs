---
taskId: AAK
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-08-14T05:53:48+02:00
---

# RBAC Page & Route Protection [aak]

Implement `rbacPage` HOC for client page protection and `rbacRoute` wrapper for API route protection. These components provide redirect logic, HTTP status codes, and server-side validation.

**Part of RBAC Series**: [aai] → [aaj] → **[aak]** → [aal] → [aam]

**Prerequisites**:

- [aai] RBAC Database Schema & Core Infrastructure
- [aaj] RBAC useGrants Hook & Client Components

## Requirements Analysis

Build on the foundation to create page and API protection:

- **Client Pages**: HOC wrapper for `/src/app/(app)/` routes
- **API Routes**: Wrapper for Next.js API route handlers
- **Redirects**: Configurable redirect logic for unauthorized access
- **HTTP Status**: Proper 401/403 responses for API routes

## Core Components

### rbacPage (HOC for Client Pages)

High-Order Component for client-side pages in `/src/app/(app)/` routes.

```tsx
const AdminPage = () => {
  return <div>Admin Dashboard</div>;
};

export default rbacPage(AdminPage, {
  grants: ["users:list"],
  roles: ["backoffice"],
  loadingComponent: CustomSpinner,
  redirectTo: "/unauthorized",
} satisfies RBACPolicyClient);
```

**Features**:

- Loading states during permission check
- Configurable redirect on unauthorized access
- Uses `useGrants` internally from [aaj]
- Support for wildcard grants (`users:*`)

### rbacRoute (API Route Protection)

Wrapper function for Next.js API route handlers.

```ts
export const getTodos = async () => {
  return Response.json({ items: [{ id: 1, title: "buy milk" }] });
};

export const GET = rbacRoute(getTodos, {
  grants: ["todos:read"],
  roles: ["user"],
  realtime: true, // Force real-time check for critical API
} satisfies RBACPolicyServer);
```

**Features**:

- Returns 401/403 HTTP status codes
- Server-side session validation
- Database permission lookup
- Real-time permission checking

## Server-Side Policy Interface

Minimal, performance-focused policy for API routes:

```ts
interface RBACPolicyServer extends RBACPolicyBase {
  // No UI components or callbacks needed
  // Inherits: grants, roles, grantsStrategy, rolesStrategy, realtime, appId
}

interface ServerAccessResult {
  status: "granted" | "unauthenticated" | "forbidden";
  reason?: string;
}
```

## Redirect Logic

### Client-Side Redirects

```tsx
// Static redirect
redirectTo: "/unauthorized";

// Dynamic redirect with reason
redirectTo: (reason: string) => {
  if (reason.includes("unauthenticated")) {
    return "/login";
  }
  return "/unauthorized";
};

// Custom unauthorized handler
onUnauthorized: (reason: string) => {
  toast.error("Access denied: " + reason);
  router.push("/unauthorized");
};
```

### Server-Side Error Responses

```ts
interface ErrorResponse {
  error: string;
  message: string;
  timestamp: string;
}

// 401 - Unauthenticated
{
  error: "Unauthorized",
  message: "Authentication required",
  timestamp: "2025-08-07T10:30:00Z"
}

// 403 - Forbidden
{
  error: "Forbidden",
  message: "Insufficient permissions",
  timestamp: "2025-08-07T10:30:00Z"
}
```

## Goals

- [ ] Implement `rbacPage` HOC for client page protection
- [ ] Implement `rbacRoute` wrapper for API route protection
- [ ] Add configurable redirect logic for unauthorized access
- [ ] Create server-side session validation
- [ ] Implement proper HTTP status codes (401/403)
- [ ] Add real-time permission checking for API routes
- [ ] Create unauthorized page component
- [ ] Add comprehensive error handling
- [ ] Support custom redirect functions
- [ ] Create integration tests for both components

## Acceptance Criteria

### Client Page Protection

- [ ] `rbacPage(Component, policy)` protects client pages
- [ ] HOC redirects unauthorized users to specified routes
- [ ] Loading states work during permission checks
- [ ] Custom loading components display correctly
- [ ] Wildcard grants work in page protection

### API Route Protection

- [ ] `rbacRoute(handler, policy)` protects API routes
- [ ] Returns proper HTTP status codes (401 for unauth, 403 for forbidden)
- [ ] Server-side session validation works correctly
- [ ] Real-time database permission checks work
- [ ] Error responses include clear messages

### Integration

- [ ] Both components use core infrastructure from [aai]
- [ ] rbacPage uses useGrants hook from [aaj]
- [ ] App-scoped permissions work correctly
- [ ] Performance optimized for frequent requests

### Developer Experience

- [ ] Clear TypeScript types for both wrappers
- [ ] Comprehensive error messages
- [ ] Easy-to-use API with satisfies syntax
- [ ] Documentation includes usage examples

### Testing & Quality

- [ ] Unit tests for both rbacPage and rbacRoute
- [ ] Integration tests with actual pages and API routes
- [ ] Tests cover redirect scenarios
- [ ] Tests verify HTTP status codes

## Development Plan

### Phase 1: rbacPage HOC

**1.1 Page Protection HOC** (`src/42go/rbac/components/rbacPage.tsx`)

```tsx
export function rbacPage<P extends {}>(
  Component: ComponentType<P>,
  policy: RBACPolicyClient
) {
  const ProtectedComponent = (props: P) => {
    const router = useRouter();
    const permission = useGrants(policy);

    useEffect(() => {
      if (!permission.loading && !permission.allowed) {
        if (policy.onUnauthorized) {
          policy.onUnauthorized(permission.error || "Access denied");
        }

        if (policy.redirectTo) {
          const redirectPath =
            typeof policy.redirectTo === "function"
              ? policy.redirectTo(permission.error || "Access denied")
              : policy.redirectTo;

          router.push(redirectPath);
        }
      }
    }, [permission.loading, permission.allowed, permission.error, router]);

    if (permission.loading) {
      return permission.loadingComponent || <DefaultLoader />;
    }

    if (!permission.allowed) {
      // Show unauthorized component until redirect completes
      return <AccessDenied reason={permission.error} />;
    }

    return <Component {...props} />;
  };

  ProtectedComponent.displayName = `rbacPage(${
    Component.displayName || Component.name
  })`;

  return ProtectedComponent;
}
```

**1.2 Unauthorized Page** (`src/42go/rbac/components/UnauthorizedPage.tsx`)

- Full-page unauthorized component
- Configurable messaging
- Navigation options

### Phase 2: rbacRoute Wrapper

**2.1 API Route Protection** (`src/42go/rbac/utils/rbacRoute.ts`)

```ts
export function rbacRoute<T extends (...args: any[]) => any>(
  handler: T,
  policy: RBACPolicyServer
): T {
  return (async (...args: Parameters<T>) => {
    try {
      const result = await checkServerAccess(policy);

      switch (result.status) {
        case "unauthenticated":
          return Response.json(
            {
              error: "Unauthorized",
              message: "Authentication required",
              timestamp: new Date().toISOString(),
            } as ErrorResponse,
            { status: 401 }
          );

        case "forbidden":
          return Response.json(
            {
              error: "Forbidden",
              message: "Insufficient permissions",
              timestamp: new Date().toISOString(),
            } as ErrorResponse,
            { status: 403 }
          );

        case "granted":
          return await handler(...args);

        default:
          return Response.json(
            {
              error: "Internal Server Error",
              message: "Unexpected access control result",
              timestamp: new Date().toISOString(),
            } as ErrorResponse,
            { status: 500 }
          );
      }
    } catch (error) {
      console.error("Route protection error:", error);
      return Response.json(
        {
          error: "Internal Server Error",
          message: "Permission check failed",
          timestamp: new Date().toISOString(),
        } as ErrorResponse,
        { status: 500 }
      );
    }
  }) as T;
}
```

**2.2 Server Access Control** (`src/42go/rbac/lib/serverAccess.ts`)

- Server-side session validation
- Database permission lookup
- NextAuth integration for API routes

### Phase 3: Integration Components

**3.1 Loading Components** (`src/42go/rbac/components/DefaultLoader.tsx`)

- Default loading spinner for rbacPage
- Skeleton loaders
- Configurable loading states

**3.2 Error Components** (`src/42go/rbac/components/ErrorPages.tsx`)

- 401 Unauthorized page
- 403 Forbidden page
- Generic access denied component

### Phase 4: Testing & Documentation

**4.1 Integration Tests**

- Test rbacPage with actual Next.js pages
- Test rbacRoute with API endpoints
- Test redirect scenarios

**4.2 Usage Examples** (`src/42go/rbac/examples/`)

- Example protected pages
- Example protected API routes
- Documentation and README

## Key Implementation Details

### Server-Side Session Access

```ts
const checkServerAccess = async (
  policy: RBACPolicyServer
): Promise<ServerAccessResult> => {
  // Get session from NextAuth
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return {
      status: "unauthenticated",
      reason: "No active session",
    };
  }

  // Check permissions using core utilities from [aai]
  const hasPermission = await checkUserPermissions(session.user.id, policy);

  if (!hasPermission) {
    return {
      status: "forbidden",
      reason: "Insufficient permissions",
    };
  }

  return { status: "granted" };
};
```

### Redirect Logic Implementation

```ts
const handleRedirect = (
  policy: RBACPolicyClient,
  error: string,
  router: NextRouter
) => {
  if (policy.onUnauthorized) {
    policy.onUnauthorized(error);
  }

  if (policy.redirectTo) {
    const redirectPath =
      typeof policy.redirectTo === "function"
        ? policy.redirectTo(error)
        : policy.redirectTo;

    router.push(redirectPath);
  }
};
```

## Architecture Decisions

### HOC Pattern for Pages

- **Decision**: Higher-Order Component pattern for page protection
- **Rationale**: Clean API, reusable, follows React patterns
- **Implementation**: Wraps component with permission checking logic

### Wrapper Function for API Routes

- **Decision**: Function wrapper pattern for API route protection
- **Rationale**: Matches Next.js API route patterns, easy to apply
- **Implementation**: Intercepts requests before handler execution

### Server-Side Validation

- **Decision**: Always validate permissions server-side for API routes
- **Rationale**: Security cannot rely on client-side checks
- **Implementation**: Direct database queries with session validation

## Legacy Code Adaptation

### Route Protection Reference

```ts
// Legacy route protection for reference
export async function protectRoute(
  req: NextRequest,
  options: AccessControlOptions
): Promise<NextResponse> {
  try {
    const result = await checkAccess(options);

    switch (result.status) {
      case "unauthenticated":
        return NextResponse.json(
          { error: "Unauthorized", message: "Authentication required" },
          { status: 401 }
        );
      case "forbidden":
        return NextResponse.json(
          { error: "Forbidden", message: "Access denied" },
          { status: 403 }
        );
      case "granted":
        return NextResponse.next();
    }
  } catch (error) {
    console.error("Route protection error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
```

## Next Steps

Implement [aal] RBAC Menu Integration
