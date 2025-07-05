# Add login support with NextAuth.js library [aah]

Add a minimal NextAuth.js setup to support basic password-based login to the app.

There are already some login related tables detailed in the Knex migrations:

- `knex/migrations/20240320_auth.js`
- `knex/migrations/20240522_acl.js`

Check if those tables are relevant and if they can be used.

# Acceptance Criteria

- [ ] The user can login from a designated login page
- [ ] The user can access a dashboard page at `/app/dashboard`
- [ ] The user can logout from the dashboard page
