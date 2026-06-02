import { getAppID } from "@/42go/config/app-config";
import { getDB } from "@/42go/db";
import { protectRoute } from "@/42go/policy";

type UserRow = {
  id: string;
  appId: string;
  username: string | null;
  name: string | null;
  email: string;
  image: string | null;
  emailVerified: Date | null;
  profile: unknown;
  featureFlags: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type UserAction =
  | "reset-profile"
  | "reset-consent"
  | "enable-translation"
  | "update-user";

type UpdateUserFields = {
  username?: unknown;
  name?: unknown;
  email?: unknown;
  image?: unknown;
  emailVerified?: unknown;
  profile?: unknown;
  featureFlags?: unknown;
};

const isPlainJsonObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeNullableString = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  return value;
};

const normalizeNullableObject = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (!isPlainJsonObject(value)) return undefined;
  return value;
};

const normalizeNullableDate = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
};

const listUsers = async () => {
  const appId = await getAppID();

  if (!appId) {
    return Response.json(
      { error: "app_not_found", message: "Unable to resolve app context" },
      { status: 404 }
    );
  }

  const db = getDB();
  const users = (await db("auth.users")
    .select({
      id: "id",
      appId: "app_id",
      username: "username",
      name: "name",
      email: "email",
      image: "image",
      emailVerified: "email_verified",
      profile: "profile",
      featureFlags: "feature_flags",
      createdAt: "created_at",
      updatedAt: "updated_at",
    })
    .where("app_id", appId)
    .orderBy("created_at", "desc")
    .orderByRaw("lower(coalesce(nullif(username, ''), email)) asc")
    .orderByRaw("lower(email) asc")) as UserRow[];

  return Response.json({
    appId,
    users,
  });
};

const updateUser = async (req: Request) => {
  const appId = await getAppID();

  if (!appId) {
    return Response.json(
      { error: "app_not_found", message: "Unable to resolve app context" },
      { status: 404 }
    );
  }

  const body = (await req.json().catch(() => null)) as {
    userId?: unknown;
    action?: unknown;
    fields?: UpdateUserFields;
  } | null;
  const userId = typeof body?.userId === "string" ? body.userId : "";
  const action = typeof body?.action === "string" ? body.action : "";
  const allowedActions: UserAction[] = [
    "reset-profile",
    "reset-consent",
    "enable-translation",
    "update-user",
  ];

  if (!userId || !allowedActions.includes(action as UserAction)) {
    return Response.json(
      { error: "invalid_request", message: "Invalid user action." },
      { status: 400 }
    );
  }

  const db = getDB();
  const user = (await db("auth.users")
    .select("id", "feature_flags")
    .where({ app_id: appId, id: userId })
    .first()) as { id: string; feature_flags: unknown } | undefined;

  if (!user) {
    return Response.json(
      { error: "user_not_found", message: "User not found." },
      { status: 404 }
    );
  }

  if (action === "reset-profile") {
    await db("auth.users")
      .where({ app_id: appId, id: userId })
      .update({ profile: null, updated_at: db.fn.now() });
  }

  if (action === "reset-consent") {
    await db("auth.users")
      .where({ app_id: appId, id: userId })
      .update({ consent: null, updated_at: db.fn.now() });
  }

  if (action === "enable-translation") {
    const currentFlags =
      user.feature_flags &&
      typeof user.feature_flags === "object" &&
      !Array.isArray(user.feature_flags)
        ? (user.feature_flags as Record<string, unknown>)
        : {};

    await db("auth.users")
      .where({ app_id: appId, id: userId })
      .update({
        feature_flags: {
          ...currentFlags,
          translate: true,
        },
        updated_at: db.fn.now(),
      });
  }

  if (action === "update-user") {
    const fields = body?.fields;
    const email = typeof fields?.email === "string" ? fields.email.trim() : "";
    const username = normalizeNullableString(fields?.username);
    const name = normalizeNullableString(fields?.name);
    const image = normalizeNullableString(fields?.image);
    const emailVerified = normalizeNullableDate(fields?.emailVerified);
    const profile = normalizeNullableObject(fields?.profile);
    const featureFlags = normalizeNullableObject(fields?.featureFlags);

    if (
      !fields ||
      !email ||
      username === undefined ||
      name === undefined ||
      image === undefined ||
      emailVerified === undefined ||
      profile === undefined ||
      featureFlags === undefined
    ) {
      return Response.json(
        { error: "invalid_request", message: "Invalid user fields." },
        { status: 400 }
      );
    }

    await db("auth.users").where({ app_id: appId, id: userId }).update({
      username,
      name,
      email,
      image,
      email_verified: emailVerified,
      profile,
      feature_flags: featureFlags,
      updated_at: db.fn.now(),
    });
  }

  return Response.json({ ok: true });
};

export const GET = protectRoute(listUsers, {
  require: {
    feature: "api:users",
    session: true,
    role: "backoffice",
    grants: ["users:list"],
  },
});

export const PATCH = protectRoute(updateUser, {
  require: {
    feature: "api:users",
    session: true,
    role: "backoffice",
    grants: ["users:list"],
  },
});
