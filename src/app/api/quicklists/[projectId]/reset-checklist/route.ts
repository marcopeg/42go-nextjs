import { getDB } from "@/42go/db";
import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { getAppID } from "@/42go/config/app-config";
import { protectRoute } from "@/42go/policy";
import { resolveQuicklistMode } from "@/lib/quicklists/mode";
import { getServerSession } from "next-auth";

const isUUID = (value: string): boolean =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    value
  );

const toISO = (value: Date | string | null | undefined): string | null =>
  value ? (value instanceof Date ? value : new Date(value)).toISOString() : null;

const handler = async (
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) => {
  void req.url;
  const { projectId } = await params;
  if (!projectId || !isUUID(projectId)) {
    return Response.json(
      { error: "bad_request", message: "invalid projectId" },
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
    return await db.transaction(async (trx) => {
      const access = (
        await trx.raw(
          `SELECT p.settings
             FROM quicklist.projects p
            WHERE p.id = ? AND p.app_id = ?
              AND (p.owned_by = ? OR EXISTS (
                    SELECT 1 FROM quicklist.collabs c
                     WHERE c.project_id = p.id AND c.user_id = ?
                  ))`,
          [projectId, appId, userId, userId]
        )
      ).rows as Array<{ settings: unknown }>;
      if (access.length === 0) {
        return Response.json(
          { error: "not_found", message: "Not Found" },
          { status: 404 }
        );
      }
      if (resolveQuicklistMode(access[0].settings) !== "checklist") {
        return Response.json(
          {
            error: "invalid_mode",
            message: "Checklist reset is only available for checklist lists",
          },
          { status: 409 }
        );
      }

      const resetRows = (
        await trx("quicklist.tasks")
          .where({ project_id: projectId })
          .whereNotNull("completed_at")
          .update({
            completed_at: null,
            completed_by: null,
            updated_at: new Date(),
          })
          .returning(["id"])
      ) as Array<{ id: string }>;

      if (resetRows.length > 0) {
        await trx("quicklist.projects")
          .where({ id: projectId, app_id: appId })
          .update({ updated_at: new Date(), updated_by: userId });
      }

      const tasks = (
        await trx("quicklist.tasks")
          .select("id", "title", "position", "updated_at", "completed_at")
          .where({ project_id: projectId })
          .orderBy([{ column: "position", order: "asc" }, { column: "created_at", order: "asc" }])
      ) as Array<{
        id: string;
        title: string;
        position: number;
        updated_at: Date;
        completed_at: Date | null;
      }>;

      return Response.json({
        ok: true,
        reset: resetRows.length,
        tasks: tasks.map((task) => ({
          id: task.id,
          title: task.title,
          position: task.position,
          updated_at: toISO(task.updated_at),
          completed_at: toISO(task.completed_at),
        })),
      });
    });
  } catch (error) {
    console.error("POST quicklists reset-checklist failed", error);
    return Response.json(
      {
        error: "server_error",
        message: (error as Error)?.message || "Unknown",
      },
      { status: 500 }
    );
  }
};

export const POST = protectRoute(handler, {
  require: { feature: "api:quicklists", session: true },
});
