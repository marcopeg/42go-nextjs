---
title: Database Management
subtitle: How to use DrizzleORM, migrations, and data studio
---

This document outlines how the database is managed in this application, focusing on the use of Drizzle ORM for data access and Knex for schema migrations.

## Overview

The project uses a dual approach to database management:

- **Drizzle ORM**: Used for type-safe database queries and interactions within the application code
- **Knex**: Used for database migrations to manage schema changes over time

This separation allows us to leverage the type safety and developer experience of Drizzle while using the mature migration system of Knex.

## Database Connection

The database connection is established in `src/lib/db/index.ts`:

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

## Database Schema

The database schema is defined using Drizzle's schema definition syntax in `src/lib/db/schema.ts`:

```typescript
import { text, timestamp, primaryKey, integer, pgSchema, pgTable } from 'drizzle-orm/pg-core';

// Define schemas
const authSchema = pgSchema('auth');

// Define tables
export const users = authSchema.table('users', {
  id: text('id').notNull().primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  // ... other columns
});

// ... other table definitions

// Export all schemas for migrations
const schemas = {
  users,
  accounts,
  sessions,
  verificationTokens,
  feedback,
};

export default schemas;
```

## Data Access with Drizzle

Drizzle is used throughout the application code for data access operations. Here's an example:

```typescript
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Query a user by email
const user = await db.select().from(users).where(eq(users.email, email)).first();

// Insert a new user
await db.insert(users).values({
  id: 'user-id',
  email: 'user@example.com',
  name: 'User Name',
});
```

## Database Migrations with Knex

While Drizzle handles the ORM functionality, Knex is used for database migrations to manage schema changes over time.

### Migration Configuration

Migrations are configured in the root `knexfile.js`:

```javascript
module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: 'postgres',
      database: 'postgres',
    },
    migrations: {
      directory: './knex/migrations',
    },
    seeds: {
      directory: './knex/seeds',
    },
  },
  // ... configurations for other environments
};
```

### Creating Migrations

To create a new migration:

```bash
npm run db:migrate:make migration_name
```

This creates a new migration file in the `knex/migrations` directory with an up and down function.

Example migration:

```javascript
exports.up = function (knex) {
  return Promise.all([
    // Create the auth schema
    knex.raw('CREATE SCHEMA IF NOT EXISTS auth'),

    // Create users table in auth schema
    knex.schema.withSchema('auth').createTable('users', table => {
      table.text('id').primary().notNullable();
      table.text('name');
      table.text('email').notNullable().unique();
      // ... other columns
    }),

    // ... other table creations
  ]);
};

exports.down = function (knex) {
  // Reversion logic
  return Promise.all([
    knex.schema.withSchema('auth').dropTable('users'),
    // ... other table drops
    knex.raw('DROP SCHEMA IF EXISTS auth'),
  ]);
};
```

### Running Migrations

To run migrations:

```bash
npm run db:migrate
```

To rollback the most recent migration:

```bash
npm run db:migrate:rollback
```

## Why Use Both Drizzle and Knex?

1. **Type Safety**: Drizzle provides TypeScript type safety for database queries
2. **Developer Experience**: Drizzle offers a modern developer experience with autocompletion
3. **Mature Migration System**: Knex has a mature and well-tested migration system
4. **Flexible Schema Management**: Knex migrations allow for complex schema changes that might be difficult to express in ORM schema definitions
5. **Environment Support**: Both tools provide robust environment-specific configuration

## Development Tools

### Drizzle Studio

The project can use Drizzle Studio for database visualization:

```bash
npm run db:studio
```

### Database Seeding

Knex can also be used for database seeding:

```bash
# Command to run seeds would go here
```

## Environment Configuration

The database connection requires the following environment variables:

```
# Database connection
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"
```

For production, additional configuration may be needed:

```
# Production database (example)
DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"
```

## Best Practices

1. **Schema Changes**: Always create a new migration for schema changes, never modify existing migrations
2. **Transactions**: Use transactions in migrations to ensure atomicity
3. **Data Migrations**: For data migrations, consider creating separate migration files
4. **Testing**: Test migrations in a development environment before applying to production
5. **Backup**: Always backup the database before applying migrations to production
