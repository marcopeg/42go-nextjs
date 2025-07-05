# Use Database Users Table to Authenticate Users [aba]

Implement database-backed authentication by connecting the NextAuth.js credentials provider to the users table in the database. This will replace the current mock authentication with real database lookups and properly hashed password verification.

## Acceptance Criteria

- [ ] Seed the database with test users (john and jane) with properly hashed passwords
- [ ] Update the NextAuth.js credentials provider to query the database for user authentication
- [ ] Implement proper password verification using bcrypt
- [ ] Ensure existing login flow works with database authentication
- [ ] Remove mock authentication logic

## Development Plan

### Current State Analysis

**What's Already There:**

- Database seeds are already creating `john` and `jane` users with hashed passwords ✓
- bcrypt dependency is installed ✓
- Database connection utilities are ready ✓
- NextAuth is configured but using mock authentication

**What Needs Implementation:**

- Mock authentication logic in `authOptions.ts` needs replacement
- No database queries in the credentials provider
- Users exist in DB but authentication doesn't use them

### The Implementation Plan

#### Phase 1: Database Query Implementation

1. **Modify `authOptions.ts`** to query the database instead of using mock logic
2. **Import database utilities** and bcrypt for password verification
3. **Implement user lookup** by username/email from `auth.users` table
4. **Add proper password verification** using bcrypt.compare()

#### Phase 2: Error Handling & Security

1. **Implement robust error handling** for database connection issues
2. **Ensure password security** - no logging of sensitive data
3. **Add case-insensitive lookup** for usernames/emails
4. **Maintain existing session structure** and JWT handling

#### Phase 3: Testing & Validation

1. **Test with john/john credentials**
2. **Test with jane/jane credentials**
3. **Verify mock authentication is completely removed**
4. **Test invalid credentials handling**

### Files to Modify

- `src/lib/auth/authOptions.ts` - Replace mock auth with database queries

### Libraries Used

- **bcrypt** - Already installed, for password verification
- **knex** - Already configured, for database queries
- **uuid** - Already used in seeds for user IDs

### Implementation Details

#### Database Authentication Flow

```
1. User submits username/password
2. Query auth.users table for user by username (case-insensitive)
3. If user found, verify password using bcrypt.compare()
4. If valid, return user object for NextAuth session
5. If invalid, return null (NextAuth handles error display)
```

#### Security Considerations

- Database queries should be fast and efficient
- Error messages should be vague for security (no user enumeration)
- Session handling stays intact - NextAuth handles that
- Case-insensitive lookups prevent user frustration
- Proper TypeScript types for database responses
- No logging of passwords or sensitive data
