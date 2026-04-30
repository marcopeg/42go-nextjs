import type { NextRequest } from "next/server";
import { headers as getHeaders } from "next/headers";

export const getNextAuthUrl = async (req: NextRequest) => {
  const headers = await getHeaders();
  const host = headers.get("host");
  const protocol =
    headers.get("x-forwarded-proto")?.toString() ||
    (req.url?.startsWith("https://") ? "https" : "http");
  return `${protocol}://${host}`;
};

export const setNextAuthUrl = async (req: NextRequest) => {
  process.env.NEXTAUTH_URL = await getNextAuthUrl(req);
};
