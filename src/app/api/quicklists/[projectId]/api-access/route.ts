import { getServerSession } from "next-auth";
import { z } from "zod";

import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { getAppID } from "@/42go/config/app-config";
import { getDB } from "@/42go/db";
import { protectRoute } from "@/42go/policy";
import { quicklistApiError, quicklistApiJson } from "@/lib/quicklists/server/api-response";

const bodySchema = z.object({ enabled: z.boolean() });

const updateListApiAccess = async (
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) => {
  const { projectId } = await params;
  const [session, appId] = await Promise.all([
    getServerSession(await getAuthOptions()),
    getAppID(),
  ]);
  const userId = session?.user?.id as string | undefined;
  if (!userId || !appId) {
    return quicklistApiError(401, "session", "Login required");
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return quicklistApiError(400, "validation", "Enabled must be a boolean.");
  }

  const updated = await getDB()("quicklist.projects")
    .where({ id: projectId, app_id: appId, owned_by: userId })
    .update({
      api_enabled: parsed.data.enabled,
      updated_at: new Date(),
      updated_by: userId,
    })
    .returning(["id", "api_enabled", "updated_at"]);

  if (updated.length === 0) {
    return quicklistApiError(404, "not_found", "Not Found");
  }

  return quicklistApiJson({
    list: {
      id: updated[0].id,
      apiEnabled: updated[0].api_enabled,
      updatedAt: new Date(updated[0].updated_at).toISOString(),
    },
  });
};

export const PATCH = protectRoute(updateListApiAccess, {
  require: { feature: "api:quicklists", session: true },
});
