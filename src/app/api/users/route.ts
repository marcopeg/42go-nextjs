import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { sessionHasGrants } from '@/lib/auth/grants';

// Define the grant ID constants for clarity
const GRANT_BACKOFFICE = 'users:list';

export async function GET() {
  try {
    // Check if the user has the required grant
    const hasAccess = await sessionHasGrants([GRANT_BACKOFFICE]);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch users from the database
    const usersList = await db.select().from(users);

    // Map users to the format we need
    const mappedUsers = usersList.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt,
    }));

    return NextResponse.json({ users: mappedUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
