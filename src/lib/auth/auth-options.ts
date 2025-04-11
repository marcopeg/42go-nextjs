import { DrizzleAdapter } from '@auth/drizzle-adapter';
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Facebook from 'next-auth/providers/facebook';
import { db } from '@/lib/db';
import {
  users,
  accounts,
  sessions,
  verificationTokens,
  rolesUsers,
  rolesGrants,
} from '@/lib/db/schema';
import { eq, or, ilike, inArray } from 'drizzle-orm';
import { verifyPassword } from './password';
import {
  isGitHubOAuthEnabled,
  isGoogleOAuthEnabled,
  isFacebookOAuthEnabled,
  isPasswordAuthEnabled,
} from './oauth-config';

// Create a custom adapter with our schema tables
const adapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
});

// Initialize providers array
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const providers: any[] = [];

// Add Credentials provider if enabled
if (isPasswordAuthEnabled()) {
  providers.push(
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const identifier = credentials.email as string;

          // Find user by email or username (stored in name field)
          const [user] = await db
            .select()
            .from(users)
            .where(or(eq(users.email, identifier), ilike(users.name, identifier)))
            .limit(1);

          if (!user || !user.password) {
            return null;
          }

          // Verify password
          const isPasswordValid = await verifyPassword(
            credentials.password as string,
            user.password
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name || null,
            image: user.image || null,
          };
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      },
    })
  );
}

// Add GitHub provider if enabled
if (isGitHubOAuthEnabled()) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_ID as string,
      clientSecret: process.env.GITHUB_SECRET as string,
    })
  );
}

// Add Google provider if enabled
if (isGoogleOAuthEnabled()) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    })
  );
}

// Add Facebook provider if enabled
if (isFacebookOAuthEnabled()) {
  providers.push(
    Facebook({
      clientId: process.env.FACEBOOK_CLIENT_ID as string,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET as string,
    })
  );
}

export const authOptions: NextAuthConfig = {
  adapter,
  session: {
    strategy: 'jwt',
  },
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'None',
        path: '/',
        secure: true,
      },
    },
    callbackUrl: {
      name: `__Secure-next-auth.callback-url`,
      options: {
        sameSite: 'None',
        path: '/',
        secure: true,
      },
    },
    csrfToken: {
      name: `__Host-next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'None',
        path: '/',
        secure: true,
      },
    },
  },
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/error',
    verifyRequest: '/verify-request',
    newUser: '/app/dashboard',
  },
  providers,
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.name = token.name as string | null;
        session.user.email = token.email as string;
        session.user.image = token.picture as string | null;

        // Add grants to the session
        if (token.grants) {
          session.user.grants = token.grants as string[];
        } else {
          // If no grants in token, fetch them from the database
          try {
            const userGrants = await fetchUserGrants(token.sub as string);
            session.user.grants = userGrants;

            // Update token with grants for future requests
            token.grants = userGrants;
          } catch (error) {
            console.error('Error fetching user grants:', error);
            session.user.grants = [];
          }
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;

        // If user has grants, add them to the token
        if ('grants' in user) {
          token.grants = user.grants;
        }
      }
      return token;
    },
  },
};

/**
 * Fetch user grants from the database
 * This function fetches all grants associated with the user's roles
 */
async function fetchUserGrants(userId: string): Promise<string[]> {
  try {
    // Get all user role IDs
    const userRoles = await db
      .select({ roleId: rolesUsers.roleId })
      .from(rolesUsers)
      .where(eq(rolesUsers.userId, userId));

    if (!userRoles.length) {
      console.log(`No roles found for user: ${userId}`);
      return [];
    }

    const userRoleIds = userRoles.map(role => role.roleId);
    console.log(`Found ${userRoleIds.length} roles for user: ${userId}`);

    // Get all grants that the user has through their roles
    const userGrants = await db
      .select({ grantId: rolesGrants.grantId })
      .from(rolesGrants)
      .where(inArray(rolesGrants.roleId, userRoleIds));

    // Return the grant IDs
    const grantIds = userGrants.map(g => g.grantId);
    console.log(`Found ${grantIds.length} grants for user: ${userId}`);

    return grantIds;
  } catch (error) {
    console.error(`Error fetching grants for user ${userId}:`, error);
    return [];
  }
}
