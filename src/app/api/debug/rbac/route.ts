import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { getUserRoles, getUserGrants } from "@/42go/policy/access";
import { getAppID } from "@/42go/config/app-config";

export const GET = async () => {
  const session = await getServerSession(await getAuthOptions());
  if (!session?.user?.id) {
    return Response.json({ error: "No session" }, { status: 401 });
  }
  const userId = session.user.id;
  const appId = await getAppID();
  if (!appId) {
    return Response.json(
      { error: "Unable to determine app context" },
      { status: 404 }
    );
  }
  const [roles, grants] = await Promise.all([
    getUserRoles(userId, appId),
    getUserGrants(userId, appId),
  ]);
  return Response.json({
    userId,
    appId,
    roles,
    grants,
    timestamp: new Date().toISOString(),
  });
};
