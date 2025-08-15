import type { NextAuthOptions } from "next-auth";
import { getProviders } from "./providers/get-providers";
import { signIn, jwt, session } from "./callbacks";

// Centralized dynamic NextAuth options used across API & server utilities.
export async function getAuthOptions(): Promise<NextAuthOptions> {
  const providers = await getProviders();
  return {
    providers,
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60,
      updateAge: 30 * 60,
    },
    pages: {
      signIn: "/login",
      error: "/error",
      verifyRequest: "/verify-request",
      newUser: "/signup",
    },
    callbacks: { signIn, jwt, session },
  } satisfies NextAuthOptions;
}
