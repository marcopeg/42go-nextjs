import { protectRoute } from "@/42go/policy";
import { getDB } from "@/42go/db";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { getAppID } from "@/42go/config/app-config";

// Simple uuid validator (reuse pattern from other routes)
const isUUID = (v: string): boolean =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    v
  );

const toISO = (d: Date | string | null | undefined): string | null =>
  d ? (d instanceof Date ? d : new Date(d)).toISOString() : null;

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
    return await db.transaction(
      async (trx: import("knex").Knex.Transaction) => {
        // Ensure access (owner or collaborator)
        const access = (
          await trx.raw(
            `SELECT 1 FROM quicklist.projects p
             WHERE p.id = ? AND p.app_id = ?
               AND (p.owned_by = ? OR EXISTS (
                     SELECT 1 FROM quicklist.collabs c
                      WHERE c.project_id = p.id AND c.user_id = ?
                   ))`,
            [projectId, appId, userId, userId]
          )
        ).rows as Array<Record<string, unknown>>;
        if (access.length === 0) {
          return Response.json(
            { error: "not_found", message: "Not Found" },
            { status: 404 }
          );
        }

        // Collect completed tasks
        const completedRows = (
          await trx.raw(
            `SELECT id, position FROM quicklist.tasks WHERE project_id = ? AND completed_at IS NOT NULL ORDER BY position ASC`,
            [projectId]
          )
        ).rows as Array<{ id: string; position: number }>;

        if (completedRows.length === 0) {
          return Response.json({ ok: true, deleted: 0, tasks: [] });
        }

        // Delete all completed tasks
        await trx("quicklist.tasks")
          .where({ project_id: projectId })
          .whereNotNull("completed_at")
          .del();

        // Re-pack positions of remaining tasks (pending only)
        const remaining = (
          await trx.raw(
            `SELECT id, title, position, updated_at, completed_at
             FROM quicklist.tasks
            WHERE project_id = ?
            ORDER BY position ASC, created_at ASC`,
            [projectId]
          )
        ).rows as Array<{
          id: string;
          title: string;
          position: number;
          updated_at: Date;
          completed_at: Date | null;
        }>;

        // Reassign sequential positions (only for those without completed_at by design all remaining)
        for (let i = 0; i < remaining.length; i++) {
          const desired = i + 1;
          const r = remaining[i];
          if (r.position !== desired) {
            await trx("quicklist.tasks")
              .where({ id: r.id })
              .update({ position: desired, updated_at: new Date() });
            r.position = desired;
            r.updated_at = new Date();
          }
        }

        await trx("quicklist.projects")
          .where({ id: projectId })
          .update({ updated_at: new Date(), updated_by: userId });

        return Response.json({
          ok: true,
          deleted: completedRows.length,
          tasks: remaining.map((t) => ({
            id: t.id,
            title: t.title,
            position: t.position,
            updated_at: toISO(t.updated_at),
            completed_at: toISO(t.completed_at),
          })),
        });
      }
    );
  } catch (err) {
    console.error("POST quicklists drop-completed failed", err);
    return Response.json(
      { error: "server_error", message: (err as Error)?.message || "Unknown" },
      { status: 500 }
    );
  }
};

export const POST = protectRoute(handler, {
  require: { feature: "api:quicklists", session: true },
});
