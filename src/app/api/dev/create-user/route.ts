import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { env } from '@/env';
import { eq, or } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  // Only allow in development mode or when explicitly enabled
  if (env.NODE_ENV === 'production' || env.DISABLE_DEV_API === 'true') {
    return NextResponse.json(
      { error: 'This API is disabled in production or by configuration' },
      { status: 403 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Username parameter is required' }, { status: 400 });
  }

  try {
    // Use the username as both email and password
    const email = `${username}@example.com`;
    const password = username;

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Check if user already exists by username or email
    const existingUsers = await db
      .select()
      .from(users)
      .where(or(eq(users.email, email), eq(users.name, username)))
      .limit(1);

    if (existingUsers.length > 0) {
      return NextResponse.json(
        {
          message: `User ${username} already exists`,
          userId: existingUsers[0].id,
          email: existingUsers[0].email,
          username: existingUsers[0].name,
        },
        { status: 200 }
      );
    }

    // Create the user
    const result = await db
      .insert(users)
      .values({
        id: uuidv4(),
        name: username,
        email: email,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: users.id });

    return NextResponse.json({
      message: `User ${username} created successfully`,
      userId: result[0].id,
      email: email,
      username: username,
      password: password, // Only returning this for development purposes
    });
  } catch (error) {
    console.error('Error creating test user:', error);
    return NextResponse.json({ error: 'Failed to create test user' }, { status: 500 });
  }
}
