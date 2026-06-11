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
  consent: unknown;
  featureFlags: unknown;
  hasPassword: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type UserLoginMethod =
  | {
      type: "provider";
      provider: string;
    }
  | {
      type: "credentials";
    }
  | {
      type: "magic-link";
    };

type UserProviderRow = {
  userId: string;
  provider: string;
};

type UserActivityRow = {
  userId: string;
  name: string;
  eventAt: Date;
};

type UserResponseRow = Omit<UserRow, "hasPassword"> & {
  hasPassword: boolean;
  loginMethods: UserLoginMethod[];
  lastActivity: {
    name: string;
    eventAt: Date;
  } | null;
};

type UserAction =
  | "reset-profile"
  | "reset-consent"
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
      consent: "consent",
      featureFlags: "feature_flags",
      hasPassword: db.raw("password IS NOT NULL AND password <> ''"),
      createdAt: "created_at",
      updatedAt: "updated_at",
    })
    .where("app_id", appId)
    .orderBy("created_at", "desc")
    .orderByRaw("lower(coalesce(nullif(username, ''), email)) asc")
    .orderByRaw("lower(email) asc")) as UserRow[];

  const userIds = users.map((user) => user.id);
  const providersByUserId = new Map<string, string[]>();
  const latestActivityByUserId = new Map<string, UserActivityRow>();

  if (userIds.length > 0) {
    const providerRows = (await db("auth.accounts")
      .distinct({
        userId: "user_id",
        provider: "provider",
      })
      .where("app_id", appId)
      .whereIn("user_id", userIds)
      .orderBy("provider", "asc")) as UserProviderRow[];

    providerRows.forEach((row) => {
      const providers = providersByUserId.get(row.userId) || [];
      providers.push(row.provider);
      providersByUserId.set(row.userId, providers);
    });

    const latestActivityResult = await db.raw(
      `
        SELECT DISTINCT ON (user_id)
          user_id AS "userId",
          name,
          event_at AS "eventAt"
        FROM events.events
        WHERE app_id = ?
          AND user_id = ANY(?::text[])
        ORDER BY user_id, event_at DESC, created_at DESC, id DESC
      `,
      [appId, userIds]
    );

    (latestActivityResult.rows as UserActivityRow[]).forEach((row) => {
      latestActivityByUserId.set(row.userId, row);
    });
  }

  const usersResponse: UserResponseRow[] = users.map((user) => {
    const providers = providersByUserId.get(user.id) || [];
    const loginMethods: UserLoginMethod[] =
      providers.length > 0
        ? providers.map((provider) => ({ type: "provider", provider }))
        : [{ type: user.hasPassword ? "credentials" : "magic-link" }];
    const lastActivity = latestActivityByUserId.get(user.id) || null;

    return {
      ...user,
      loginMethods,
      lastActivity: lastActivity
        ? {
            name: lastActivity.name,
            eventAt: lastActivity.eventAt,
          }
        : null,
    };
  });

  return Response.json({
    appId,
    users: usersResponse,
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
    .select("id")
    .where({ app_id: appId, id: userId })
    .first()) as { id: string } | undefined;

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
