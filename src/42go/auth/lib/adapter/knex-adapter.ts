import type {
  Adapter,
  AdapterAccount,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters";
import { v4 as uuidv4 } from "uuid";

import { getDB } from "@/42go/db";
import { normalizeEmailIdentifier, usernameFromEmail } from "@/42go/auth/lib/email/utils";

const toAdapterUser = (row: Record<string, unknown> | null | undefined): AdapterUser | null => {
  if (!row) return null;

  return {
    id: String(row.id),
    name: row.name ? String(row.name) : null,
    email: String(row.email),
    emailVerified: row.email_verified ? new Date(String(row.email_verified)) : null,
    image: row.image ? String(row.image) : null,
    appId: row.app_id ? String(row.app_id) : undefined,
  } as AdapterUser;
};

const toAdapterSession = (row: Record<string, unknown> | null | undefined): AdapterSession | null => {
  if (!row) return null;

  return {
    sessionToken: String(row.session_token),
    userId: String(row.user_id),
    expires: new Date(String(row.expires)),
  };
};

export const createKnexAuthAdapter = ({ appId }: { appId: string }): Adapter => {
  const db = getDB();

  return {
    createUser: async (user: Omit<AdapterUser, "id">) => {
      const email = normalizeEmailIdentifier(user.email);
      const preferredUsername = usernameFromEmail(email);
      const usernameExists = await db("auth.users")
        .where({ app_id: appId, username: preferredUsername })
        .first();
      const now = new Date();
      const id = uuidv4();

      await db("auth.users").insert({
        app_id: appId,
        id,
        username: usernameExists ? email : preferredUsername,
        name: user.name || preferredUsername,
        email,
        email_verified: user.emailVerified || null,
        image: user.image || null,
        created_at: now,
        updated_at: now,
      });

      return (await db("auth.users").where({ app_id: appId, id }).first().then(toAdapterUser))!;
    },

    getUser: async (id: string) =>
      db("auth.users").where({ app_id: appId, id }).first().then(toAdapterUser),

    getUserByEmail: async (email: string) =>
      db("auth.users")
        .where({ app_id: appId, email: normalizeEmailIdentifier(email) })
        .first()
        .then(toAdapterUser),

    getUserByAccount: async ({ provider, providerAccountId }: Pick<AdapterAccount, "provider" | "providerAccountId">) =>
      db("auth.accounts as account")
        .join("auth.users as user", "user.id", "account.user_id")
        .where({
          "account.app_id": appId,
          "account.provider": provider,
          "account.account_id": providerAccountId,
          "user.app_id": appId,
        })
        .select("user.*")
        .first()
        .then(toAdapterUser),

    updateUser: async (user: Partial<AdapterUser> & Pick<AdapterUser, "id">) => {
      const updateValues: Record<string, unknown> = { updated_at: new Date() };
      if ("name" in user) updateValues.name = user.name;
      if ("email" in user && user.email) updateValues.email = normalizeEmailIdentifier(user.email);
      if ("emailVerified" in user) updateValues.email_verified = user.emailVerified;
      if ("image" in user) updateValues.image = user.image;

      await db("auth.users").where({ app_id: appId, id: user.id }).update(updateValues);

      const updated = await db("auth.users").where({ app_id: appId, id: user.id }).first();
      const adapterUser = toAdapterUser(updated);
      if (!adapterUser) throw new Error("Cannot update missing user.");
      return adapterUser;
    },

    linkAccount: async (account: AdapterAccount) => {
      const now = new Date();
      const row = {
        app_id: appId,
        user_id: account.userId,
        type: account.type,
        provider: account.provider,
        account_id: account.providerAccountId,
        access_token: account.access_token,
        refresh_token: account.refresh_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
        session_state: account.session_state,
        created_at: now,
        updated_at: now,
      };

      await db("auth.accounts")
        .insert(row)
        .onConflict(["app_id", "account_id", "provider"])
        .merge({
          user_id: row.user_id,
          type: row.type,
          access_token: row.access_token,
          refresh_token: row.refresh_token,
          expires_at: row.expires_at,
          token_type: row.token_type,
          scope: row.scope,
          id_token: row.id_token,
          session_state: row.session_state,
          updated_at: now,
        });

      return account;
    },

    createSession: async (session: AdapterSession) => {
      await db("auth.sessions").insert({
        session_token: session.sessionToken,
        user_id: session.userId,
        expires: session.expires,
      });
      return session;
    },

    getSessionAndUser: async (sessionToken: string) => {
      const row = await db("auth.sessions as session")
        .join("auth.users as user", "user.id", "session.user_id")
        .where("session.session_token", sessionToken)
        .select(
          "session.session_token",
          "session.user_id",
          "session.expires",
          "user.id",
          "user.app_id",
          "user.name",
          "user.email",
          "user.email_verified",
          "user.image"
        )
        .first();

      if (!row) return null;
      const session = toAdapterSession(row);
      const user = toAdapterUser(row);
      if (!session || !user) return null;
      return { session, user };
    },

    updateSession: async (session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">) => {
      await db("auth.sessions")
        .where("session_token", session.sessionToken)
        .update({
          expires: session.expires,
        });

      return db("auth.sessions")
        .where("session_token", session.sessionToken)
        .first()
        .then(toAdapterSession);
    },

    deleteSession: async (sessionToken: string) => {
      const rows = await db("auth.sessions")
        .where("session_token", sessionToken)
        .delete()
        .returning("*");

      return toAdapterSession(rows[0]);
    },

    createVerificationToken: async (verificationToken: VerificationToken) => {
      await db("auth.verification_tokens").insert({
        app_id: appId,
        identifier: normalizeEmailIdentifier(verificationToken.identifier),
        token: verificationToken.token,
        expires: verificationToken.expires,
      });

      return verificationToken;
    },

    useVerificationToken: async ({ identifier, token }: { identifier: string; token: string }) => {
      const rows = await db("auth.verification_tokens")
        .where({
          app_id: appId,
          identifier: normalizeEmailIdentifier(identifier),
          token,
        })
        .delete()
        .returning("*");

      const row = rows[0];
      if (!row) return null;

      return {
        identifier: String(row.identifier),
        token: String(row.token),
        expires: new Date(String(row.expires)),
      };
    },
  };
};
