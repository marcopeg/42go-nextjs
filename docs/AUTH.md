# Authentication System Documentation

This document provides an overview of the authentication system implemented in this project. The authentication is built using [Auth.js](https://authjs.dev/) (formerly NextAuth.js), a complete open-source authentication solution for Next.js applications.

## Overview

The authentication system provides the following features:

- Credential-based authentication (username/email and password)
- JWT-based session management
- Infrastructure for social authentication providers
- Support for passwordless authentication (magic links)
- Secure password hashing with bcrypt
- Database integration with DrizzleORM

## Database Schema

The authentication system uses the following tables under the `auth` schema:

- `users`: Stores user information and credentials
- `accounts`: Manages OAuth provider connections
- `sessions`: Handles user sessions
- `verification_tokens`: Manages email verification tokens

## Authentication Flow

### Credential-based Authentication

1. User submits credentials through login form
2. System verifies credentials against database
3. On success, creates JWT session
4. User is redirected to callback URL or dashboard

### Session Management

- Uses JWT-based sessions
- Session data stored in encrypted cookie
- Automatic JWT refresh
- Custom callbacks for enhanced session data

## Configuration

The authentication configuration is defined in `src/lib/auth/auth-options.ts`:

```typescript
export const authOptions = {
  adapter: DrizzleAdapter(db),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/error',
    verifyRequest: '/verify-request',
    newUser: '/register',
  },
  providers: [
    CredentialsProvider({
      // Email/password configuration
    }),
    // Social providers
  ],
  callbacks: {
    // Session and JWT handling
  },
};
```

## Environment Variables

Required environment variables:

```
# Auth
NEXTAUTH_SECRET="your-secret-key-here"
NEXT_PUBLIC_NEXTAUTH_URL="http://localhost:3000"

# OAuth Providers (when needed)
# GOOGLE_CLIENT_ID=""
# GOOGLE_CLIENT_SECRET=""
# GITHUB_ID=""
# GITHUB_SECRET=""
```

## Usage in Components

### Client-Side Authentication

```typescript
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export default function UserProfile() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <div>Loading...</div>;
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

1. Install required packages
2. Add provider configuration to `authOptions`
3. Add required environment variables

Example for Google authentication:

```typescript
import GoogleProvider from 'next-auth/providers/google';

GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
}),
```

## Password Management

Password hashing and verification are handled by the `password.ts` utility:

```typescript
import { hash, compare } from 'bcrypt';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}
```

## Development Tools

- [Create Users](./DEV-API-CREATE-USER.md)
