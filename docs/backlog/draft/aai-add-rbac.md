# RBAC Database Schema & Core Infrastructure [aai]

Implement the foundational database schema and core utilities for Role-Based Access Control (RBAC) system. This is the first story in a series that will build a complete RBAC system.

**Part of RBAC Series**: [aai] → [aaj] → [aak] → [aal] → [aam]

## Requirements Analysis

Based on project analysis:

- **Database**: RBAC tables exist but lack multi-app support (`auth.roles`, `auth.grants`, `auth.roles_users`, `auth.roles_grants`)
- **Test Data**: Seed data provides users with different roles (`admin`, `john`, `jane`) and grants (`users:list`, `users:edit`)
- **Multi-App Issue**: Current schema is global, needs app-scoped permissions for AppConfig isolation
- **Early Development**: Can modify existing migration and recreate database

## Database Schema Changes

### Current Schema Issues

The existing RBAC tables lack app-scoped permissions:

```sql
-- Current (problematic)
CREATE TABLE auth.roles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,  -- Global uniqueness issue
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Required Schema Updates

Add `app_id` support for multi-tenant RBAC:

```sql
-- Updated schema
CREATE TABLE auth.roles (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL DEFAULT 'default',
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(app_id, title)  -- App-scoped uniqueness
);
```

## Core RBAC Interfaces

```ts
// Base policy interface
interface RBACPolicyBase {
  grants?: string[]; // Required grants (wildcard support: "users:*")
  roles?: string[]; // Required roles
  grantsStrategy?: "ALL" | "ANY"; // Default: "ALL"
  rolesStrategy?: "ALL" | "ANY"; // Default: "ANY"
  realtime?: boolean; // Default: false, forces database check
  appId?: string; // Optional: specific app context
}

// Result types
interface GrantResult {
  loading: boolean;
  allowed: boolean;
  error?: string;
}

interface ServerAccessResult {
  status: "granted" | "unauthenticated" | "forbidden";
  reason?: string;
}
```

## Grant Matching Logic

### Wildcard Pattern Matching

```ts
const matchesPattern = (pattern: string, grantId: string): boolean => {
  const regexPattern = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace("\\*", ".*");
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(grantId);
};
```

### Database Query Flow

```sql
-- Get user roles for specific app
SELECT role_id FROM auth.roles_users ru
JOIN auth.roles r ON ru.role_id = r.id
WHERE ru.user_id = ? AND r.app_id = ?

-- Get grants for roles in specific app
SELECT grant_id FROM auth.roles_grants rg
JOIN auth.grants g ON rg.grant_id = g.id
WHERE rg.role_id IN (...) AND g.app_id = ?
```

## Goals

- [ ] **PREREQUISITE**: Modify existing migration to add `app_id` columns
- [ ] **PREREQUISITE**: Update seed data for multi-app support
- [ ] **PREREQUISITE**: Recreate database with updated schema
- [ ] Create core RBAC TypeScript interfaces
- [ ] Implement database permission lookup utilities with app scoping
- [ ] Implement wildcard grant matching (`users:*`)
- [ ] Create session-based permission helpers
- [ ] Add basic error handling and validation
- [ ] Create unit tests for core utilities

## Acceptance Criteria

### Database Schema

- [ ] `auth.roles` table has `app_id` column with default 'default'
- [ ] `auth.grants` table has `app_id` column with default 'default'
- [ ] Unique constraints updated to be composite: `(app_id, title)`
- [ ] Seed data updated to explicitly use `app_id: 'default'`
- [ ] Database recreated successfully with new schema

### Core Infrastructure

- [ ] TypeScript interfaces defined for RBAC policies and results
- [ ] Database utilities support app-scoped permission lookups
- [ ] Wildcard grant matching works correctly (`users:*` matches `users:list`)
- [ ] Session-based permission helpers integrate with NextAuth
- [ ] All database interactions use existing Knex.js setup

### Testing & Quality

- [ ] Unit tests cover wildcard pattern matching
- [ ] Unit tests cover database permission lookups
- [ ] Unit tests cover app-scoped permission isolation
- [ ] Error handling for invalid grants/roles

## Development Plan

### Phase 0: Database Schema Migration

**0.1 Modify Existing Migration** (`knex/migrations/20240522_acl.js`)

- Add `app_id` column to `auth.roles` table (TEXT NOT NULL DEFAULT 'default')
- Add `app_id` column to `auth.grants` table (TEXT NOT NULL DEFAULT 'default')
- Update unique constraints to be composite: `(app_id, title)` for both tables

**0.2 Update Seed Data** (`knex/seeds/20240522_init_auth_data.js`)

- Explicitly set `app_id: 'default'` for all existing roles and grants
- Ensure seed data works with new schema structure

**0.3 Database Recreation**

- Drop and recreate database with updated migration
- Verify seed data loads correctly

### Phase 1: Core RBAC Infrastructure

**1.1 TypeScript Interfaces** (`src/42go/rbac/types.ts`)

```ts
interface RBACPolicyBase {
  grants?: string[];
  roles?: string[];
  grantsStrategy?: "ALL" | "ANY";
  rolesStrategy?: "ALL" | "ANY";
  realtime?: boolean;
  appId?: string;
}

interface GrantResult {
  loading: boolean;
  allowed: boolean;
  error?: string;
}

interface ServerAccessResult {
  status: "granted" | "unauthenticated" | "forbidden";
  reason?: string;
}
```

**1.2 Database Utilities** (`src/42go/rbac/lib/`)

- `db.ts` - App-scoped permission lookup functions
- `grants.ts` - Grant matching logic with wildcard support
- `roles.ts` - Role checking functions
- `session.ts` - Session-based permission helpers

**File Structure**:

```
src/42go/rbac/
├── index.ts           # Main exports
├── types.ts           # TypeScript interfaces
└── lib/
    ├── db.ts          # Knex database utilities
    ├── grants.ts      # Grant matching with wildcard
    ├── roles.ts       # Role checking
    └── session.ts     # Session helpers
```

## Legacy Code Reference

### Grant Matching (Drizzle → Knex adaptation needed)

```ts
// Legacy implementation for reference
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

  // Get user roles (adapt to Knex)
  const userRoles = await db
    .select({ roleId: rolesUsers.roleId })
    .from(rolesUsers)
    .where(eq(rolesUsers.userId, userId));

  // Get grants for roles (adapt to Knex)
  const userGrants = await db
    .select({ grantId: rolesGrants.grantId })
    .from(rolesGrants)
    .where(inArray(rolesGrants.roleId, userRoleIds));

  // Pattern matching logic
  const matchedGrants = [...exactMatches, ...patternMatches];

  if (strategy === GrantMatchStrategy.ALL) {
    return matchedGrants.length === grantIds.length;
  }
  return matchedGrants.length > 0;
}
```

## Architecture Decisions

### Multi-App Database Schema Extension

- **Problem**: Current RBAC tables are globally scoped
- **Solution**: Add `app_id` column to isolate permissions per AppConfig
- **Advantage**: Can modify existing migration in early development
- **Impact**: Enables true multi-tenant RBAC

### Knex.js Integration

- **Decision**: Adapt all database queries to use existing Knex setup
- **Rationale**: Maintain consistency with current project architecture
- **Implementation**: Convert Drizzle patterns from legacy code to Knex

## Next Steps

Implement [aaj] RBAC useGrants Hook & Client Components

## Next Steps

Implement [aaj] RBAC useGrants Hook & Client Components
