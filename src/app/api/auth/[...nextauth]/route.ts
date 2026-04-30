import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { setNextAuthUrl } from "@/42go/auth/lib/utils/set-nextauth-url";
import { getAuthOptions } from "@/42go/auth/lib/authOptions";

async function handler(
  req: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  // Dynamic login origing
  await setNextAuthUrl(req);

  return NextAuth(req, context, await getAuthOptions());
}

export const GET = handler;

export const POST = GET;
