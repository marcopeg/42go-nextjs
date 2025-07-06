import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { getDB } from "../db";

// Extend NextAuth's session type to include our custom user fields
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      // Add more fields as needed
      // roles?: string[];
      // permissions?: string[];
    };
  }

  // Extend the User interface with our AuthUser type
  interface User {
    id: string;
    name: string;
    email: string;
  }
}

declare module "next-auth/jwt" {
  // Extend the JWT interface with our token type
  interface JWT {
    id: string;
    email: string;
    name: string;
    // Add more fields as needed
    // roles?: string[];
    // permissions?: string[];
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        // Missing credentials - return null
        if (!credentials || !credentials.username || !credentials.password) {
          return null;
        }

        try {
          // Get database connection
          const db = getDB();

          // Query for user by username (case-insensitive using PostgreSQL ILIKE)
          const user = await db("auth.users")
            .where("name", "ilike", credentials.username)
            .first();

          // User not found - return null without revealing this info
          if (!user) {
            return null;
          }

          // Verify password using bcrypt
          const isValidPassword = await bcrypt.compare(
            credentials.password,
            user.password
          );

          // Invalid password - return null
          if (!isValidPassword) {
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
        // Now we have proper typing - no casting needed!
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
      }
      return session;
    },
  },
};
