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
  createdAt: Date;
  updatedAt: Date;
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
      createdAt: "created_at",
      updatedAt: "updated_at",
    })
    .where("app_id", appId)
    .orderByRaw("lower(coalesce(nullif(username, ''), email)) asc")
    .orderByRaw("lower(email) asc")) as UserRow[];

  return Response.json({
    appId,
    users,
  });
};

export const GET = protectRoute(listUsers, {
  require: {
    feature: "api:users",
    session: true,
    role: "backoffice",
    grants: ["users:list"],
  },
});
