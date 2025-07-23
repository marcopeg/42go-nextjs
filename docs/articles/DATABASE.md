# Database Management

This project uses **Knex.js** as a SQL query builder and migration manager with **PostgreSQL** as the only supported database engine.

## Connecting to PostgreSQL

All database configuration is handled through a single environment variable:

```
PGSTRING
```

To connect your application to PostgreSQL, simply set this variable in your `.env` file:

```bash
PGSTRING="postgres://user:password@host:port/database"
```

The system will automatically parse the connection string and configure the PostgreSQL client.

## Connection Pool Configuration

You can fine-tune your database connection pool by setting an optional environment variable:

```bash
PGPOOL="2,10,30000"  # min,max,idleTimeoutMillis
```

This single variable configures:

- **Minimum connections**: 2
- **Maximum connections**: 10
- **Idle timeout**: 30000ms (30 seconds)

If `PGPOOL` is not set, Knex will use its default pool settings.

## Advanced Configuration

For more advanced or custom settings, add a `knex.config.json` file at the project root. Any valid Knex configuration you place here will be deep-merged into the final runtime config:

```json
// knex.config.json
{
  "pool": {
    "min": 5,
    "max": 20,
    "acquireTimeoutMillis": 60000
  },
  "debug": true
}
```

## Migrations & Seeding

Knex.js handles database schema changes through **migration** files and initial data population through **seed** files.

- **Migrations**: Located in `./knex/migrations`. Each file represents a change to the database schema (creating tables, adding columns, etc.).
- **Seeds**: Located in `./knex/seeds`. These files are used to populate your tables with initial data, which is useful for development and testing.

### Creating a Migration

To create a new migration, run the following command from the project root:

```bash
npx knex migrate:make <migration_name>
```

### Running Migrations

To apply all pending migrations, run:

```bash
npx knex migrate:latest
```

## Using the Database in API Routes

A singleton database connection is exposed via `getDB()`. Import it from `src/lib/db` to run queries in any route or server component:

```typescript
// src/app/api/todos/route.ts
import { appRoute } from "@/lib/config/app-config";
import { getDB } from "@/lib/db";

const getTodos = async () => {
  const db = getDB();
  const todos = await db("todos").select();
  return Response.json({ todos });
};

export const GET = appRoute(getTodos);
```

The `getDB()` function returns a fully configured Knex instance with PostgreSQL, complete with connection pooling and any JSON overrides. No manual connect/disconnect needed.

## Environment Variables Summary

```bash
# Required
PGSTRING="postgres://user:password@host:port/database"

# Optional
PGPOOL="2,10,30000"  # min,max,idleTimeoutMillis
```
