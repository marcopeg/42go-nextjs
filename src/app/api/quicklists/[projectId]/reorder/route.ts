import { protectRoute } from "@/42go/policy";
import { getDB } from "@/42go/db";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { z } from "zod";
import { getAppID } from "@/42go/config/app-config";

const bodySchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1),
});

const handler = async (
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) => {
  void req.url;
  if (req.method !== "POST") {
    return new Response(null, { status: 405 });
  }

  const { projectId } = await params;

  const session = await getServerSession(await getAuthOptions());
  const userId = session?.user?.id as string | undefined;
  if (!userId) {
    return Response.json(
      { error: "session", message: "login required" },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "bad_request", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "bad_request", message: parsed.error.message },
      { status: 400 }
    );
  }

  const { taskIds } = parsed.data as { taskIds: string[] };

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
      // Verify project access and that tasks exist and belong to the project
      const projectRes = await trx.raw(
        `SELECT id, owned_by FROM quicklist.projects WHERE id = ? AND app_id = ?`,
        [projectId, appId]
      );
      if (!projectRes.rows || projectRes.rows.length === 0) {
        throw new Error("project_not_found");
      }

      // project exists (we already checked presence above)
      const hasAccessRes = await trx.raw(
        `SELECT 1 FROM quicklist.projects p WHERE p.id = ? AND p.app_id = ? AND (p.owned_by = ? OR EXISTS (SELECT 1 FROM quicklist.collabs c WHERE c.project_id = p.id AND c.user_id = ?))`,
        [projectId, appId, userId, userId]
      );
      if (!hasAccessRes.rows || hasAccessRes.rows.length === 0) {
        throw new Error("forbidden");
      }

      // Ensure all task ids exist and belong to this project
      const tasksRes = (await trx("quicklist.tasks")
        .select("id")
        .whereIn("id", taskIds)
        .andWhere({ project_id: projectId })) as { id: string }[];
      const foundIds = new Set(tasksRes.map((r) => r.id));
      for (const id of taskIds) {
        if (!foundIds.has(id)) {
          throw new Error("invalid_task_ids");
        }
      }

      // Single UPDATE using unnest with ordinality for efficient bulk position update
      await trx.raw(
        `
        WITH new_pos AS (
          SELECT id, ordinality AS new_order
          FROM unnest(?::uuid[]) WITH ORDINALITY AS u(id, ordinality)
        )
        UPDATE quicklist.tasks t
        SET position = np.new_order,
            updated_at = NOW()
        FROM new_pos np
        WHERE t.id = np.id
          AND t.project_id = ?
          AND t.position IS DISTINCT FROM np.new_order
        `,
        [taskIds, projectId]
      );

      // update project freshness
      await trx("quicklist.projects")
        .where({ id: projectId })
        .update({ updated_at: new Date(), updated_by: userId });
    });

    const final = await db.raw(
      `SELECT id, title, position, updated_at, completed_at FROM quicklist.tasks WHERE project_id = ? ORDER BY position, created_at`,
      [projectId]
    );

    return Response.json({ ok: true, tasks: final.rows });
  } catch (err) {
    console.error("REORDER quicklist failed", err);
    const message = (err as Error)?.message || "Unknown";
    if (message === "forbidden") {
      return Response.json(
        { error: "forbidden", message: "Access denied" },
        { status: 403 }
      );
    }
    if (message === "project_not_found") {
      return Response.json(
        { error: "not_found", message: "Project not found" },
        { status: 404 }
      );
    }
    if (message === "invalid_task_ids") {
      return Response.json(
        {
          error: "bad_request",
          message: "Some task ids are invalid or do not belong to this project",
        },
        { status: 400 }
      );
    }
    return Response.json({ error: "server_error", message }, { status: 500 });
  }
};

export const POST = protectRoute(handler, {
  require: { feature: "api:quicklists", session: true },
});
