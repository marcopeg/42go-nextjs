import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { protectRoute } from '@/lib/auth/route-protection';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const response = await protectRoute(req, {
    grants: ['users:list'],
    roles: ['backoffice', 'foo'],
  });

  // If the response is not NextResponse.next(), it means there was an error
  if (response.status !== 200) {
    return response;
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
}
