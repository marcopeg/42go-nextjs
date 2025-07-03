# Add Database connection pool [aaag]

Add a way to connect to a database from the API endpoints.

We are already using Knex in the migrations so I'd say this is good enough as an abstraction.

# Acceptance Criteria

- [x] It should be easy to switch database tecnologies if I start over a new project
- [x] Connection details should be passed as environment variables
- [x] Connection details env variables should be checked and validated at boot time

## Implementation Summary

This task was completed by implementing a robust, centralized database connection system using Knex.js.

1.  **Environment Configuration**: Introduced a single `DBSTRING` environment variable to control the database connection. Created `.env.example` with templates for PostgreSQL, MariaDB, MySQL, SQL Server, and SQLite, and a local `.env` file for development.

2.  **Connection Utility**: Created a dedicated database module at `src/lib/db/`. The `utils.ts` file contains a `parseConnectionString` function that automatically determines the correct Knex client and connection parameters from the `DBSTRING`. The `index.ts` file exports a `getDB` function that provides a singleton Knex instance, ensuring only one connection pool is created.

3.  **Knex Integration**: The main `knexfile.js` was updated to use the `parseConnectionString` utility, ensuring that migrations and seeds use the same database connection as the application.

4.  **API Integration**: Created a new `todos` table via a Knex migration and refactored the API route at `src/app/api/todos/route.ts` to fetch data from this table using the new `getDB` connection pool.

This setup allows for easy switching between supported SQL databases without changing any code, simply by updating the `DBSTRING` environment variable.
