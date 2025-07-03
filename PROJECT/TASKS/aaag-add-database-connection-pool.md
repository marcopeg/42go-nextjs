# Add Database connection pool [aaag]

Add a way to connect to a database from the API endpoints.

We are already using Knex in the migrations so I'd say this is good enough as an abstraction.

# Acceptance Criteria

- [ ] It should be easy to switch database tecnologies if I start over a new project
- [ ] Connection details should be passed as environment variables
- [ ] Connection details env variables should be checked and validated at boot time

## Development Plan (Revised)

1.  **Environment Variable:**

    - Create a `.env.example` file and define one single environment variable: `DBSTRING`.
    - Add examples for PostgreSQL, MariaDB, SQL Server, and SQLite connection strings.
    - Create a `.env` file for local development.

2.  **Database Connection Utility:**

    - Create a new directory `src/lib/db/` to house our database logic.
    - Inside, `src/lib/db/index.ts` will hold the singleton Knex instance, initialized by parsing the `DBSTRING`.
    - A new utility file, `src/lib/db/utils.ts`, will contain the `parseConnectionString` function. This function will dissect the `DBSTRING` to determine the correct Knex client and connection details.

3.  **Knex Configuration:**

    - Update the `knexfile.js` to use the new `parseConnectionString` utility. This ensures that our migrations and seeds are as tough and ready as our application code.

4.  **API Integration:**
    - Refactor the `src/app/api/todos/route.ts` to use the new database connection from `src/lib/db`.
