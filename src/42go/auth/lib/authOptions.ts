import type { NextAuthOptions } from "next-auth";
import { getAppInfo } from "@/42go/config/app-config";
import { createKnexAuthAdapter } from "@/42go/auth/lib/adapter/knex-adapter";
import { buildProviders } from "./providers/get-providers";
import { signIn, jwt, session } from "./callbacks";

const requireAuthSecret = () => {
  if (!process.env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET is required.");
  }
  return process.env.AUTH_SECRET;
};

// Centralized dynamic NextAuth options used across API & server utilities.
export async function getAuthOptions(): Promise<NextAuthOptions> {
  const { id: appID, config } = await getAppInfo();
  const providers = buildProviders(appID, config);
  const hasEmailProvider = (config?.auth?.providers || []).some(
    (provider) => provider.type === "email"
  );

  return {
    providers,
    secret: requireAuthSecret(),
    adapter:
      hasEmailProvider && appID
        ? createKnexAuthAdapter({ appId: appID })
        : undefined,
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60,
      updateAge: 30 * 60,
    },
    pages: {
      signIn: "/login",
      error: "/login", // Redirect errors to login page (AuthError component handles display)
      verifyRequest: "/verify-request",
    },
    callbacks: { signIn, jwt, session },
  } satisfies NextAuthOptions;
}
