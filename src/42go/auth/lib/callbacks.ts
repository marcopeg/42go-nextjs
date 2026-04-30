import { v4 as uuidv4 } from "uuid";
import { getDB } from "@/42go/db";
import { getUserGrants, getUserRoles } from "@/42go/policy/access";
import { getAppID } from "@/42go/config/app-config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const signIn = async ({ user, account }: any) => {
  // ProviderID will store the tokens as unique tokens per app/user
  const appID = await getAppID();
  // Use explicit app_id column instead of overloading provider

  if (account?.provider === "github" || account?.provider === "google") {
    try {
      const db = getDB();
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
      } else {
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
      }

      return true;
    } catch (error) {
      console.error(`${account?.provider} OAuth sign-in error:`, error);
      return false;
    }
  }

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
      // TODO: get appId from request context when available
      const appId = "default";
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
      token.appId = "default";
    }
  }

  // Allow client to force a RBAC refresh via update({ rbacRefresh: true })
  if (trigger === "update" && session?.rbacRefresh && token?.id) {
    try {
      const appId = token.appId || "default";
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
    session.user.appId = token.appId || "default";
  }
  return session;
};
