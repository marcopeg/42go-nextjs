import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { setNextAuthUrl } from "@/42go/auth/lib/utils/set-nextauth-url";
import { getProviders } from "@/42go/auth/lib/providers/get-providers";
import { signIn, jwt, session } from "@/42go/auth/lib/callbacks";

async function handler(
  req: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  // Dynamic login origing
  await setNextAuthUrl(req);

  // console.log(providers);
  const providers = await getProviders();

  return NextAuth(req, context, {
    providers,
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
    callbacks: { signIn, jwt, session },
  });
}

export const GET = handler;

export const POST = GET;
