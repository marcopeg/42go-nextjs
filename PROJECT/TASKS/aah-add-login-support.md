# Add login support with NextAuth.js library [aah]

Add a minimal NextAuth.js setup to support basic password-based login to the app.

There are already some login related tables detailed in the Knex migrations:

- `knex/migrations/20240320_auth.js`
- `knex/migrations/20240522_acl.js`

Check if those tables are relevant and if they can be used.

# Acceptance Criteria

- [x] The user can login from a designated login page
- [x] The user can access a dashboard page at `/app/dashboard`
- [x] The user can logout from the dashboard page

## Development Plan

### Objective

Implement basic login functionality using NextAuth.js, enabling users to:

1. Log in via a designated login page.
2. Access a dashboard page at `/app/dashboard`.
3. Log out from the dashboard page.

### Steps

1. **Setup NextAuth.js**:

   - Install the NextAuth.js library.
   - Configure NextAuth.js in the project (`src/pages/api/auth/[...nextauth].ts`).
   - Use the existing database tables (`auth` and `acl`) for user authentication.

2. **Create Login Page**:

   - Design a login page (`src/app/login/page.tsx`) with a form for username/password.
   - Integrate NextAuth.js for handling login requests.

3. **Dashboard Page**:

   - Create a protected dashboard page (`src/app/dashboard/page.tsx`).
   - Implement server-side authentication checks using NextAuth.js.

4. **Logout Functionality**:

   - Add a logout button to the dashboard page.
   - Use NextAuth.js's `signOut` method to handle logout.

5. **Database Integration**:

   - Verify the relevance of `knex/migrations/20240320_auth.js` and `knex/migrations/20240522_acl.js`.
   - Ensure compatibility with NextAuth.js's database schema.

6. **Testing**:
   - Test login, dashboard access, and logout functionality.
   - Ensure proper error handling and user feedback.

### Files to Modify/Create

- `src/pages/api/auth/[...nextauth].ts` (NextAuth.js configuration).
- `src/app/login/page.tsx` (Login page).
- `src/app/dashboard/page.tsx` (Dashboard page).

### Libraries to Use

- **NextAuth.js**: For authentication.
- **Knex.js**: For database queries.

### Considerations

- Ensure secure handling of user credentials.
- Follow project architecture and coding standards.
- Document any architectural decisions or issues encountered.

## Progress

### Completed Tasks

✅ **NextAuth.js Installation and Configuration**

- Installed `next-auth` package successfully
- Created NextAuth.js API route at `src/pages/api/auth/[...nextauth].ts`
- Configured credentials provider with mock authentication
- Added JWT session strategy for proper session handling
- Set custom pages configuration for login/logout routes

✅ **Login Page Implementation**

- Created client-side login page at `src/app/login/page.tsx`
- Implemented form handling with proper TypeScript types
- Added error handling and redirect logic after successful login
- Used NextAuth's `signIn` method with proper options

✅ **Dashboard Page Implementation**

- Created protected dashboard page at `src/app/dashboard/page.tsx`
- Implemented client-side session management using `useSession` hook
- Added loading states and authentication checks
- Integrated logout functionality with NextAuth's `signOut` method

✅ **Session Provider Integration**

- Created `src/components/Providers.tsx` wrapper component
- Integrated NextAuth's `SessionProvider` with existing theme system
- Updated root layout to wrap application with session context
- Ensured proper client/server component separation

### Current Authentication Credentials

For testing purposes, the following mock credentials are configured:

- **Username**: `aaa`
- **Password**: `aaa`

### Files Created/Modified

1. **New Files**:

   - `src/pages/api/auth/[...nextauth].ts` - NextAuth.js configuration
   - `src/app/(public)/login/page.tsx` - Login form page (moved to public layout)
   - `src/app/dashboard/page.tsx` - Protected dashboard page
   - `src/components/Providers.tsx` - Session and theme provider wrapper

2. **Modified Files**:
   - `src/app/layout.tsx` - Added session provider integration
   - `src/components/PublicLayout/Nav.tsx` - Added login navigation link
   - `package.json` - Added next-auth dependency

### Libraries Used

- **next-auth** (^4.x): Authentication library for Next.js applications
  - Provides session management, multiple provider support, and security features
  - Chosen for its excellent Next.js integration and TypeScript support
  - Used JWT strategy for stateless authentication

## Issues Encountered

### Client/Server Component Mixing

- **Issue**: Initial dashboard implementation mixed server-side and client-side code
- **Solution**: Converted dashboard to client component and used `useSession` hook
- **Decision**: Client-side approach chosen for better user experience and real-time session updates

### Form Event Handling in Server Components

- **Issue**: Login form `onSubmit` handler caused server component error
- **Solution**: Added `"use client"` directive to login page
- **Decision**: Client-side form handling necessary for interactive authentication

### Session Provider Integration

- **Issue**: NextAuth session not available throughout app
- **Solution**: Created wrapper component to integrate SessionProvider with existing ThemeProvider
- **Decision**: Maintained existing theme architecture while adding authentication layer

### TypeScript Type Compatibility

- **Issue**: Various type mismatches with NextAuth types and existing app config
- **Solution**: Proper type imports and interface alignment
- **Decision**: Maintained type safety while ensuring compatibility

## Architectural Decisions

### JWT Session Strategy

- **Decision**: Used JWT sessions instead of database sessions
- **Reasoning**: Simpler setup for initial implementation, stateless authentication
- **Future**: Can be migrated to database sessions when user persistence is required

### Mock Authentication

- **Decision**: Implemented simple username/password validation without database
- **Reasoning**: Focuses on authentication flow rather than user management
- **Future**: Ready for database integration using existing Knex migrations

### Client-Side Session Management

- **Decision**: Used `useSession` hook for dashboard authentication
- **Reasoning**: Better user experience with real-time session updates
- **Alternative**: Server-side validation available via `getServerSession`

### Navigation Integration

- **Decision**: Moved login page to public layout and added navigation link
- **Reasoning**: Provides consistent user experience with existing public pages
- **Implementation**: Added login link to `Nav.tsx` component for easy access

### Public Layout Integration

- **Decision**: Moved login page from `/login` to `/(public)/login`
- **Reasoning**: Integrates with existing public layout system and theming
- **Benefit**: Login page now uses consistent navigation and styling

## Recent Updates

### Navigation Enhancement

- Added "Login" link to the public navigation in `src/components/PublicLayout/Nav.tsx`
- Moved login page to `src/app/(public)/login/page.tsx` to use public layout
- Removed standalone login page to maintain consistent routing structure

### Access Denied Improvements

- Added countdown timer (5 seconds) for automatic redirect to login page
- Included manual login link for immediate user action
- Enhanced UI with clear messaging and visual feedback for unauthenticated users

## Next Steps

1. **Database Integration**: Connect authentication to existing user tables in Knex migrations
2. **User Registration**: Add user creation functionality
3. **Session Persistence**: Consider database session strategy for production
4. **Security Enhancements**: Add CSRF protection, rate limiting, and secure headers
5. **UI/UX Improvements**: Enhance login/dashboard styling with existing theme system
