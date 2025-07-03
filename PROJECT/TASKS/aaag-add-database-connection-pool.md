# Add Database connection pool [aaag]

Add a way to connect to a database from the API endpoints.

We are already using Knex in the migrations so I'd say this is good enough as an abstraction.

# Acceptance Criteria

- [ ] It should be easy to switch database tecnologies if I start over a new project
- [ ] Connection details should be passed as environment variables
- [ ] Connection details env variables should be checked and validated at boot time
