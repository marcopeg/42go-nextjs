import { DrizzleAdapter } from '@auth/drizzle-adapter';
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, or, ilike } from 'drizzle-orm';
import { verifyPassword } from './password';

// Create a custom adapter with our schema tables
const adapter = DrizzleAdapter(db);

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
    newUser: '/register',
  },
  providers: [
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
    }),
  ],
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
