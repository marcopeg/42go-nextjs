import { getServerSession } from "next-auth";

import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { getAppInfo } from "@/42go/config/app-config";
import { buildConsentPatch } from "@/42go/profile/consent";
import { getProfileSaveHooks } from "@/42go/profile/app-hooks";
import {
  loadProfile,
  saveProfile,
  setProfileKeys,
} from "@/42go/profile/server";
import type {
  JsonObject,
  TConsentConfig,
  TProfileContextConfig,
  TProfileData,
} from "@/42go/profile";
import { isPlainJsonObject } from "@/42go/profile/validation";
import { protectRoute } from "@/42go/policy";

type ProfileRequestBody = {
  profile?: unknown;
  values?: unknown;
  consent?: unknown;
  account?: unknown;
  source?: unknown;
  method?: unknown;
};

const json = (data: unknown, init?: ResponseInit) =>
  Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...init?.headers,
    },
  });

const getSessionUserId = async () => {
  const session = await getServerSession(await getAuthOptions());
  return session?.user?.id || null;
};

const getProfileContext = async () => {
  const { id, config } = await getAppInfo();
  const appId = id || "default";
  const profileConfig: TProfileContextConfig = {
    ...(config?.app?.profile || {}),
    consent: config?.app?.consent,
  };

  return {
    appId,
    profileConfig,
    consentConfig: config?.app?.consent,
  };
};

const normalizeBooleanMap = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, itemValue]) => typeof itemValue === "boolean")
      .map(([key, itemValue]) => [key, itemValue as boolean])
  );
};

const normalizeAccount = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;

  return {
    ...(typeof source.name === "string" || source.name === null
      ? { name: source.name }
      : {}),
    ...(typeof source.image === "string" || source.image === null
      ? { image: source.image }
      : {}),
  };
};

const resolveEvidence = (req: Request, body: ProfileRequestBody) => ({
  source: typeof body.source === "string" ? body.source : "profile",
  method: typeof body.method === "string" ? body.method : "profile-save",
  ip:
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined,
  ua: req.headers.get("user-agent") || undefined,
});

const buildNextConsent = async ({
  userId,
  config,
  consentConfig,
  values,
  req,
  body,
}: {
  userId: string;
  config: TProfileContextConfig;
  consentConfig?: TConsentConfig | null;
  values: Record<string, boolean>;
  req: Request;
  body: ProfileRequestBody;
}) => {
  const current = await loadProfile({
    userId,
    appId: "",
    config,
  });

  return buildConsentPatch({
    current: current.consent,
    values,
    config: consentConfig,
    evidence: resolveEvidence(req, body),
  });
};

const getProfile = async () => {
  const userId = await getSessionUserId();
  if (!userId) return json({ error: "session", message: "login required" }, { status: 401 });

  const { appId, profileConfig } = await getProfileContext();

  return json(await loadProfile({ userId, appId, config: profileConfig }));
};

const postProfile = async (req: Request) => {
  const userId = await getSessionUserId();
  if (!userId) return json({ error: "session", message: "login required" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as ProfileRequestBody | null;
  if (!body || !isPlainJsonObject(body.profile)) {
    return json(
      {
        error: "validation",
        message: "Profile must be a JSON object.",
      },
      { status: 400 }
    );
  }

  const { appId, profileConfig, consentConfig } = await getProfileContext();
  const consentValues = normalizeBooleanMap(body.consent);
  const consent =
    Object.keys(consentValues).length > 0
      ? await buildNextConsent({
          userId,
          config: profileConfig,
          consentConfig,
          values: consentValues,
          req,
          body,
        })
      : undefined;

  try {
    return json(
      await saveProfile({
        userId,
        appId,
        profile: body.profile as TProfileData,
        consent,
        account: normalizeAccount(body.account),
        config: profileConfig,
        hooks: await getProfileSaveHooks(appId),
      })
    );
  } catch (error) {
    return json(
      {
        error: "validation",
        message: error instanceof Error ? error.message : "Invalid profile.",
      },
      { status: 400 }
    );
  }
};

const patchProfile = async (req: Request) => {
  const userId = await getSessionUserId();
  if (!userId) return json({ error: "session", message: "login required" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as ProfileRequestBody | null;
  const values = body?.values;
  if (!isPlainJsonObject(values)) {
    return json(
      {
        error: "validation",
        message: "Profile values must be a JSON object.",
      },
      { status: 400 }
    );
  }

  const { appId, profileConfig } = await getProfileContext();

  try {
    return json(
      await setProfileKeys({
        userId,
        appId,
        values: values as JsonObject,
        config: profileConfig,
        hooks: await getProfileSaveHooks(appId),
      })
    );
  } catch (error) {
    return json(
      {
        error: "validation",
        message: error instanceof Error ? error.message : "Invalid profile.",
      },
      { status: 400 }
    );
  }
};

export const GET = protectRoute(getProfile, {
  require: { feature: "api:profile", session: true },
});

export const POST = protectRoute(postProfile, {
  require: { feature: "api:profile", session: true },
});

export const PATCH = protectRoute(patchProfile, {
  require: { feature: "api:profile", session: true },
});
