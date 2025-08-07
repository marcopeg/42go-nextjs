# Add RBAC to the users system [aai]

Implement Role-Based Access Control (RBAC) guards that integrate with the existing authentication system and provide feature flag-like protection for pages, APIs, and components.

The RBAC database structure exists (migrations `20240522_acl.js`) and contains user roles/grants, but lacks the guard components and hooks to enforce permissions in the application.

## Requirements Analysis

Based on project analysis:

- **Database**: RBAC tables exist (`auth.roles`, `auth.grants`, `auth.roles_users`, `auth.roles_grants`)
- **Test Data**: Seed data provides users with different roles (`admin`, `john`, `jane`) and grants (`users:list`, `users:edit`)
- **Session**: NextAuth.js manages authentication with JWT tokens containing user ID
- **AppConfig**: Menu system ready for RBAC integration via `app.menu.{top|bottom|mobile}.items`

## Core Components Needed

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
- Renders unauthorized page on failure
- Support for wildcard grants (`users:*`)

NOTE: this may use `useGrants` internally as described later.

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

### useGrants (React Hook)

Client-side hook for conditional rendering and component-level access control.

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

**Features**:

- Loading state management
- Real-time permission checking
- Optimized with session context

## AppConfig Menu Integration

The existing AppConfig structure contains menu items that need RBAC support:

- `AppConfig.app.menu.top.items`
- `AppConfig.app.menu.bottom.items`
- `AppConfig.app.menu.mobile.items`

**Current Structure** (from `src/AppConfig.ts`):

```ts
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

**Enhanced Structure** (with RBAC):

```ts
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
      ];
    }
  }
}
```

**Integration Points**:

- Menu rendering components filter items based on user permissions
- Server-side menu calculation for SSR compatibility
- Client-side menu updates when session changes

## Grant Matching Logic

The RBAC policy defines permission requirements using grants and roles:

```ts
// Base policy interface
interface RBACPolicyBase {
  grants?: string[]; // Required grants (wildcard support: "users:*") - ALL required by default
  roles?: string[]; // Required roles - ANY match by default
  grantsStrategy?: "ALL" | "ANY"; // Default: "ALL"
  rolesStrategy?: "ALL" | "ANY"; // Default: "ANY"
  realtime?: boolean; // Default: false, forces database check instead of session cache
  maxCacheAge?: number; // Optional: maximum age in seconds for cached permissions
  appId?: string; // Optional: specific app context (defaults to current AppConfig.name)
}

// Client-side policy with UI-specific options
interface RBACPolicyClient extends RBACPolicyBase {
  loadingComponent?: ComponentType | null; // Default: null (no loading UI)
  onUnauthorized?: (reason: string) => void; // Custom unauthorized handler
  redirectTo?: string | ((reason: string) => string); // Custom redirect logic
}

// Server-side policy - minimal, performance-focused
interface RBACPolicyServer extends RBACPolicyBase {
  // No UI components or callbacks needed
}

// Union type for flexibility
type RBACPolicy = RBACPolicyClient | RBACPolicyServer;
```

**Grant Resolution Process**:

1. **Session Lookup**: Get user ID from NextAuth session
2. **Cache Check**: If `realtime: false` (default), check session for cached roles/grants
3. **Database Fallback**: If cache miss or `realtime: true`, query database:
   - Query `auth.roles_users` for user roles
   - Query `auth.roles_grants` for role permissions
4. **Pattern Matching**: Support wildcard grants (`users:*` matches `users:list`, `users:edit`)
5. **Strategy Application**:
   - **Grants**: `ALL` by default (user must have ALL specified grants)
   - **Roles**: `ANY` by default (user needs just ONE of the specified roles)
6. **Session Update**: Cache results in session for subsequent requests

**Database Query Flow**:

```sql
-- Get user roles for specific app
SELECT role_id FROM auth.roles_users ru
JOIN auth.roles r ON ru.role_id = r.id
WHERE ru.user_id = ? AND r.app_id = ?

-- Get grants for roles in specific app
SELECT grant_id FROM auth.roles_grants rg
JOIN auth.grants g ON rg.grant_id = g.id
WHERE rg.role_id IN (...) AND g.app_id = ?

-- Pattern matching done in application code
```

## Goals

- [ ] **PREREQUISITE**: Migrate database schema to support multi-app RBAC
- [ ] Implement `rbacPage` HOC for client-side page protection
- [ ] Implement `rbacRoute` wrapper for API route protection
- [ ] Implement `useGrants` hook for component-level access control
- [ ] Create RBAC utilities for database permission lookup with app scoping
- [ ] Extend AppConfig types to support RBAC menu configuration
- [ ] Update menu rendering components to filter based on permissions
- [ ] Add proper TypeScript types for all RBAC interfaces
- [ ] Implement wildcard grant matching (`users:*`)
- [ ] Add loading states and error handling for all RBAC components
- [ ] Create comprehensive test coverage for RBAC functionality
- [ ] Implement "auth ping" mechanism for permission refresh
- [ ] Add `maxCacheAge` support for JWT rotation

## Acceptance Criteria

### Core Functionality

- [ ] **PREREQUISITE**: Modify existing migration to add `app_id` columns to roles/grants tables
- [ ] **PREREQUISITE**: Update seed data to use "default" app_id for existing entries
- [ ] **PREREQUISITE**: Recreate database with updated schema (early development advantage)
- [ ] `rbacPage(Component, policy)` protects client pages with redirect on unauthorized access
- [ ] `rbacRoute(handler, policy)` protects API routes with proper HTTP status codes (401/403)
- [ ] `useGrants(policy)` returns `{ loading, allowed }` for conditional rendering
- [ ] All components support wildcard grants and role/grant combinations
- [ ] Permission checks work with the existing NextAuth session system
- [ ] App-scoped permissions work correctly (roles/grants isolated per AppConfig)

### Database Integration

- [ ] RBAC utilities query existing database tables (`auth.roles`, `auth.grants`, etc.) with app scoping
- [ ] Wildcard grant matching works correctly (`users:*` matches `users:list`)
- [ ] Permission lookups are optimized to minimize database queries
- [ ] All database interactions use the existing Knex.js setup
- [ ] Updated migration works with database recreation strategy

### AppConfig Integration

- [ ] Menu items support optional `rbac` configuration
- [ ] Menu rendering filters items **client-side only** (no SSR for app layouts)
- [ ] AppConfig TypeScript types include RBAC definitions
- [ ] Smooth loading transitions for menu permission checks

### Developer Experience

- [ ] Clear TypeScript interfaces for all RBAC policies
- [ ] Comprehensive error messages for permission denials
- [ ] Loading states prevent UI flickering during permission checks
- [ ] Documentation includes usage examples and best practices

### Testing & Quality

- [ ] Unit tests cover all RBAC utilities and components
- [ ] Integration tests verify database permission lookups
- [ ] Error handling tests for invalid/missing permissions
- [ ] Performance tests ensure minimal impact on page load times

## Development Plan

### Phase 0: Database Schema Migration (CRITICAL)

**0.1 Modify Existing Migration** (`knex/migrations/20240522_acl.js`)

- Add `app_id` column to `auth.roles` table (TEXT NOT NULL DEFAULT 'default')
- Add `app_id` column to `auth.grants` table (TEXT NOT NULL DEFAULT 'default')
- Update unique constraints to be composite: `(app_id, title)` for both tables
- Early development advantage: Can modify existing migration and recreate database

**0.2 Update Seed Data** (`knex/seeds/20240522_init_auth_data.js`)

- Explicitly set `app_id: 'default'` for all existing roles and grants
- Ensure seed data works with new schema structure

**0.3 Database Recreation Strategy**

- Drop and recreate database with updated migration
- No migration strategy needed - early development benefit
- All existing data can be recreated from seeds

### Phase 1: Core RBAC Infrastructure

**1.1 Database Utilities** (`src/42go/rbac/lib/`)

- `db.ts` - Database permission lookup functions
- `grants.ts` - Grant matching logic with wildcard support
- `roles.ts` - Role checking functions
- `session.ts` - Session-based permission helpers

**1.2 TypeScript Interfaces** (`src/42go/rbac/types.ts`)

```ts
// Base policy interface
interface RBACPolicyBase {
  grants?: string[];
  roles?: string[];
  grantsStrategy?: "ALL" | "ANY";
  rolesStrategy?: "ALL" | "ANY";
  realtime?: boolean;
}

// Client-side policy with UI components
interface RBACPolicyClient extends RBACPolicyBase {
  loadingComponent?: ComponentType | null;
  onUnauthorized?: (reason: string) => void;
  redirectTo?: string | ((reason: string) => string);
}

// Server-side policy - minimal
interface RBACPolicyServer extends RBACPolicyBase {
  // No UI-specific properties
}

// Result types
interface GrantResult {
  loading: boolean;
  allowed: boolean;
  error?: string;
  loadingComponent?: ComponentType | null;
}

interface ServerAccessResult {
  status: "granted" | "unauthenticated" | "forbidden";
  reason?: string;
}
```

### Phase 2: Core Components

**2.1 useGrants Hook** (`src/42go/rbac/hooks/useGrants.ts`)

- Session context integration
- Database permission lookup
- Loading state management
- Error handling

**2.2 rbacPage HOC** (`src/42go/rbac/components/rbacPage.tsx`)

- Page-level protection
- Unauthorized redirects
- Loading UI during permission check

**2.3 rbacRoute Wrapper** (`src/42go/rbac/utils/rbacRoute.ts`)

- API route protection
- HTTP status code responses
- Server-side session validation

### Phase 3: AppConfig Integration

**3.1 TypeScript Extensions**

- Extend `TAppLayoutNavItem` type to include optional `rbac: RBACPolicyClient`
- Update AppConfig interface to use client-side policy for menu items
- Ensure menu components can handle loading states and custom UI

**3.2 Menu Components**

- Update `SidebarMenu.tsx` to filter items based on permissions
- Add server-side menu filtering for SSR

### Phase 4: Implementation Files

**File Structure**:

```
src/42go/rbac/
├── index.ts                    # Main exports for library
├── types.ts                    # TypeScript interfaces
├── components/
│   ├── rbacPage.tsx           # Page HOC
│   └── AccessDenied.tsx       # Unauthorized component
├── hooks/
│   └── useGrants.ts           # Permission hook
├── lib/
│   ├── db.ts                  # Knex database utilities
│   ├── grants.ts              # Grant matching with wildcard
│   ├── roles.ts               # Role checking
│   ├── session.ts             # Session caching helpers
│   └── batch.ts               # Permission clustering
└── utils/
    └── rbacRoute.ts           # API protection
```

**Integration Point**: All RBAC code in `/src/42go` library, project-specific usage in `/src/app`

### Phase 5: Integration Points

**5.1 Session Enhancement**

- Extend NextAuth session callbacks to include user roles/grants
- Implement session-cached permissions for performance
- Support `realtime: true` override for critical operations

**5.2 Menu Integration**

- Update `src/42go/layouts/app/types.ts` with RBAC types
- Modify `src/42go/layouts/app/SidebarMenu.tsx` for client-side filtering
- Implement smooth loading transitions during permission checks

**5.3 Usage Examples**

- Create example protected pages in `/src/app/(app)/admin/` (project-specific)
- Add protected API routes demonstrating usage
- Document integration patterns in `/src/42go/rbac/README.md`

## Key Implementation Details

### Grant Wildcard Matching

```ts
const matchesPattern = (pattern: string, grantId: string): boolean => {
  const regexPattern = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace("\\*", ".*");
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(grantId);
};
```

### Database Query Optimization

- **Batch Permission Checks**: Cluster multiple policy checks into single database query
- **Knex.js Integration**: Adapt all database queries to use existing Knex setup
- **Session Caching**: Cache user permissions in JWT to minimize database hits
- **Efficient Joins**: Single query to get user roles and grants using joins

### Permission Clustering Strategy

```ts
// Batch multiple permission checks
const permissions = await checkMultiplePermissions([
  { grants: ["users:list"], roles: ["admin"] },
  { grants: ["posts:edit"], roles: ["editor"] },
  { grants: ["analytics:view"], roles: ["manager"] },
]);
```

### Error Handling Strategy

- Clear error messages for developers
- User-friendly access denied pages
- Proper HTTP status codes for APIs

## Architecture Decisions

### Multi-App Database Schema Extension

- **CRITICAL ISSUE**: Current RBAC tables lack app-scoped permissions
- **Problem**: All roles/grants are global, cannot isolate permissions per AppConfig
- **Solution**: Add `app_id` column to `auth.roles` and `auth.grants` tables
- **Early Development Advantage**: Can modify existing migration and recreate database
- **Impact**: Enables true multi-tenant RBAC with app-specific roles/grants

### Session-Cached Permissions with Realtime Override

- **Decision**: Cache user roles/grants in NextAuth JWT session by default
- **Rationale**: Significant performance improvement for frequent permission checks
- **Security**: JWT tokens are HTTP-only cookies, grants/roles exposure is minimal risk
- **Override**: `realtime: true` forces database lookup for critical operations
- **Implementation**: Extend NextAuth callbacks to include user permissions

### Short-Lived Token Strategy (Future Enhancement)

- **Challenge**: NextAuth doesn't support access/refresh token rotation natively
- **Workaround**: Implement "auth ping" mechanism for periodic permission refresh
- **Proposal**: Add `maxCacheAge` property to force JWT rotation without logout
- **Implementation**: Background API calls with `realtime: true` for cache invalidation

### Client-Side Only App Layout

- **Decision**: All authenticated app layouts render client-side only
- **Rationale**: Reduces server workload, eliminates SSR for protected content
- **Trade-off**: Initial loading state vs server performance
- **Implementation**: Loading states with smooth visual transitions

### Granular Policy Customization

- **Decision**: Rich policy interface with custom redirects and loading components
- **Rationale**: Maximum flexibility for different use cases
- **Implementation**: Optional callbacks and component overrides in policy

### Wildcard Grant Support

- **Decision**: Support `users:*` pattern matching
- **Rationale**: Flexible permission management, follows existing patterns
- **Implementation**: Regex-based pattern matching in application code

### JWT Security for Cached Permissions

- **Decision**: Store user roles/grants in NextAuth JWT session
- **Security Analysis**:
  - JWT tokens are HTTP-only cookies (not accessible to client JS)
  - Role/grant information is not sensitive data (no PII or secrets)
  - Comparable to storing user ID/email already in session
  - Performance benefits outweigh minimal exposure risk
- **Mitigation**: `realtime: true` option for highly sensitive operations

### Auth Ping Mechanism (Workaround for NextAuth Limitations)

- **Problem**: NextAuth doesn't support access/refresh token rotation
- **Solution**: Implement periodic "auth ping" to refresh permissions
- **Implementation**:
  - Background API call every N minutes to `/api/auth/ping`
  - Endpoint uses `realtime: true` to force fresh permission lookup
  - Updates session with new permissions without logout
- **Configuration**: Configurable ping interval (5m-1h recommended)

### MaxCacheAge Implementation

- **Feature**: `maxCacheAge` property forces JWT refresh without logout
- **Mechanism**:
  - Track timestamp of last permission cache update in JWT
  - Compare against `maxCacheAge` on each request
  - If expired, force database lookup and JWT update
  - Use NextAuth's JWT callback to update session data
- **Benefits**: Ensures recent permissions without full logout/login cycle

### Loading States

- **Decision**: All RBAC components provide loading states
- **Rationale**: Prevent UI flickering during async permission checks
- **Implementation**: Consistent loading patterns across all components

## Next Steps

Execute task (k3)

## Future Enhancement Stories

Based on the discussion, these advanced features should be separate stories:

**[FUTURE] RBAC Audit Trail System**

- Log all permission checks and access attempts
- Track role/grant changes with timestamps
- Administrative audit interface

**[FUTURE] RBAC Development & Testing Tools**

- Permission debugging utilities
- Test fixtures for RBAC scenarios
- Development mode permission inspector

**[FUTURE] RBAC Performance Optimization**

- Advanced caching strategies
- Permission clustering optimizations
- Performance monitoring and alerting

**[FUTURE] RBAC Error Boundaries & Advanced Handling**

- React error boundaries for permission failures
- Advanced error recovery strategies
- User-friendly error messaging system
  }

````

**Integration Points**:
- Menu rendering components filter items based on user permissions
- Server-side menu calculation for SSR compatibility
- Client-side menu updates when session changes

## Grant Matching Logic

The RBAC policy defines permission requirements using grants and roles:

```ts
interface RBACPolicy {
  grants?: string[];  // Required grants (wildcard support: "users:*")
  roles?: string[];   // Required roles
  strategy?: "ALL" | "ANY"; // Default: "ALL"
}
````

**Grant Resolution Process**:

1. **Session Lookup**: Get user ID from NextAuth session
2. **Role Resolution**: Query `auth.roles_users` for user roles
3. **Grant Resolution**: Query `auth.roles_grants` for role permissions
4. **Pattern Matching**: Support wildcard grants (`users:*` matches `users:list`, `users:edit`)
5. **Strategy Application**:
   - `ALL`: User must have ALL specified grants/roles
   - `ANY`: User must have AT LEAST ONE specified grant/role

**Database Query Flow**:

```sql
-- Get user roles
SELECT role_id FROM auth.roles_users WHERE user_id = ?

-- Get grants for roles
SELECT grant_id FROM auth.roles_grants WHERE role_id IN (...)

-- Pattern matching done in application code
```

## Legacy Code for Inspiration

This is code copied from a legacy project that did implement the feature.

**access-control.ts**

```ts
import { sessionHasGrants } from "./grants";
import { sessionHasRoles, RoleMatchStrategy } from "./roles";

/**
 * Options for access control
 */
export interface AccessControlOptions {
  /**
   * Array of grant IDs required to access the resource
   */
  grants?: string[];

  /**
   * Array of role IDs required to access the resource
   */
  roles?: string[];

  /**
   * Strategy for role matching (ALL or ANY)
   * @default RoleMatchStrategy.ALL
   */
  roleStrategy?: RoleMatchStrategy;
}

/**
 * Result of an access control check
 */
export interface AccessControlResult {
  /**
   * Status of the access control check
   * - 'granted': Access is granted
   * - 'unauthenticated': User is not authenticated
   * - 'forbidden': User is authenticated but does not have the required access
   */
  status: "granted" | "unauthenticated" | "forbidden";

  /**
   * Reason for the access control result
   */
  reason?: string;
}

/**
 * Checks if the current session user has the required grants and roles
 *
 * @param options Access control options
 * @returns Promise<AccessControlResult> Result of the access control check
 */
export async function checkAccess(
  options: AccessControlOptions
): Promise<AccessControlResult> {
  const { grants, roles, roleStrategy = RoleMatchStrategy.ALL } = options;

  // If no grants or roles are specified, allow access
  if ((!grants || grants.length === 0) && (!roles || roles.length === 0)) {
    return { status: "granted" };
  }

  // Check grants if specified
  if (grants && grants.length > 0) {
    const hasGrants = await sessionHasGrants(grants);
    if (!hasGrants) {
      return {
        status: "forbidden",
        reason: "Missing required grants",
      };
    }
  }

  // Check roles if specified
  if (roles && roles.length > 0) {
    const hasRoles = await sessionHasRoles(roles, roleStrategy);
    if (!hasRoles) {
      return {
        status: "forbidden",
        reason: "Missing required roles",
      };
    }
  }

  return { status: "granted" };
}
```

**grants.ts**

```ts
import { db } from "@/lib/db";
import { rolesUsers, rolesGrants } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * Enum representing different matching strategies for checking grants
 */
export enum GrantMatchStrategy {
  ALL = "all", // User must have all specified grants
  ANY = "any", // User must have at least one of the specified grants
}

/**
 * Checks if a pattern matches a specific grant ID
 * Supports wildcards with '*' (e.g., 'users:*' matches 'users:list', 'users:edit', etc.)
 *
 * @param pattern The pattern to match (can include '*' as wildcard)
 * @param grantId The specific grant ID to check against the pattern
 * @returns boolean True if the grantId matches the pattern
 */
function matchesPattern(pattern: string, grantId: string): boolean {
  // Convert the pattern to a regex pattern
  // Replace '*' with '.*' for regex wildcard and escape other special chars
  const regexPattern = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // Escape special chars
    .replace("\\*", ".*"); // Replace escaped * with .* for wildcard

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(grantId);
}

/**
 * Checks if a user has the specified grants based on the matching strategy
 * Now supports wildcard patterns in grantIds (e.g., 'users:*')
 *
 * @param userId The ID of the user to check
 * @param grantIds Array of grant IDs or patterns to check for
 * @param strategy The matching strategy (ALL or ANY)
 * @returns Promise<boolean> True if the user has the specified grants according to the strategy
 */
export async function hasGrants(
  userId: string,
  grantIds: string[],
  strategy: GrantMatchStrategy = GrantMatchStrategy.ALL
): Promise<boolean> {
  if (!userId || !grantIds.length) {
    return false;
  }

  // Separate exact match IDs and pattern IDs
  const exactMatchIds = grantIds.filter((id) => !id.includes("*"));
  const patternIds = grantIds.filter((id) => id.includes("*"));

  // Get all user role IDs
  const userRoles = await db
    .select({ roleId: rolesUsers.roleId })
    .from(rolesUsers)
    .where(eq(rolesUsers.userId, userId));

  if (!userRoles.length) {
    return false;
  }

  const userRoleIds = userRoles.map((role) => role.roleId);

  // Get all grants that the user has through their roles
  const userGrants = await db
    .select({ grantId: rolesGrants.grantId })
    .from(rolesGrants)
    .where(inArray(rolesGrants.roleId, userRoleIds));

  if (!userGrants.length) {
    return false;
  }

  const userGrantIds = userGrants.map((g) => g.grantId);

  // Check for exact matches
  const exactMatches = exactMatchIds.filter((id) => userGrantIds.includes(id));

  // Check for pattern matches
  let patternMatches: string[] = [];
  if (patternIds.length > 0) {
    // For each pattern, check if any of the user's grants match
    patternMatches = patternIds.filter((pattern) =>
      userGrantIds.some((grantId) => matchesPattern(pattern, grantId))
    );
  }

  // Combine the matches
  const matchedGrants = [...exactMatches, ...patternMatches];

  // For ALL strategy, all specified grants must match
  if (strategy === GrantMatchStrategy.ALL) {
    return matchedGrants.length === grantIds.length;
  }

  // For ANY strategy, at least one grant must match
  return matchedGrants.length > 0;
}

/**
 * Middleware utility to check if the current session user has the required grants
 * Now fetches the session internally
 *
 * @param grantIds Array of grant IDs to check for (optional)
 * @param strategy The matching strategy (ALL or ANY)
 * @returns Promise<boolean> True if the session user has the specified grants or just has an active session if no grants specified
 */
export async function sessionHasGrants(
  grantIds?: string[],
  strategy: GrantMatchStrategy = GrantMatchStrategy.ALL
): Promise<boolean> {
  const { auth } = await import("@/lib/auth/auth");
  const session = await auth();

  if (!session?.user?.id) {
    return false;
  }

  // If no grants are specified, just check for active session
  if (!grantIds || grantIds.length === 0) {
    return true;
  }

  return hasGrants(session.user.id, grantIds, strategy);
}
```

**roles.ts**

```ts
import { db } from "@/lib/db";
import { rolesUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Enum representing different matching strategies for checking roles
 */
export enum RoleMatchStrategy {
  ALL = "all", // User must have all specified roles
  ANY = "any", // User must have at least one of the specified roles
}

/**
 * Checks if a user has the specified roles based on the matching strategy
 *
 * @param userId The ID of the user to check
 * @param roleIds Array of role IDs to check for
 * @param strategy The matching strategy (ALL or ANY)
 * @returns Promise<boolean> True if the user has the specified roles according to the strategy
 */
export async function hasRoles(
  userId: string,
  roleIds: string[],
  strategy: RoleMatchStrategy = RoleMatchStrategy.ALL
): Promise<boolean> {
  if (!userId || !roleIds.length) {
    return false;
  }

  // Get all user role IDs
  const userRoles = await db
    .select({ roleId: rolesUsers.roleId })
    .from(rolesUsers)
    .where(eq(rolesUsers.userId, userId));

  if (!userRoles.length) {
    return false;
  }

  const userRoleIds = userRoles.map((role) => role.roleId);

  // Check for matches
  const matchedRoles = roleIds.filter((id) => userRoleIds.includes(id));

  // For ALL strategy, all specified roles must match
  if (strategy === RoleMatchStrategy.ALL) {
    return matchedRoles.length === roleIds.length;
  }

  // For ANY strategy, at least one role must match
  return matchedRoles.length > 0;
}

/**
 * Middleware utility to check if the current session user has the required roles
 * Now fetches the session internally
 *
 * @param roleIds Array of role IDs to check for (optional)
 * @param strategy The matching strategy (ALL or ANY)
 * @returns Promise<boolean> True if the session user has the specified roles or just has an active session if no roles specified
 */
export async function sessionHasRoles(
  roleIds?: string[],
  strategy: RoleMatchStrategy = RoleMatchStrategy.ALL
): Promise<boolean> {
  const { auth } = await import("@/lib/auth/auth");
  const session = await auth();

  if (!session?.user?.id) {
    return false;
  }

  // If no roles are specified, just check for active session
  if (!roleIds || roleIds.length === 0) {
    return true;
  }

  return hasRoles(session.user.id, roleIds, strategy);
}
```

**route-protection.ts**

```ts
import { NextRequest, NextResponse } from "next/server";
import { checkAccess, AccessControlOptions } from "./access-control";

/**
 * Error response interface
 */
interface ErrorResponse {
  error: string;
  message: string;
}

/**
 * Protects a route based on access control rules
 *
 * @param req The Next.js request object
 * @param options Access control options
 * @returns Promise<NextResponse> The response object
 */
export async function protectRoute(
  req: NextRequest,
  options: AccessControlOptions
): Promise<NextResponse> {
  try {
    const result = await checkAccess(options);

    switch (result.status) {
      case "unauthenticated":
        return NextResponse.json(
          {
            error: "Unauthorized",
            message: "Authentication required",
          } as ErrorResponse,
          { status: 401 }
        );
      case "forbidden":
        return NextResponse.json(
          { error: "Forbidden", message: "Access denied" } as ErrorResponse,
          { status: 403 }
        );
      case "granted":
        return NextResponse.next();
      default:
        return NextResponse.json(
          {
            error: "Internal Server Error",
            message: "Unexpected access control result",
          } as ErrorResponse,
          { status: 500 }
        );
    }
  } catch (error) {
    console.error("Route protection error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: "An unexpected error occurred",
      } as ErrorResponse,
      { status: 500 }
    );
  }
}
```

**use-user-grants.ts**

```ts
"use client";

import { useCachedSession } from "./use-cached-session";
import { useMemo } from "react";

/**
 * Hook to check if the current user has the required grants
 *
 * @param requiredGrants Array of grant IDs to check for
 * @returns Boolean indicating if the user has all required grants
 */
export function useUserGrants(requiredGrants?: string[]): boolean {
  const { data: session } = useCachedSession();

  return useMemo(() => {
    // If no grants are required, return true
    if (!requiredGrants || requiredGrants.length === 0) {
      return true;
    }

    // If no session or user, return false
    if (!session?.user) {
      return false;
    }

    // Get user grants from session
    const userGrants = session.user.grants || [];

    // Check if user has all required grants
    return requiredGrants.every((grant) => userGrants.includes(grant));
  }, [session, requiredGrants]);
}

/**
 * Hook to get all grants for the current user
 *
 * @returns Array of grant IDs the user has
 */
export function useAllUserGrants(): string[] {
  const { data: session } = useCachedSession();

  return useMemo(() => {
    if (!session?.user) {
      return [];
    }

    return session.user.grants || [];
  }, [session]);
}
```

**db/schema.ts**

```ts
import {
  text,
  timestamp,
  primaryKey,
  integer,
  pgSchema,
  pgTable,
} from "drizzle-orm/pg-core";

// Define the auth schema
const authSchema = pgSchema("auth");
// No need to define public schema as it's the default in PostgreSQL

// Users table
export const users = authSchema.table("users", {
  id: text("id").notNull().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Accounts table for OAuth providers
export const accounts = authSchema.table(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);

// Sessions table
export const sessions = authSchema.table("sessions", {
  sessionToken: text("session_token").notNull().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

// Verification tokens for email verification
export const verificationTokens = authSchema.table(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires").notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

// Feedback table for public contact form submissions - using pgTable for public schema
export const feedback = pgTable("feedback", {
  id: text("id").notNull().primaryKey(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Roles table
export const roles = authSchema.table("roles", {
  id: text("id").primaryKey(),
  title: text("title").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Roles Users table for user role memberships
export const rolesUsers = authSchema.table(
  "roles_users",
  {
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.roleId, table.userId],
    }),
  })
);

// Grants table
export const grants = authSchema.table("grants", {
  id: text("id").primaryKey(),
  title: text("title").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Roles Grants table for associating grants to roles
export const rolesGrants = authSchema.table(
  "roles_grants",
  {
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    grantId: text("grant_id")
      .notNull()
      .references(() => grants.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.roleId, table.grantId],
    }),
  })
);

// Export all schemas for migrations
const schemas = {
  users,
  accounts,
  sessions,
  verificationTokens,
  feedback,
  roles,
  rolesUsers,
  grants,
  rolesGrants,
};

export default schemas;
```
