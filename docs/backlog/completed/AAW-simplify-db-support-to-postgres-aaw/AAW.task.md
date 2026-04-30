---
taskId: AAW
status: completed
createdAt: 2026-04-23T15:27:45+02:00
updatedAt: 2026-04-23T15:27:45+02:00
completedAt: 2025-07-23T17:21:14+02:00
---

# Simplify db support to Postgres [aaw]

Who am I kidding?

I'm building this for myself and there is no way I'm not using Postgres.

Plus, the real backend of a serious product would be handled elesewhere. Like in NestJS or something.

The NextJS App will possibly store accounts information and apply simple ACL.

# Acceptance Criteria

- [x] Remove support for dbms other than Postgres
- [x] Use `PGSTRING` as connection string from env for the app
- [x] Use `PGSTRING` as connection string from env for the Knex migrations project
- [x] Use OPTIONAL `PGPOOL` as list of params (comma seprated: `1,5,1000`) to hold min, max, threshold params in pooling. If not set, leave it to Knex defaults
- [x] Clean up the depencencies
- [x] Clean up the documentation
  - [x] docs/DATABASE.md
  - [x] PROJECT/DEPENDENCIES.md
  - [x] PROJECT/FEATURES.md

## Development Plan

Chuck Norris doesn't waste time on multiple database engines when PostgreSQL is the only one worth using. This task will streamline the database configuration like a perfectly executed martial arts move - simple, powerful, and effective.

### Phase 1: Simplify Database Utilities

1. **Update `src/lib/db/utils.ts`**:

   - Remove all database client support except PostgreSQL
   - Change environment variable from `DBSTRING` to `PGSTRING`
   - Replace pool environment variables:
     - Remove `DB_POOL_MIN`, `DB_POOL_MAX`, `DB_POOL_IDLE_TIMEOUT`
     - Add support for `PGPOOL` as comma-separated values: `min,max,idleTimeoutMillis`
   - Keep the JSON config override functionality for advanced users

2. **Update `src/lib/db/index.ts`**:
   - Update environment variable reference from `DBSTRING` to `PGSTRING`
   - Update error messages accordingly

### Phase 2: Update Knex Configuration

3. **Update `knexfile.js`**:
   - Simplify to only support PostgreSQL
   - Change environment variable from `DBSTRING` to `PGSTRING`
   - Skip the pool configuration for this (it's just migrations!)
   - Remove all other database client parsing logic

### Phase 3: Clean Up Dependencies

4. **Update `package.json`**:
   - Remove unnecessary database drivers:
     - `better-sqlite3`
     - `mysql`
     - `mysql2`
     - `sqlite3`
     - `tedious` (SQL Server)
     - `oracledb`
   - Keep only PostgreSQL-related dependencies:
     - `pg` (in devDependencies)
     - `pg-query-stream`
     - `knex`

### Phase 4: Update Documentation

5. **Update `docs/DATABASE.md`**:

   - Remove all references to other database engines
   - Update environment variable examples to use `PGSTRING`
   - Update pool configuration examples to use `PGPOOL`
   - Simplify connection string examples to PostgreSQL only

6. **Update `PROJECT/DEPENDENCIES.md`**:

   - Remove entries for removed database dependencies
   - Update PostgreSQL-related dependency descriptions

7. **Update `PROJECT/FEATURES.md`**:
   - Update the "Database Connection Pool" section to reflect PostgreSQL-only support
   - Update environment variable references
   - Simplify the multi-database support description

### Phase 5: Testing & Validation

8. **Run build and lint checks**:
   - Execute `npm run lint && npm run build` to ensure no breaking changes
   - Verify all imports and references are updated correctly

### Environment Variable Migration

**Before:**

```bash
DBSTRING="postgres://user:password@host:port/database"
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_POOL_IDLE_TIMEOUT=30000
```

**After:**

```bash
PGSTRING="postgres://user:password@host:port/database"
PGPOOL="2,10,30000"  # min,max,idleTimeoutMillis
```

This plan eliminates complexity while maintaining all the power needed for a serious PostgreSQL-based application. Chuck Norris approves of this focused approach!

## Implementation Notes

### Build-Time Dependencies Issue

During implementation, we encountered a common issue with Knex.js in Next.js environments: Knex attempts to load all database dialects during the build process, even when only PostgreSQL is configured. This caused build errors for missing database drivers.

**Solution**: Install the other database drivers as `devDependencies`:

```bash
npm install --save-dev better-sqlite3 mysql mysql2 oracledb sqlite3 tedious
```

**Why This Works**:

- These packages are only needed during build time to satisfy Knex's dialect loading
- They don't get deployed to production since they're devDependencies
- Our application code only uses PostgreSQL through the `pg` driver
- Keeps the PostgreSQL-only approach while ensuring successful builds

This is a known pattern in the Knex.js community for bundled environments like Next.js, Webpack, and similar build systems.

## Final Solution - COMPLETED ✅

The task has been completed successfully using the **official Next.js solution** for handling external packages like Knex:

### Key Changes Made

1. **Dependencies Cleanup**:

   - Removed all non-PostgreSQL database drivers from `package.json`
   - Kept only `knex` and `pg` as production dependencies
   - No dev dependencies for unused database drivers needed

2. **Configuration Updates**:

   - Updated `src/lib/db/utils.ts` to PostgreSQL-only configuration
   - Updated `knexfile.js` to PostgreSQL-only configuration
   - Used official Next.js `serverExternalPackages` configuration

3. **Official Next.js Solution**:
   Applied the official Next.js configuration in `next.config.ts`:
   ```typescript
   const nextConfig: NextConfig = {
     serverExternalPackages: ["knex"],
   };
   ```

### Why This Solution is Superior

- **Official**: Uses Next.js documented approach, not custom webpack hacks
- **Clean**: No need to install unused database drivers as devDependencies
- **Maintainable**: Leverages official Next.js and Knex recommendations
- **Performance**: Prevents Next.js from bundling all Knex dialects
- **Future-proof**: Follows official guidelines that will be maintained

### Build Status

✅ All builds pass without warnings or errors  
✅ All linting passes  
✅ No unused dependencies  
✅ PostgreSQL-only approach achieved  
✅ Official Next.js solution implemented

Chuck Norris doesn't need hacks when official solutions exist!
