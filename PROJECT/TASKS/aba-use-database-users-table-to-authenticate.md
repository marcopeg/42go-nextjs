# Use Database Users Table to Authenticate Users [aba]

Implement database-backed authentication by connecting the NextAuth.js credentials provider to the users table in the database. This will replace the current mock authentication with real database lookups and properly hashed password verification.

## Acceptance Criteria

- [ ] Seed the database with test users (john and jane) with properly hashed passwords
- [ ] Update the NextAuth.js credentials provider to query the database for user authentication
- [ ] Implement proper password verification using bcrypt
- [ ] Ensure existing login flow works with database authentication
- [ ] Remove mock authentication logic

## Development Plan

### Objective

Replace the mock authentication system with a real database-backed authentication that:

1. Seeds test users with hashed passwords
2. Authenticates users against the database
3. Uses proper password hashing/verification

### Steps

1. **Update User Seeds**:

   - Modify the existing seed file to include john and jane users
   - Ensure passwords are properly hashed using bcrypt
   - Both users should have username as password (john/john, jane/jane)

2. **Install Required Dependencies**:

   - Ensure bcrypt is available for password hashing/verification
   - Check if we need any additional database query utilities

3. **Update NextAuth Configuration**:

   - Modify the credentials provider in `authOptions.ts`
   - Replace mock authentication with database queries
   - Implement proper password verification using bcrypt
   - Query the `auth.users` table for authentication

4. **Database Query Integration**:

   - Use existing database connection utilities
   - Implement user lookup by email or username
   - Ensure proper error handling for database operations

5. **Testing**:
   - Test login with john/john credentials
   - Test login with jane/jane credentials
   - Verify mock authentication is completely removed
   - Ensure proper error handling for invalid credentials

### Files to Modify

- `knex/seeds/20240522_init_auth_data.js` - Add john and jane users
- `src/lib/auth/authOptions.ts` - Replace mock auth with database queries
- `package.json` - Ensure bcrypt dependency is available

### Libraries Used

- **bcrypt**: For password hashing and verification
- **knex**: For database queries (already available)
- **uuid**: For generating user IDs (already in seeds)

### Considerations

- Use proper error handling for database connection issues
- Ensure passwords are never logged or exposed
- Follow existing database schema and patterns
- Maintain session handling and JWT token structure
- Consider case-insensitive email/username lookup
