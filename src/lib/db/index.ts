import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '@/env';

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: false,
});

// Create a DrizzleORM instance
export const db = drizzle(pool);

// Export the pool for direct usage if needed
export { pool };
