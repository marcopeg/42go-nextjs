import { createHash } from "crypto";

export const hashEmailToken = (token: string, secret?: string | null) => {
  const resolvedSecret = secret || process.env.AUTH_SECRET;
  if (!resolvedSecret) {
    throw new Error("AUTH_SECRET is required for email token verification.");
  }

  return createHash("sha256").update(`${token}${resolvedSecret}`).digest("hex");
};
