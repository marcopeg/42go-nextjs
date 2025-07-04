# Simplify db support to Postgres

Who am I kidding?

I'm building this for myself and there is no way I'm not using Postgres.

Plus, the real backend of a serious product would be handled elesewhere. Like in NestJS or something.

The NextJS App will possibly store accounts information and apply simple ACL.

# Acceptance Criteria

- [ ] Remove support for dbms other than Postgres
- [ ] Use `PGSTRING` as connection string from env for the app
- [ ] Use `PGSTRING` as connection string from env for the Knex migrations project
- [ ] Use OPTIONAL `PGPOOL` as list of params (comma seprated: `1,5,1000`) to hold min, max, threshold params in pooling. If not set, leave it to Knex defaults
- [ ] Clean up the depencencies
- [ ] Clean up the documentation
  - [ ] docs/DATABASE.md
  - [ ] PROJECT/DEPENDENCIES.md
  - [ ] PROJECT/FEATURES.md
