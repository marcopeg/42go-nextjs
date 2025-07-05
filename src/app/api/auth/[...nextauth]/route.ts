import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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

        // Mock validation logic
        if (credentials.username === "aaa" && credentials.password === "aaa") {
          return {
            id: "1",
            name: "John Doe",
            email: "john.doe@example.com",
          };
        }

        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    signOut: "/logout",
    error: "/error",
    verifyRequest: "/verify-request",
    newUser: "/dashboard",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
