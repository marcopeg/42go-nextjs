import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Example user table schema
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Export all schemas for migrations
export default {
  users,
};
