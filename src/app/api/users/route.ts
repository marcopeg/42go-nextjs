import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { withAuth } from '@/lib/auth/with-auth';
import { NextResponse } from 'next/server';

export const GET = withAuth({
  grants: ['users:list'],
  roles: ['backoffice', 'foo'],
})(async () => {
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
});
