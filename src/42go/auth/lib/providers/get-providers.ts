import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import { getDB } from "@/42go/db";
import { getAppID, getAppConfig } from "@/42go/config/app-config";

export const getProviders = async () => {
  const appID = await getAppID();
  const config = await getAppConfig();

  return (config?.auth?.providers || [])
    .map((provider) => {
      //   console.log(provider.type);

      switch (provider.type) {
        case "credentials":
          return CredentialsProvider({
            name: "Credentials",
            credentials: {
              username: { label: "Username", type: "text" },
              password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
              if (
                !credentials ||
                !credentials.username ||
                !credentials.password
              ) {
                return null;
              }

              try {
                const db = getDB();
                const user = await db("auth.users")
                  .where("app_id", appID)
                  .andWhere(function () {
                    this.where("name", "ilike", credentials.username).orWhere(
                      "email",
                      "ilike",
                      credentials.username
                    );
                  })
                  .first();

                if (!user) {
                  return null;
                }

                const isValidPassword = await bcrypt.compare(
                  credentials.password,
                  user.password
                );

                if (!isValidPassword) {
                  return null;
                }

                return {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                };
              } catch (error) {
                console.error("Authentication error:", error);
                return null;
              }
            },
          });
        case "github":
          return GitHubProvider({
            clientId: provider.config.clientId!,
            clientSecret: provider.config.clientSecret!,
            authorization: {
              params: {
                scope: "read:user user:email",
              },
            },
            profile(profile) {
              return {
                id: profile.id.toString(),
                name: profile.name || profile.login,
                email: profile.email || "",
                image: profile.avatar_url,
              };
            },
          });
        case "google":
          return GoogleProvider({
            clientId: provider.config.clientId!,
            clientSecret: provider.config.clientSecret!,
            authorization: {
              params: {
                scope: "openid profile email",
                prompt: "select_account",
              },
            },
            profile(profile) {
              return {
                id: profile.sub,
                name: profile.name,
                email: profile.email,
                image: profile.picture,
              };
            },
          });
        default:
          return null;
      }
    })
    .filter((provider) => provider !== null);
};
