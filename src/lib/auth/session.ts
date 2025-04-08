import { cookies } from 'next/headers';

/**
 * Session interface representing the current user's session
 */
export interface Session {
  userId: string;
  email: string;
  grants: string[];
  roles: string[];
}

/**
 * Gets the current session from cookies
 *
 * @returns Promise<Session | null> The current session or null if not authenticated
 */
export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie?.value) {
      return null;
    }

    // In a real implementation, you would verify the session token
    // and decode it to get the session data
    const session = JSON.parse(sessionCookie.value) as Session;
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}
