import { DrizzleAdapter } from '@auth/drizzle-adapter';
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Facebook from 'next-auth/providers/facebook';
import { db } from '@/lib/db';
import { users, accounts, sessions, verificationTokens } from '@/lib/db/schema';
import { eq, or, ilike } from 'drizzle-orm';
import { verifyPassword } from './password';
import { isGitHubOAuthEnabled, isGoogleOAuthEnabled, isFacebookOAuthEnabled } from './oauth-config';

// Create a custom adapter with our schema tables
const adapter = DrizzleAdapter(db, {
  usersTable: users,
  accountsTable: accounts,
  sessionsTable: sessions,
  verificationTokensTable: verificationTokens,
});

// Initialize providers array
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const providers: any[] = [
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
        const isPasswordValid = await verifyPassword(credentials.password as string, user.password);

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
  }),
];

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
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/error',
    verifyRequest: '/verify-request',
    newUser: '/dashboard',
  },
  providers,
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
        session.user.name = token.name as string | null;
        session.user.email = token.email as string;
        session.user.image = token.picture as string | null;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },
  },
};
