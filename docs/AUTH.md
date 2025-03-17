# Authentication System Documentation

This document provides an overview of the authentication system implemented in this project. The authentication is built using [Auth.js](https://authjs.dev/) (formerly NextAuth.js), a complete open-source authentication solution for Next.js applications.

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Authentication Flow](#authentication-flow)
4. [Configuration](#configuration)
5. [Environment Variables](#environment-variables)
6. [Usage in Components](#usage-in-components)
7. [Adding Social Providers](#adding-social-providers)
8. [Password Management](#password-management)

## Overview

The authentication system provides the following features:

- Credential-based authentication (email/password)
- JWT-based session management
- Infrastructure for social authentication providers
- Support for passwordless authentication (magic links)
- Secure password hashing with bcrypt
- Database integration with DrizzleORM

## Database Schema

The authentication system uses the following database tables:

### Database Connection

The database connection is configured in `src/lib/db/index.ts`:

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '@/env';

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: false, // SSL is disabled for local development
});

// Create a DrizzleORM instance
export const db = drizzle(pool);

// Export the pool for direct usage if needed
export { pool };
```

For Drizzle Studio, the configuration is in `drizzle.config.ts`:

```typescript
export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'promptslab',
    ssl: false, // SSL is disabled for local development
  },
});
```

### Users Table

```typescript
export const users = pgTable('users', {
  id: text('id').notNull().primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified'),
  image: text('image'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Accounts Table (for OAuth providers)

```typescript
export const accounts = pgTable(
  'accounts',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  account => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  })
);
```

### Sessions Table

```typescript
export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').notNull().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
});
```

### Verification Tokens Table (for email verification)

```typescript
export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires').notNull(),
  },
  vt => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);
```

## Authentication Flow

### Credential-based Authentication

1. User submits email and password through a login form
2. The credentials are sent to the Auth.js API route
3. Auth.js calls the `authorize` function in the credentials provider
4. The system looks up the user by email in the database
5. If found, it verifies the password using bcrypt
6. If verification succeeds, a JWT token is created and stored in a cookie
7. The user is redirected to the callback URL or dashboard

### Session Management

- The system uses JWT-based sessions (strategy: 'jwt')
- Session data is stored in an encrypted cookie
- The JWT contains user information and is refreshed automatically
- Custom callbacks enhance the JWT and session objects with additional user data

## Configuration

The authentication configuration is defined in `src/lib/auth/auth-options.ts`:

```typescript
export const authOptions = {
  adapter: DrizzleAdapter(db),
  session: {
    strategy: 'jwt' as const,
  },
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/error',
    verifyRequest: '/verify-request',
    newUser: '/register',
  },
  providers: [
    CredentialsProvider({
      // Configuration for email/password authentication
    }),
    // Social providers can be added here
  ],
  callbacks: {
    // Custom callbacks for session and JWT handling
  },
};
```

## Environment Variables

The authentication system requires the following environment variables:

```
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"

# Auth
NEXTAUTH_SECRET="your-secret-key-here"
NEXT_PUBLIC_NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers (when needed)
# GOOGLE_CLIENT_ID=""
# GOOGLE_CLIENT_SECRET=""
# GITHUB_ID=""
# GITHUB_SECRET=""
```

- `DATABASE_URL`: Connection string for the PostgreSQL database
- `NEXTAUTH_SECRET`: A secret string used to encrypt cookies and tokens
- `NEXT_PUBLIC_NEXTAUTH_URL`: The base URL of your application

## Usage in Components

### Client-Side Authentication

To use authentication in client components:

```typescript
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export default function UserProfile() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return (
      <div>
        <p>You are not signed in</p>
        <button onClick={() => signIn()}>Sign in</button>
      </div>
    );
  }

  return (
    <div>
      <p>Signed in as {session?.user?.email}</p>
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  );
}
```

### Server-Side Authentication

To use authentication in server components:

```typescript
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';

export default async function ServerComponent() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return <div>Please sign in to view this page</div>;
  }

  return <div>Welcome, {session.user.name}!</div>;
}
```

## Adding Social Providers

To add social authentication providers:

1. Install the required packages
2. Add the provider configuration to `authOptions`
3. Add the required environment variables

Example for adding Google authentication:

```typescript
import GoogleProvider from 'next-auth/providers/google';

// In authOptions.providers array:
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
}),
```

## Password Management

Password hashing and verification are handled by the `password.ts` utility:

```typescript
import { hash, compare } from 'bcrypt';

// Hash a password
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

// Verify a password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}
```

To create a new user with a hashed password:

```typescript
import { hashPassword } from '@/lib/auth/password';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';

export async function createUser(email: string, password: string, name?: string) {
  const hashedPassword = await hashPassword(password);

  return db.insert(users).values({
    id: uuidv4(),
    email,
    password: hashedPassword,
    name,
  });
}
```

---

This documentation provides an overview of the current authentication system. As the project evolves, additional features like password reset, email verification, and role-based access control can be implemented.

## Database Management with Drizzle Studio

The project uses Drizzle Studio for database management. To run Drizzle Studio:

```bash
npm run db:studio
```

This will start Drizzle Studio at https://local.drizzle.studio, where you can:

- View and edit database tables
- Run SQL queries
- Manage database schema
- Visualize relationships between tables

Note: Drizzle Studio is configured to connect to the local PostgreSQL database without SSL, which is appropriate for local development. For production environments, SSL should be enabled.

---
