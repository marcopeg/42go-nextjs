import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from '.';

// This script runs migrations on the database
async function main() {
  console.log('Running migrations...');

  try {
    // Run the migrations
    await migrate(db, { migrationsFolder: 'drizzle' });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    // Close the pool
    await pool.end();
  }
}

main();
