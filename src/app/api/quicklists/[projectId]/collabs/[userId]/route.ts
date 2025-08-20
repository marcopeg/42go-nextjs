import { protectRoute } from "@/42go/policy";
import { getDB } from "@/42go/db";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { getAppID } from "@/42go/config/app-config";

export const DELETE = protectRoute(
  async (req, { params }) => {
    void req.url;
    const { projectId, userId: targetUserId } = await params;
    if (!projectId || !targetUserId) {
      return Response.json(
        { error: "bad_request", message: "invalid params" },
        { status: 400 }
      );
    }

    const session = await getServerSession(await getAuthOptions());
    const userId = session?.user?.id as string | undefined;
    if (!userId) {
      return Response.json(
        { error: "session", message: "login required" },
        { status: 401 }
      );
    }

    const db = getDB();
    const appId = (await getAppID()) || "default";
    try {
      await db.transaction(async (trx) => {
        // Load project and owner
        const proj = (await trx("quicklist.projects")
          .select("id", "owned_by")
          .where({ id: projectId, app_id: appId })
          .first()) as { id: string; owned_by: string } | undefined;
        if (!proj) {
          return;
        }

        const isOwner = proj.owned_by === userId;
        const removingSelf = targetUserId === userId;
        if (!isOwner && !removingSelf) {
          // Not allowed to remove others
          return;
        }

        // Never remove the owner record if it existed (we don't create collab for owner)
        await trx("quicklist.collabs")
          .where({ project_id: projectId, user_id: targetUserId })
          .del();

        await trx("quicklist.projects")
          .where({ id: projectId })
          .update({ updated_at: new Date(), updated_by: userId });
      });
      return new Response(null, { status: 204 });
    } catch (err) {
      console.error("DELETE collab failed", err);
      return Response.json(
        {
          error: "server_error",
          message: (err as Error)?.message || "Unknown",
        },
        { status: 500 }
      );
    }
  },
  {
    require: { feature: "api:quicklists", session: true },
  }
);
