import { getDB } from "@/42go/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const signIn = async ({ user, account }: any) => {
  if (account?.provider === "github" || account?.provider === "google") {
    try {
      const db = getDB();
      const existingUser = await db("auth.users")
        .where("email", user.email!)
        .first();

      if (existingUser) {
        const existingAccount = await db("auth.accounts")
          .where({
            provider: account.provider,
            provider_account_id: account.providerAccountId,
          })
          .first();

        if (!existingAccount) {
          await db("auth.accounts").insert({
            user_id: existingUser.id,
            type: account.type,
            provider: account.provider,
            provider_account_id: account.providerAccountId,
            access_token: account.access_token,
            refresh_token: account.refresh_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            session_state: account.session_state,
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
        const newUserId = `usr_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2)}`;

        await db("auth.users").insert({
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
          provider_account_id: account.providerAccountId,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at: account.expires_at,
          token_type: account.token_type,
          scope: account.scope,
          id_token: account.id_token,
          session_state: account.session_state,
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
export const jwt = async ({ token, user }: any) => {
  if (user) {
    token.id = user.id;
    token.email = user.email;
    token.name = user.name;
  }
  return token;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const session = async ({ session, token }: any) => {
  if (token && session.user) {
    session.user.id = token.id;
    session.user.email = token.email;
    session.user.name = token.name;
  }
  return session;
};
