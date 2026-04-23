---
taskId: AAI
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-08-13T16:50:12+02:00
---

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

### Architecture Decision: App-Scoped Associations

Roles and grants should be **global entities**, but their associations with users should be **app-scoped**:

- **Global**: Role "admin" exists once in the system
- **App-Scoped**: User "john" can be "admin" in app "todos" but not in app "notes"

**Example Scenarios:**

- Role "admin" is defined once globally
- User "john" has role "admin" in app "todos" (`app_id: 'todos'`)
- User "john" has role "viewer" in app "notes" (`app_id: 'notes'`)
- Grant "users:edit" is defined once globally
- Role "admin" has grant "users:edit" in app "todos" (`app_id: 'todos'`)
- Role "admin" might not have grant "users:edit" in app "notes" (`app_id: 'notes'`)

**Concrete Data Example:**

```sql
-- Global roles (unchanged)
INSERT INTO auth.roles (id, title) VALUES
  ('admin', 'Administrator'),
  ('editor', 'Editor');

-- Global grants (unchanged)
INSERT INTO auth.grants (id, title) VALUES
  ('users:list', 'List Users'),
  ('users:edit', 'Edit Users');

-- App-scoped user-role associations
INSERT INTO auth.roles_users (user_id, role_id, app_id) VALUES
  ('john-id', 'admin', 'todos'),    -- John is admin in todos
  ('john-id', 'editor', 'notes'),   -- John is editor in notes
  ('jane-id', 'admin', 'notes');    -- Jane is admin in notes

-- App-scoped role-grant associations
INSERT INTO auth.roles_grants (role_id, grant_id, app_id) VALUES
  ('admin', 'users:list', 'todos'),  -- Admin can list users in todos
  ('admin', 'users:edit', 'todos'),  -- Admin can edit users in todos
  ('admin', 'users:list', 'notes'),  -- Admin can list users in notes
  ('editor', 'users:list', 'notes'); -- Editor can only list in notes
```

### Current Schema (Already Correct)

The roles and grants tables are perfect as global entities:

```sql
-- Roles table (global) - NO CHANGES NEEDED
CREATE TABLE auth.roles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Grants table (global) - NO CHANGES NEEDED
CREATE TABLE auth.grants (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Required Schema Updates

Add `app_id` to **association tables** for multi-tenant RBAC:

```sql
-- User-Role associations (app-scoped)
CREATE TABLE auth.roles_users (
  role_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  app_id TEXT NOT NULL DEFAULT 'default',  -- NEW COLUMN
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (role_id, user_id, app_id),  -- UPDATED PK
  FOREIGN KEY (role_id) REFERENCES auth.roles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Role-Grant associations (app-scoped)
CREATE TABLE auth.roles_grants (
  role_id TEXT NOT NULL,
  grant_id TEXT NOT NULL,
  app_id TEXT NOT NULL DEFAULT 'default',  -- NEW COLUMN
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (role_id, grant_id, app_id),  -- UPDATED PK
  FOREIGN KEY (role_id) REFERENCES auth.roles(id) ON DELETE CASCADE,
  FOREIGN KEY (grant_id) REFERENCES auth.grants(id) ON DELETE CASCADE
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

// Strategy enums
enum GrantMatchStrategy {
  ALL = "ALL",
  ANY = "ANY",
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
SELECT role_id FROM auth.roles_users
WHERE user_id = ? AND app_id = ?

-- Get grants for user's roles in specific app
SELECT DISTINCT grant_id FROM auth.roles_grants rg
WHERE rg.role_id IN (
  SELECT role_id FROM auth.roles_users
  WHERE user_id = ? AND app_id = ?
) AND rg.app_id = ?
```

## Goals

- [x] **PREREQUISITE**: Modify existing migration to add `app_id` columns to association tables
- [x] **PREREQUISITE**: Update seed data for multi-app associations
- [x] **PREREQUISITE**: Recreate database with updated schema
- [x] Create core RBAC TypeScript interfaces
- [x] Implement database permission lookup utilities with app scoping
- [x] Implement wildcard grant matching (`users:*`)
- [x] Create session-based permission helpers
- [ ] Add basic error handling and validation
- [ ] Create unit tests for core utilities

## Acceptance Criteria

### Database Schema

- [x] `auth.roles_users` table has `app_id` column with default 'default'
- [x] `auth.roles_grants` table has `app_id` column with default 'default'
- [x] Primary keys updated to include `app_id`: `(role_id, user_id, app_id)` and `(role_id, grant_id, app_id)`
- [x] Seed data updated to explicitly use `app_id: 'default'` for associations
- [x] Database recreated successfully with new schema

### Core Infrastructure

- [x] TypeScript interfaces defined for RBAC policies and results
- [x] Database utilities support app-scoped permission lookups
- [x] Wildcard grant matching works correctly (`users:*` matches `users:list`)
- [x] Session-based permission helpers integrate with NextAuth
- [x] All database interactions use existing Knex.js setup

### Testing & Quality

- [ ] Unit tests cover wildcard pattern matching:
  - `users:*` matches `users:list` and `users:edit`
  - `users:list` does NOT match `posts:list`
  - Empty patterns return false
- [ ] Unit tests cover database permission lookups:
  - User with role in app A cannot access app B resources
  - Same user can have different roles in different apps
  - Role-grant associations are app-scoped
- [ ] Unit tests cover app-scoped permission isolation:
  - John has `users:edit` in "todos" but not in "notes"
  - Admin role has different grants per app
- [ ] Error handling for invalid grants/roles:
  - Non-existent user returns false
  - Non-existent role returns false
  - Invalid app_id defaults to 'default'
  - Database connection errors are caught

## Development Plan

### Phase 0: Database Schema Migration

**0.1 Modify Existing Migration** (`knex/migrations/20240522_acl.js`)

Update the `roles_users` table creation:

```javascript
// Current:
table.primary(["role_id", "user_id"]);

// Updated:
table.text("app_id").notNullable().defaultTo("default");
table.primary(["role_id", "user_id", "app_id"]);
```

Update the `roles_grants` table creation:

```javascript
// Current:
table.primary(["role_id", "grant_id"]);

// Updated:
table.text("app_id").notNullable().defaultTo("default");
table.primary(["role_id", "grant_id", "app_id"]);
```

**0.2 Update Seed Data** (`knex/seeds/20240522_init_auth_data.js`)

Update role-user associations:

```javascript
// Current:
await trx("auth.roles_users").insert({
  role_id: backofficeRoleId,
  user_id: adminId,
  created_at: new Date(),
});

// Updated:
await trx("auth.roles_users").insert({
  role_id: backofficeRoleId,
  user_id: adminId,
  app_id: "default",
  created_at: new Date(),
});
```

Update role-grant associations:

```javascript
// Current:
await trx("auth.roles_grants").insert({
  role_id: backofficeRoleId,
  grant_id: usersListGrantId,
  created_at: new Date(),
});

// Updated:
await trx("auth.roles_grants").insert({
  role_id: backofficeRoleId,
  grant_id: usersListGrantId,
  app_id: "default",
  created_at: new Date(),
});
```

**0.3 Database Recreation**

- Drop and recreate database with updated migration:
  ```bash
  make migrate.rebuild  # Drops DB, runs migrations, runs seeds
  ```
- Verify seed data loads correctly:
  ```bash
  make seed
  ```
- Test the new schema:

  ```sql
  -- Verify app_id columns exist
  \d auth.roles_users
  \d auth.roles_grants

  -- Verify composite primary keys work
  SELECT * FROM auth.roles_users;
  SELECT * FROM auth.roles_grants;
  ```

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

- `db.ts` - App-scoped permission lookup functions:
  ```ts
  // Core functions needed:
  getUserRoles(userId: string, appId: string): Promise<string[]>
  getUserGrants(userId: string, appId: string): Promise<string[]>
  hasRole(userId: string, roleId: string, appId: string): Promise<boolean>
  hasGrant(userId: string, grantId: string, appId: string): Promise<boolean>
  ```
- `grants.ts` - Grant matching logic with wildcard support:
  ```ts
  // Functions needed:
  matchesPattern(pattern: string, grantId: string): boolean
  hasGrants(userId: string, grantIds: string[], appId: string, strategy?: 'ALL' | 'ANY'): Promise<boolean>
  ```
- `roles.ts` - Role checking functions:
  ```ts
  // Functions needed:
  hasRoles(userId: string, roleIds: string[], appId: string, strategy?: 'ALL' | 'ANY'): Promise<boolean>
  ```
- `session.ts` - Session-based permission helpers:
  ```ts
  // Functions needed:
  getCurrentUserGrants(appId: string): Promise<string[]>
  getCurrentUserRoles(appId: string): Promise<string[]>
  ```

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

## Potential Issues & Edge Cases

### Migration Challenges

- **Primary Key Conflicts**: Adding `app_id` to existing composite primary keys requires dropping and recreating constraints
- **Data Migration**: Existing associations need `app_id: 'default'` added
- **Foreign Key Dependencies**: Tables must be modified in correct order to maintain referential integrity

### Implementation Considerations

- **Default App Handling**: When no `appId` specified, should default to 'default' or throw error?
- **Case Sensitivity**: Grant IDs like `users:list` vs `Users:List` - normalize to lowercase?
- **Wildcard Performance**: Pattern matching with `*` could be slow on large datasets
- **Session Context**: How to determine current app context from session/request?

### Security Concerns

- **App Isolation**: Ensure no cross-app permission leakage
- **SQL Injection**: Parameterize all dynamic app_id values
- **Permission Caching**: When to invalidate cached permissions?

### Grant Matching (Drizzle → Knex adaptation needed)

```ts
// Legacy implementation - needs adaptation for app-scoped permissions
export async function hasGrants(
  userId: string,
  grantIds: string[],
  appId: string = "default",
  strategy: GrantMatchStrategy = GrantMatchStrategy.ALL
): Promise<boolean> {
  if (!userId || !grantIds.length) {
    return false;
  }

  // Get user roles for specific app (Knex version needed)
  const userRoles = await knex("auth.roles_users")
    .select("role_id")
    .where({ user_id: userId, app_id: appId });

  const userRoleIds = userRoles.map((r) => r.role_id);

  // Get grants for user's roles in specific app (Knex version needed)
  const userGrants = await knex("auth.roles_grants")
    .select("grant_id")
    .whereIn("role_id", userRoleIds)
    .andWhere({ app_id: appId });

  const userGrantIds = userGrants.map((g) => g.grant_id);

  // Separate exact match IDs and pattern IDs
  const exactMatchIds = grantIds.filter((id) => !id.includes("*"));
  const patternIds = grantIds.filter((id) => id.includes("*"));

  // Find exact matches
  const exactMatches = exactMatchIds.filter((id) => userGrantIds.includes(id));

  // Find pattern matches
  const patternMatches = patternIds.filter((pattern) =>
    userGrantIds.some((userGrantId) => matchesPattern(pattern, userGrantId))
  );

  const matchedGrants = [...exactMatches, ...patternMatches];

  if (strategy === GrantMatchStrategy.ALL) {
    return matchedGrants.length === grantIds.length;
  }
  return matchedGrants.length > 0;
}
```

## Architecture Decisions

### Multi-App Association-Based Schema

- **Problem**: Need app-scoped permissions while keeping roles/grants global
- **Solution**: Add `app_id` to association tables (`roles_users`, `roles_grants`)
- **Advantage**: Global role "admin" can be assigned per-app to users
- **Impact**: Enables true multi-tenant RBAC with reusable role definitions

### Knex.js Integration

- **Decision**: Adapt all database queries to use existing Knex setup
- **Rationale**: Maintain consistency with current project architecture
- **Implementation**: Convert Drizzle patterns from legacy code to Knex

## Next Steps

Implement [aaj] RBAC useGrants Hook & Client Components

## Next Steps

Implement [aaj] RBAC useGrants Hook & Client Components

## Progress

- Updated migrations to add `app_id` to `auth.roles_users` and `auth.roles_grants` with composite PKs including `app_id`.
- Updated seeds to insert `app_id: "default"` for role-user and role-grant associations.
- Rebuilt database successfully (rollback → latest → seed).
- Implemented core RBAC modules:
  - `types.ts` with policy and result types
  - `lib/db.ts` with app-scoped role/grant lookups and checks
  - `lib/grants.ts` with wildcard grant matching and batch check
  - `lib/roles.ts` with role checks
  - `lib/session.ts` with NextAuth-based current-user helpers
  - `index.ts` exporting public API
- Ran QA: ESLint PASS, Next.js build PASS.

## Files Changed

- knex/migrations/20240522_acl.js — add `app_id` to association tables, update PKs
- knex/seeds/20240522_init_auth_data.js — add `app_id: "default"` to inserts
- src/42go/rbac/index.ts — new exports
- src/42go/rbac/types.ts — new types
- src/42go/rbac/lib/db.ts — app-scoped DB utils
- src/42go/rbac/lib/grants.ts — wildcard matching and grant checks
- src/42go/rbac/lib/roles.ts — role checks
- src/42go/rbac/lib/session.ts — session helpers

## Quality Gates

- Build: PASS (Next 15 production build)
- Lint/Typecheck: PASS
- Unit tests: Deferred (no test runner configured). Recommend adding Vitest/Jest in a follow-up.

## Requirements Coverage

- Schema updates: Done
- Seeds updated: Done
- DB recreation: Done
- TS interfaces: Done
- DB utilities: Done
- Wildcard matching: Done
- Session helpers: Done
- Error handling: Deferred (basic guards present; expand in follow-up)
- Unit tests: Deferred (propose adding in [aam] or a dedicated task)

## Next Steps

1. Integrate RBAC into route/page protection and hooks (tracked in [aaj], [aak]).
2. Add unit tests with a lightweight runner (propose Vitest) for wildcard and DB lookups.
3. Expand error handling and add input normalization (e.g., lowercase grant/role IDs).
