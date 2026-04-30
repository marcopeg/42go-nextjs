import { protectRoute } from "@/42go/policy";
import { getDB } from "@/42go/db";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { getAppID } from "@/42go/config/app-config";

export const POST = protectRoute(
  async (req, { params }) => {
    void req.url;
    const { projectId } = await params;
    if (!projectId) {
      return Response.json(
        { error: "bad_request", message: "invalid projectId" },
        { status: 400 }
      );
    }

    const session = await getServerSession(await getAuthOptions());
    const userId = session?.user?.id as string | undefined;
    const userEmail = (
      session?.user?.email as string | undefined
    )?.toLowerCase();
    if (!userId || !userEmail) {
      return Response.json(
        { error: "session", message: "login required" },
        { status: 401 }
      );
    }

    const db = getDB();
    const appId = await getAppID();
    if (!appId) {
      return Response.json(
        { error: "app_not_found", message: "Unable to determine app context" },
        { status: 404 }
      );
    }
    try {
      return await db.transaction(async (trx) => {
        // Ensure invite exists for this project/email in current app
        const inv = await trx("quicklist.invites as i")
          .join("quicklist.projects as p", "p.id", "i.project_id")
          .select("i.project_id")
          .where("i.project_id", projectId)
          .andWhereRaw("lower(i.email) = ?", [userEmail])
          .andWhere("p.app_id", appId)
          .first();

        if (!inv) {
          return Response.json(
            { error: "not_found", message: "invite not found" },
            { status: 404 }
          );
        }

        // Upsert collab
        const exists = await trx("quicklist.collabs")
          .where({ project_id: projectId, user_id: userId })
          .first();
        if (!exists) {
          await trx("quicklist.collabs").insert({
            project_id: projectId,
            user_id: userId,
            role: "editor",
          });
        }

        // Delete invite (cleanup always)
        await trx("quicklist.invites")
          .where({ project_id: projectId })
          .andWhereRaw("lower(email) = ?", [userEmail])
          .del();

        // Touch project updated_at
        await trx("quicklist.projects")
          .where({ id: projectId })
          .update({ updated_at: new Date(), updated_by: userId });

        return Response.json({ ok: true });
      });
    } catch (err) {
      console.error("POST collabs (accept invite) failed", err);
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
