import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { getDB } from "../db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials || !credentials.username || !credentials.password) {
          return null;
        }

        try {
          // Get database connection
          const db = getDB();

          // Query for user by username (case-insensitive)
          const user = await db("auth.users")
            .where(db.raw("LOWER(name) = LOWER(?)", [credentials.username]))
            .first();

          if (!user) {
            // User not found - return null without revealing this info
            return null;
          }

          // Verify password using bcrypt
          const isValidPassword = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isValidPassword) {
            // Invalid password - return null
            return null;
          }

          // Return user object for NextAuth session
          return {
            id: user.id,
            name: user.name,
            email: user.email,
          };
        } catch (error) {
          // Log error for debugging but don't expose details to client
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 30 * 60, // 30 minutes
  },
  pages: {
    signIn: "/login",
    signOut: "/logout",
    error: "/error",
    verifyRequest: "/verify-request",
    newUser: "/signup",
  },
  callbacks: {
    async jwt({ token, user }) {
      // Initial login - store user data
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }

      // On token refresh - validate user is still active
      if (token.id) {
        // TODO: Check backend - is user still active/subscribed?
        // const isUserActive = await checkUserStatus(token.id);
        // if (!isUserActive) {
        //   return null; // This will log out the user
        // }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        // Extend the session user object with id
        (
          session.user as {
            id?: string;
            name?: string | null;
            email?: string | null;
          }
        ).id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
};
