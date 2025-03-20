import { text, timestamp, primaryKey, integer, pgSchema, pgTable } from 'drizzle-orm/pg-core';

// Define the auth schema
const authSchema = pgSchema('auth');
// No need to define public schema as it's the default in PostgreSQL

// Users table
export const users = authSchema.table('users', {
  id: text('id').notNull().primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified'),
  image: text('image'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Accounts table for OAuth providers
export const accounts = authSchema.table(
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

// Sessions table
export const sessions = authSchema.table('sessions', {
  sessionToken: text('session_token').notNull().primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
});

// Verification tokens for email verification
export const verificationTokens = authSchema.table(
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

// Feedback table for public contact form submissions - using pgTable for public schema
export const feedback = pgTable('feedback', {
  id: text('id').notNull().primaryKey(),
  email: text('email').notNull(),
  message: text('message').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Groups table
export const groups = authSchema.table('groups', {
  id: text('id').primaryKey(),
  title: text('title').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Groups Users table for user group memberships
export const groupsUsers = authSchema.table(
  'groups_users',
  {
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    compoundKey: primaryKey({
      columns: [table.groupId, table.userId],
    }),
  })
);

// Grants table
export const grants = authSchema.table('grants', {
  id: text('id').primaryKey(),
  title: text('title').notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Groups Grants table for associating grants to groups
export const groupsGrants = authSchema.table(
  'groups_grants',
  {
    groupId: text('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    grantId: text('grant_id')
      .notNull()
      .references(() => grants.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    compoundKey: primaryKey({
      columns: [table.groupId, table.grantId],
    }),
  })
);

// Export all schemas for migrations
const schemas = {
  users,
  accounts,
  sessions,
  verificationTokens,
  feedback,
  groups,
  groupsUsers,
  grants,
  groupsGrants,
};

export default schemas;
