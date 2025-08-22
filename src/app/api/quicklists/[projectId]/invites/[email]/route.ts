import { protectRoute } from "@/42go/policy";
import { getDB } from "@/42go/db";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { getAppID } from "@/42go/config/app-config";

export const DELETE = protectRoute(
  async (req, { params }) => {
    void req.url;
    const { projectId, email } = await params;
    const decodedEmail = decodeURIComponent(email || "").toLowerCase();
    if (!projectId || !decodedEmail) {
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
    const appId = await getAppID();
    if (!appId) {
      return Response.json(
        { error: "app_not_found", message: "Unable to determine app context" },
        { status: 404 }
      );
    }
    try {
      await db.transaction(async (trx) => {
        const projRow = (
          await trx.raw(
            `SELECT p.id
             FROM quicklist.projects p
            WHERE p.id = ? AND p.app_id = ? AND p.owned_by = ?`,
            [projectId, appId, userId]
          )
        ).rows as Array<{ id: string }>;
        if (projRow.length === 0) {
          // only owner can revoke; return 204 to avoid leaking existence
          return;
        }

        await trx("quicklist.invites")
          .where({ project_id: projectId })
          .andWhereRaw("lower(email) = ?", [decodedEmail])
          .del();

        await trx("quicklist.projects")
          .where({ id: projectId })
          .update({ updated_at: new Date(), updated_by: userId });
      });
      return new Response(null, { status: 204 });
    } catch (err) {
      console.error("DELETE invites failed", err);
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
