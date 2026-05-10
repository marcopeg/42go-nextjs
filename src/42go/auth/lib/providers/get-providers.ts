import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import { getDB } from "@/42go/db";
import { APP_ID_HEADER } from "@/42go/lib/app-id";
import type { AbstractHeaders } from "@/42go/config/abstract-headers";
import { getAppInfo } from "@/42go/config/app-config";
import { apps, type TAppID } from "@/AppConfig";
import {
  matchAppByHeaders,
  matchAppByUrl,
  matchByEnvironment,
} from "@/42go/lib/app-id/matchers";

type AuthRequestHeaders = Record<string, unknown> | undefined;

const getHeaderValue = (headers: AuthRequestHeaders, name: string) => {
  if (!headers) return null;
  const lowerName = name.toLowerCase();
  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === lowerName
  );
  if (!entry) return null;

  const value = entry[1];
  if (Array.isArray(value)) return value[0]?.toString() ?? null;
  if (value === undefined || value === null) return null;
  return value.toString();
};

const fromAuthRequestHeaders = (
  headers: AuthRequestHeaders
): AbstractHeaders => ({
  get: (name: string) => getHeaderValue(headers, name),
  has: (name: string) => getHeaderValue(headers, name) !== null,
  host: getHeaderValue(headers, "host") || undefined,
  url: undefined,
});

const resolveAppIdFromAuthHeaders = (
  headers: AuthRequestHeaders
): TAppID => {
  const explicitAppId = getHeaderValue(headers, APP_ID_HEADER);
  if (explicitAppId && explicitAppId in apps) return explicitAppId as TAppID;

  const envMatch = matchByEnvironment(apps);
  if (envMatch) return envMatch;

  const abstractHeaders = fromAuthRequestHeaders(headers);
  return (
    matchAppByHeaders(abstractHeaders, apps) ||
    matchAppByUrl(abstractHeaders, apps)
  );
};

export const getProviders = async () => {
  const { id: appID, config } = await getAppInfo();

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
            authorize: async (credentials, req) => {
              const appId = resolveAppIdFromAuthHeaders(req.headers) || appID;
              if (!appId) {
                return null;
              }

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
                  .where("app_id", appId)
                  .andWhere(function () {
                    this.where(
                      "username",
                      "ilike",
                      credentials.username
                    ).orWhere("email", "ilike", credentials.username);
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
                  appId,
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
