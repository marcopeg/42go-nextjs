import "server-only";

import type { Knex } from "knex";

import {
  createQuicklistApiToken,
  getQuicklistApiTokenPrefix,
  hashQuicklistApiToken,
  parseQuicklistBearerToken,
  quicklistTokenHashMatches,
} from "@/lib/quicklists/server/api-token";

type TokenRow = {
  id: string;
  app_id: string;
  user_id: string;
  token_prefix: string;
  token_hash: string;
  created_at: Date;
  updated_at: Date;
  last_used_at: Date | null;
};

export type QuicklistApiTokenStatus = {
  exists: boolean;
  prefix?: string;
  createdAt?: string;
  updatedAt?: string;
  lastUsedAt?: string | null;
};

export type QuicklistApiPrincipal = {
  appId: string;
  userId: string;
};

const toISO = (value: Date | string | null | undefined): string | null =>
  value ? (value instanceof Date ? value : new Date(value)).toISOString() : null;

export const getQuicklistApiTokenStatus = async (
  db: Knex,
  principal: QuicklistApiPrincipal
): Promise<QuicklistApiTokenStatus> => {
  const row = (await db("quicklist.api_tokens")
    .where({ app_id: principal.appId, user_id: principal.userId })
    .first()) as TokenRow | undefined;

  if (!row) return { exists: false };

  return {
    exists: true,
    prefix: row.token_prefix,
    createdAt: toISO(row.created_at)!,
    updatedAt: toISO(row.updated_at)!,
    lastUsedAt: toISO(row.last_used_at),
  };
};

export const createOrRotateQuicklistApiToken = async (
  db: Knex,
  principal: QuicklistApiPrincipal
): Promise<{ token: string; status: QuicklistApiTokenStatus }> => {
  const token = createQuicklistApiToken();
  const now = new Date();

  const [row] = (await db("quicklist.api_tokens")
    .insert({
      app_id: principal.appId,
      user_id: principal.userId,
      token_prefix: getQuicklistApiTokenPrefix(token),
      token_hash: hashQuicklistApiToken(token),
      created_at: now,
      updated_at: now,
      last_used_at: null,
    })
    .onConflict(["app_id", "user_id"])
    .merge({
      token_prefix: getQuicklistApiTokenPrefix(token),
      token_hash: hashQuicklistApiToken(token),
      updated_at: now,
      last_used_at: null,
    })
    .returning([
      "id",
      "app_id",
      "user_id",
      "token_prefix",
      "token_hash",
      "created_at",
      "updated_at",
      "last_used_at",
    ])) as TokenRow[];

  return {
    token,
    status: {
      exists: true,
      prefix: row.token_prefix,
      createdAt: toISO(row.created_at)!,
      updatedAt: toISO(row.updated_at)!,
      lastUsedAt: null,
    },
  };
};

export const deleteQuicklistApiToken = async (
  db: Knex,
  principal: QuicklistApiPrincipal
): Promise<boolean> => {
  const deleted = await db("quicklist.api_tokens")
    .where({ app_id: principal.appId, user_id: principal.userId })
    .del();

  return deleted > 0;
};

export const authenticateQuicklistApiToken = async (
  db: Knex,
  appId: string,
  authorization: string | null
): Promise<QuicklistApiPrincipal | null> => {
  const token = parseQuicklistBearerToken(authorization);
  if (!token) return null;

  const tokenHash = hashQuicklistApiToken(token);
  const tokenPrefix = getQuicklistApiTokenPrefix(token);
  const candidates = (await db("quicklist.api_tokens as token")
    .join("auth.users as user", "user.id", "token.user_id")
    .select(
      "token.id",
      "token.user_id",
      "token.token_hash"
    )
    .where("token.app_id", appId)
    .andWhere("token.token_prefix", tokenPrefix)
    .andWhere("user.app_id", appId)) as Array<{
    id: string;
    user_id: string;
    token_hash: string;
  }>;

  const matched = candidates.find((candidate) =>
    quicklistTokenHashMatches(tokenHash, candidate.token_hash)
  );
  if (!matched) return null;

  await db("quicklist.api_tokens")
    .where({ id: matched.id })
    .update({ last_used_at: new Date() });

  return { appId, userId: matched.user_id };
};
