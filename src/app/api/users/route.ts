import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { auth } from '@/lib/auth/auth';
import { sessionHasGrants } from '@/lib/auth/grants';

// Define the grant ID constants for clarity
const GRANT_BACKOFFICE = 'backoffice';

export async function GET() {
  try {
    // Check if user is authenticated
    const session = await auth();
    console.log('Current session:', JSON.stringify(session, null, 2));

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user has the 'backoffice' grant by ID
    const hasBackofficeAccess = await sessionHasGrants(session, [GRANT_BACKOFFICE]);
    console.log('Has backoffice access:', hasBackofficeAccess);

    if (!hasBackofficeAccess) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
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
