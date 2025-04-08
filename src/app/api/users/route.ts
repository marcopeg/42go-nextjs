import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { sessionHasGrants } from '@/lib/auth/grants';
import { sessionHasRoles } from '@/lib/auth/roles';

export async function GET() {
  try {
    // Check if the user has the required grant
    const hasAccess = await sessionHasGrants(['users:list']);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if the user has the required roles
    const hasRoles = await sessionHasRoles(['backoffice']);
    if (!hasRoles) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
