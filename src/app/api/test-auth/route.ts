import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { env } from '@/env';

export async function GET() {
  // Only allow in development mode
  if (env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This API is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    // Get the current session
    const session = await auth();

    if (!session) {
      return NextResponse.json({ message: 'Not authenticated', session: null }, { status: 200 });
    }

    return NextResponse.json({
      message: 'Authentication working correctly',
      session: {
        user: {
          id: session.user?.id,
          name: session.user?.name,
          email: session.user?.email,
          image: session.user?.image,
        },
      },
    });
  } catch (error) {
    console.error('Auth test error:', error);
    return NextResponse.json(
      { error: 'Failed to test authentication', details: String(error) },
      { status: 500 }
    );
  }
}
