import "server-only";

import type { Knex } from "knex";

import {
  createQuickShareApiToken,
  getQuickShareApiTokenPrefix,
  hashQuickShareApiToken,
  parseQuickShareBearerToken,
  quickShareTokenHashMatches,
} from "@/lib/quickshare/server/api-token";

type TokenRow = {
  id: string;
  app_id: string;
  account_id: string;
  user_id: string;
  token_prefix: string;
  token_hash: string;
  created_at: Date | string;
  updated_at: Date | string;
  last_used_at: Date | string | null;
};

export type QuickShareApiTokenStatus = {
  exists: boolean;
  prefix?: string;
  createdAt?: string;
  updatedAt?: string;
  lastUsedAt?: string | null;
};

export type QuickShareApiPrincipal = {
  appId: string;
  accountId: string;
  userId: string;
};

export class QuickShareApiTokenLifecycleError extends Error {
  constructor(
    public readonly code: "token_exists" | "token_missing" | "token_changed"
  ) {
    super(code);
    this.name = "QuickShareApiTokenLifecycleError";
  }
}

const toISO = (value: Date | string | null | undefined): string | null =>
  value ? new Date(value).toISOString() : null;

const toStatus = (row: TokenRow): QuickShareApiTokenStatus => ({
  exists: true,
  prefix: row.token_prefix,
  createdAt: toISO(row.created_at) ?? undefined,
  updatedAt: toISO(row.updated_at) ?? undefined,
  lastUsedAt: toISO(row.last_used_at),
});

export const getQuickShareApiTokenStatus = async (
  db: Knex,
  principal: QuickShareApiPrincipal
): Promise<QuickShareApiTokenStatus> => {
  const row = (await db("quickshare.api_tokens")
    .where({
      app_id: principal.appId,
      account_id: principal.accountId,
      user_id: principal.userId,
    })
    .first()) as TokenRow | undefined;

  return row ? toStatus(row) : { exists: false };
};

export const createQuickShareApiTokenCredential = async (
  db: Knex,
  principal: QuickShareApiPrincipal
): Promise<{ token: string; status: QuickShareApiTokenStatus }> => {
  const token = createQuickShareApiToken();
  const now = new Date();
  try {
    const [row] = (await db("quickshare.api_tokens")
      .insert({
        app_id: principal.appId,
        account_id: principal.accountId,
        user_id: principal.userId,
        token_prefix: getQuickShareApiTokenPrefix(token),
        token_hash: hashQuickShareApiToken(token),
        created_at: now,
        updated_at: now,
        last_used_at: null,
      })
      .returning([
        "id",
        "app_id",
        "account_id",
        "user_id",
        "token_prefix",
        "token_hash",
        "created_at",
        "updated_at",
        "last_used_at",
      ])) as TokenRow[];

    return { token, status: toStatus(row) };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new QuickShareApiTokenLifecycleError("token_exists");
    }
    throw error;
  }
};

export const rotateQuickShareApiTokenCredential = async (
  db: Knex,
  principal: QuickShareApiPrincipal,
  expectedUpdatedAt: string
): Promise<{ token: string; status: QuickShareApiTokenStatus }> => {
  const token = createQuickShareApiToken();
  const now = new Date();
  const row = await db.transaction(async (transaction) => {
    const current = (await transaction("quickshare.api_tokens")
      .where({
        app_id: principal.appId,
        account_id: principal.accountId,
        user_id: principal.userId,
      })
      .forUpdate()
      .first()) as TokenRow | undefined;

    if (!current) throw new QuickShareApiTokenLifecycleError("token_missing");
    if (toISO(current.updated_at) !== expectedUpdatedAt) {
      throw new QuickShareApiTokenLifecycleError("token_changed");
    }

    const [updated] = (await transaction("quickshare.api_tokens")
      .where({ id: current.id, app_id: principal.appId })
      .update({
        token_prefix: getQuickShareApiTokenPrefix(token),
        token_hash: hashQuickShareApiToken(token),
        created_at: now,
        updated_at: now,
        last_used_at: null,
      })
      .returning([
        "id",
        "app_id",
        "account_id",
        "user_id",
        "token_prefix",
        "token_hash",
        "created_at",
        "updated_at",
        "last_used_at",
      ])) as TokenRow[];

    return updated;
  });

  return { token, status: toStatus(row) };
};

export const deleteQuickShareApiToken = async (
  db: Knex,
  principal: QuickShareApiPrincipal
): Promise<boolean> => {
  const deleted = await db("quickshare.api_tokens")
    .where({
      app_id: principal.appId,
      account_id: principal.accountId,
      user_id: principal.userId,
    })
    .del();

  return deleted > 0;
};

export const authenticateQuickShareApiToken = async (
  db: Knex,
  appId: string,
  authorization: string | null
): Promise<QuickShareApiPrincipal | null> => {
  const token = parseQuickShareBearerToken(authorization);
  if (!token) return null;

  const tokenHash = hashQuickShareApiToken(token);
  const tokenPrefix = getQuickShareApiTokenPrefix(token);
  const candidates = (await db("quickshare.api_tokens as token")
    .join("auth.users as user", "user.id", "token.user_id")
    .join("quickshare.accounts as account", "account.id", "token.account_id")
    .select("token.id", "token.app_id", "token.account_id", "token.user_id", "token.token_hash")
    .where("token.app_id", appId)
    .andWhere("token.token_prefix", tokenPrefix)
    .andWhere("user.app_id", appId)
    .andWhere("account.app_id", appId)
    .andWhereRaw('"account"."user_id" = "token"."user_id"')) as Array<
    Pick<TokenRow, "id" | "app_id" | "account_id" | "user_id" | "token_hash">
  >;

  const matched = candidates.find((candidate) =>
    quickShareTokenHashMatches(tokenHash, candidate.token_hash)
  );
  if (!matched) return null;

  await db("quickshare.api_tokens")
    .where({ id: matched.id, app_id: appId })
    .update({ last_used_at: new Date() });

  return {
    appId: matched.app_id,
    accountId: matched.account_id,
    userId: matched.user_id,
  };
};

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: string }).code === "23505";
