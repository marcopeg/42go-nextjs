import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { withEnv } from '@/lib/env/with-env';

export const GET = withEnv({
  environments: ['development', 'test'],
})(async () => {
  try {
    // Query the current database time
    const result = await db.execute(sql`SELECT NOW() as current_time`);
    const rows = result.rows as Array<{ current_time: Date }>;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No result from database' }, { status: 500 });
    }

    return NextResponse.json({ time: rows[0].current_time });
  } catch (error) {
    console.error('Error fetching database time:', error);
    return NextResponse.json({ error: 'Failed to fetch database time' }, { status: 500 });
  }
});
