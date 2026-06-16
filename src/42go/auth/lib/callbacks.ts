import { v4 as uuidv4 } from "uuid";
import { getDB } from "@/42go/db";
import { getUserGrants, getUserRoles } from "@/42go/policy/access";
import { getAppID } from "@/42go/config/app-config";
import { apps } from "@/AppConfig";
import { recordEvent } from "@/42go/events/server";
import { normalizeEmailIdentifier } from "@/42go/auth/lib/email/utils";

const FALLBACK_APP_ID = "default";

const isKnownAppId = (value: unknown): value is keyof typeof apps =>
  typeof value === "string" && value in apps;

const resolveRbacAppId = async (
  fallback = FALLBACK_APP_ID,
  requestedAppId?: unknown
) => {
  if (isKnownAppId(requestedAppId)) return requestedAppId;

  const appId = await getAppID();
  if (appId) return appId;

  if (isKnownAppId(fallback)) return fallback;

  return FALLBACK_APP_ID;
};

const recordAuthEvent = async ({
  appId,
  userId,
  name,
  method,
}: {
  appId: string;
  userId?: string | null;
  name: "user.login" | "user.signup";
  method: string;
}) => {
  if (!userId) return;

  try {
    await recordEvent({
      appId,
      userId,
      name,
      data: { method },
    });
  } catch (error) {
    console.error(`Auth event logging failed for ${name}:`, error);
  }
};

const looksLikeEmailIdentifier = (value: unknown) =>
  typeof value === "string" && value.includes("@");

// EmailProvider can pass the email address as user.id in the signIn callback.
// Resolve it when possible; otherwise keep an explicit pseudo identity for the event log.
const resolveEmailProviderUser = async ({
  appId,
  user,
}: {
  appId?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any;
}) => {
  if (!appId || !user?.email || !looksLikeEmailIdentifier(user?.id)) {
    return user?.id || null;
  }

  const email = normalizeEmailIdentifier(user.email);
  const existingUser = await getDB()("auth.users")
    .where({ app_id: appId, email })
    .first();

  if (!existingUser?.id) return `email:${email}`;

  user.id = existingUser.id;
  user.appId = appId;
  user.email = existingUser.email || email;
  user.name = existingUser.name || user.name;
  user.image = existingUser.image || user.image;

  return String(existingUser.id);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const signIn = async ({ user, account }: any) => {
  // ProviderID will store the tokens as unique tokens per app/user
  const appID = await getAppID();
  // Use explicit app_id column instead of overloading provider

  if (account?.provider === "github" || account?.provider === "google") {
    try {
      const db = getDB();
      let isSignup = false;
      const existingUser = await db("auth.users")
        .where("app_id", appID)
        .andWhere("email", user.email!)
        .first();

      if (existingUser) {
        const existingAccount = await db("auth.accounts")
          .where({
            provider: account.provider,
            account_id: account.providerAccountId,
            app_id: appID,
          })
          .first();

        if (!existingAccount) {
          await db("auth.accounts").insert({
            user_id: existingUser.id,
            type: account.type,
            provider: account.provider,
            account_id: account.providerAccountId,
            app_id: appID,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            session_state: account.session_state,
            created_at: new Date(),
            updated_at: new Date(),
          });
        } else {
          // Keep provider account tokens fresh on subsequent sign-ins
          await db("auth.accounts")
            .where({
              provider: account.provider,
              account_id: account.providerAccountId,
              app_id: appID,
            })
            .update({
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state,
              updated_at: new Date(),
            });
        }

        await db("auth.users")
          .where("id", existingUser.id)
          .update({
            name: user.name || existingUser.name,
            image: user.image || existingUser.image,
            updated_at: new Date(),
          });

        user.id = existingUser.id;
        if (appID) user.appId = appID;
      } else {
        isSignup = true;
        // const newUserId = `${account.provider}_${account.providerAccountId}`;
        const newUserId = uuidv4();

        await db("auth.users").insert({
          app_id: appID,
          id: newUserId,
          name: user.name,
          email: user.email,
          image: user.image,
          email_verified: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        });

        await db("auth.accounts").insert({
          user_id: newUserId,
          type: account.type,
          provider: account.provider,
          account_id: account.providerAccountId,
          app_id: appID,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
          session_state: account.session_state,
          created_at: new Date(),
          updated_at: new Date(),
        });

        user.id = newUserId;
        if (appID) user.appId = appID;
      }

      if (isSignup) {
        await recordAuthEvent({
          appId: user.appId || appID || FALLBACK_APP_ID,
          userId: user.id,
          name: "user.signup",
          method: account.provider,
        });
      }

      await recordAuthEvent({
        appId: user.appId || appID || FALLBACK_APP_ID,
        userId: user.id,
        name: "user.login",
        method: account.provider,
      });

      return true;
    } catch (error) {
      console.error(`${account?.provider} OAuth sign-in error:`, error);
      return false;
    }
  }

  const fallbackAppId = user?.appId || appID || FALLBACK_APP_ID;
  const userId =
    account?.provider === "email"
      ? await resolveEmailProviderUser({ appId: fallbackAppId, user })
      : user?.id;

  await recordAuthEvent({
    appId: user?.appId || fallbackAppId,
    userId,
    name: "user.login",
    method: account?.provider || "credentials",
  });

  return true;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const jwt = async ({ token, user, trigger, session }: any) => {
  if (user) {
    token.id = user.id;
    token.email = user.email;
    token.name = user.name;

    // Embed RBAC data into JWT for client-side session cache
    try {
      const appId = await resolveRbacAppId(FALLBACK_APP_ID, user.appId);
      const [grants, roles] = await Promise.all([
        getUserGrants(user.id, appId),
        getUserRoles(user.id, appId),
      ]);
      token.grants = grants;
      token.roles = roles;
      token.appId = appId;
    } catch (error) {
      console.error("JWT callback: failed to load user RBAC data", error);
      token.grants = [];
      token.roles = [];
      token.appId = FALLBACK_APP_ID;
    }
  }

  // Allow client to force a RBAC refresh via update({ rbacRefresh: true })
  if (trigger === "update" && session?.rbacRefresh && token?.id) {
    try {
      const appId = await resolveRbacAppId(
        token.appId || FALLBACK_APP_ID,
        session.appId
      );
      const [grants, roles] = await Promise.all([
        getUserGrants(token.id, appId),
        getUserRoles(token.id, appId),
      ]);
      token.grants = grants;
      token.roles = roles;
      token.appId = appId;
    } catch (error) {
      console.error("JWT update: failed to refresh RBAC data", error);
    }
  }
  return token;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const session = async ({ session, token }: any) => {
  if (token && session.user) {
    session.user.id = token.id;
    session.user.email = token.email;
    session.user.name = token.name;

    // Expose RBAC data to client session
    session.user.grants = token.grants || [];
    session.user.roles = token.roles || [];
    session.user.appId = token.appId || FALLBACK_APP_ID;
  }
  return session;
};
