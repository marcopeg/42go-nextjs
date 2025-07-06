import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
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
    // GitHub OAuth Provider
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      // Configure GitHub scope to get user profile and email
      authorization: {
        params: {
          scope: "read:user user:email",
        },
      },
      // Map GitHub profile to our user schema
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
        };
      },
    }),
    // Credentials Provider (existing)
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
    async signIn({ user, account }) {
      // OAuth sign-in logic
      if (account?.provider === "github") {
        try {
          const db = getDB();

          // Check if user exists by email
          const existingUser = await db("auth.users")
            .where("email", user.email!)
            .first();

          if (existingUser) {
            // User exists - link GitHub account if not already linked
            const existingAccount = await db("auth.accounts")
              .where({
                provider: "github",
                provider_account_id: account.providerAccountId,
              })
              .first();

            if (!existingAccount) {
              // Link GitHub account to existing user
              await db("auth.accounts").insert({
                user_id: existingUser.id,
                type: account.type,
                provider: account.provider,
                provider_account_id: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
              });
            }

            // Update user profile with latest GitHub data
            await db("auth.users")
              .where("id", existingUser.id)
              .update({
                name: user.name || existingUser.name,
                image: user.image || existingUser.image,
                updated_at: new Date(),
              });

            // Set user.id to existing user for JWT token
            user.id = existingUser.id;
          } else {
            // New user - create user profile
            const newUserId = `usr_${Date.now()}_${Math.random()
              .toString(36)
              .substring(2)}`;

            await db("auth.users").insert({
              id: newUserId,
              name: user.name,
              email: user.email,
              image: user.image,
              email_verified: new Date(), // GitHub emails are verified
              created_at: new Date(),
              updated_at: new Date(),
            });

            // Create GitHub account link
            await db("auth.accounts").insert({
              user_id: newUserId,
              type: account.type,
              provider: account.provider,
              provider_account_id: account.providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state,
            });

            // Set user.id for JWT token
            user.id = newUserId;
          }

          return true;
        } catch (error) {
          console.error("GitHub OAuth sign-in error:", error);
          return false;
        }
      }

      // Allow credentials sign-in (existing logic)
      return true;
    },
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
