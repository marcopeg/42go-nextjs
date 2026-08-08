import "server-only";

import { getDB } from "@/42go/db";

type UserSessionProfile = {
  profile: Record<string, unknown> | null;
  featureFlags: Record<string, unknown>;
};

const asRecord = (value: unknown) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

export const getUserSessionProfile = async (
  userId: string
): Promise<UserSessionProfile> => {
  const row = (await getDB()("auth.users")
    .select("profile", "feature_flags")
    .where({ id: userId })
    .first()) as
    | { profile?: unknown; feature_flags?: unknown }
    | undefined;

  return {
    profile: asRecord(row?.profile),
    featureFlags: asRecord(row?.feature_flags) || {},
  };
};
