# Authorization System Documentation

This document provides an overview of the authorization system implemented in this project. Authorization controls what authenticated users can do within the application.

## Overview

The authorization system provides the following features:

- Role-based access control (RBAC)
- Permission management
- Resource-level access control
- User role assignment

## Database Schema

The authorization system uses the following tables:

### Roles Table

- Stores different user roles (e.g., admin, user, guest)
- Defines role hierarchy and inheritance

### Permissions Table

- Defines specific actions users can perform
- Maps permissions to roles

### User Roles Table

- Links users to their assigned roles
- Supports multiple roles per user

## Environment Variables

The authorization system requires the following environment variables:

```
# Authorization
AUTH_ADMIN_EMAIL="admin@example.com"  # Email of the initial admin user
```

## Usage in Components

### Client-Side Authorization

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/auth/permissions';

export default function ProtectedComponent() {
  const { data: session } = useSession();

  if (!hasPermission(session?.user, 'view_dashboard')) {
    return <div>Access denied</div>;
  }

  return <div>Protected content</div>;
}
```

### Server-Side Authorization

```typescript
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { hasPermission } from '@/lib/auth/permissions';

export default async function ProtectedPage() {
  const session = await getServerSession(authOptions);

  if (!hasPermission(session?.user, 'manage_users')) {
    return <div>Access denied</div>;
  }

  return <div>Protected content</div>;
}
```

## Development Tools

### Creating Test Roles

For development and testing purposes, you can create test roles using the database management tools or through the application's admin interface.

### Security Considerations

- Always check permissions at both client and server side
- Implement proper role hierarchy
- Use principle of least privilege
- Regularly audit role assignments and permissions
