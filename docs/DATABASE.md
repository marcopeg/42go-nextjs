# Database Management

This project uses **Knex.js** as a SQL query builder and migration manager. It provides a unified interface to communicate with several different database engines.

## Connecting to a Database

All database configuration is handled through a single environment variable:

```
DBSTRING
```

To connect your application to a database, simply set this variable in your `.env` file. The system will automatically parse the connection string and use the correct database client.

### Supported Databases & Connection Strings

Here are the supported databases and examples of their connection strings:

- **PostgreSQL**

  ```
  DBSTRING="postgres://user:password@host:port/database"
  ```

- **MariaDB / MySQL**

  ```
  DBSTRING="mariadb://user:password@host:port/database"
  DBSTRING="mysql://user:password@host:port/database"
  ```

- **Microsoft SQL Server**

  ```
  DBSTRING="mssql://user:password@host:port/database"
  ```

- **SQLite**
  ```
  DBSTRING="sqlite://./path/to/your/database.sqlite3"
  ```

## Advanced Connection Configuration

You can fine-tune your database connection pool without touching code by setting these optional environment variables in your `.env` file:

```bash
DB_POOL_MIN=2         # Minimum number of connections in the pool
DB_POOL_MAX=10        # Maximum number of connections in the pool
DB_POOL_IDLE_TIMEOUT=30000  # How long (ms) a connection can be idle before being closed
```

These values will be automatically picked up on startup and merged with the core connection settings.

## JSON Configuration Overrides

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

If `knex.config.json` exists, it is parsed and merged _after_ the environment variables, so you have full control over every Knex option.

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

The `getDB()` function returns a fully configured Knex instance, complete with connection pooling and any JSON overrides. No manual connect/disconnect needed.
