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

A singleton database connection is available throughout the application. To use it within your API routes, import the `getDB` function from `src/lib/db`.

Here is an example of how to fetch all records from a `todos` table:

```typescript
// src/app/api/todos/route.ts

import { appRoute } from "@/lib/config/app-config";
import { getDB } from "@/lib/db";

const getTodos = async () => {
  const db = getDB();
  const todos = await db("todos").select("*");
  return Response.json({ todos });
};

export const GET = appRoute(getTodos);
```

The `getDB()` function returns a ready-to-use Knex instance. No need to worry about connecting or disconnecting. The framework handles it for you.
