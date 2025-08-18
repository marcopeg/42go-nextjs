import { protectRoute } from "@/42go/policy";
import { getDB } from "@/42go/db";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { z } from "zod";
import { getAppID } from "@/42go/config/app-config";

const bodySchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    position: z.number().int().min(1).optional(),
    completed: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Body must include at least one of: title, position, completed",
  });

type TaskRow = {
  id: string;
  project_id: string;
  title: string;
  position: number;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  completed_at: Date | null;
  completed_by: string | null;
};

const toISO = (d: Date | string | null | undefined): string | null =>
  d ? (d instanceof Date ? d : new Date(d)).toISOString() : null;

const handler = async (
  req: Request,
  { params }: { params: Promise<{ projectId: string; taskId: string }> }
) => {
  void req.url;

  const { projectId, taskId } = await params;

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

  const { title, position, completed } = parsed.data as {
    title?: string;
    position?: number;
    completed?: boolean;
  };

  const db = getDB();
  const appId = (await getAppID()) || "default";
  try {
    return await db.transaction(async (trx) => {
      const currentRes = await trx.raw(
        `
        SELECT t.*
          FROM quicklist.tasks t
          JOIN quicklist.projects p ON p.id = t.project_id
      WHERE t.id = ?
        AND t.project_id = ?
        AND p.app_id = ?
           AND (p.owned_by = ? OR EXISTS (
                 SELECT 1 FROM quicklist.collabs c
                  WHERE c.project_id = p.id AND c.user_id = ?
               ))
      `,
        [taskId, projectId, appId, userId, userId]
      );
      const current = currentRes.rows as TaskRow[];
      if (current.length === 0) {
        return Response.json(
          { error: "not_found", message: "Not Found" },
          { status: 404 }
        );
      }
      const task = current[0];

      type Updates = Partial<
        Pick<TaskRow, "title" | "completed_at" | "completed_by" | "updated_at">
      >;
      const updates: Updates = {};
      let positionChanged = false;

      if (typeof title === "string" && title !== task.title)
        updates.title = title;
      if (typeof completed === "boolean") {
        if (completed && !task.completed_at) {
          updates.completed_at = new Date();
          updates.completed_by = userId ?? null;
        } else if (!completed && task.completed_at) {
          updates.completed_at = null;
          updates.completed_by = null;
        }
      }
      if (typeof position === "number" && position !== task.position)
        positionChanged = true;

      updates.updated_at = new Date();

      if (Object.keys(updates).length > 0) {
        await trx("quicklist.tasks")
          .where({ id: taskId, project_id: projectId })
          .update(updates);
      }

      if (positionChanged) {
        const list = (await trx("quicklist.tasks")
          .where({ project_id: projectId })
          .orderBy(["position", "created_at"])) as TaskRow[];
        const filtered = list.filter((t) => t.id !== taskId);
        const newPos = Math.max(1, position!);
        filtered.splice(newPos - 1, 0, {
          ...task,
          ...updates,
          position: newPos,
        });
        for (let i = 0; i < filtered.length; i++) {
          const t = filtered[i];
          await trx("quicklist.tasks")
            .where({ id: t.id })
            .update({ position: i + 1 });
        }
      }

      await trx("quicklist.projects")
        .where({ id: projectId })
        .update({ updated_at: new Date() });

      const finalTask = (
        await trx.raw(
          `SELECT id, title, position, updated_at, completed_at FROM quicklist.tasks WHERE id = ? AND project_id = ?`,
          [taskId, projectId]
        )
      ).rows[0] as Pick<
        TaskRow,
        "id" | "title" | "position" | "updated_at" | "completed_at"
      >;

      return Response.json({
        ok: true,
        task: {
          id: finalTask.id,
          title: finalTask.title,
          position: finalTask.position,
          updated_at: toISO(finalTask.updated_at),
          completed_at: toISO(finalTask.completed_at),
        },
      });
    });
  } catch (err) {
    console.error("PATCH quicklist task failed", err);
    return Response.json(
      { error: "server_error", message: (err as Error)?.message || "Unknown" },
      { status: 500 }
    );
  }
};

export const PATCH = protectRoute(handler, {
  require: { feature: "api:quicklists", session: true },
});

const deleteHandler = async (
  req: Request,
  { params }: { params: Promise<{ projectId: string; taskId: string }> }
) => {
  void req.url;

  const { projectId, taskId } = await params;

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
    return await db.transaction(async (trx) => {
      // Load task and verify access
      const currentRes = await trx.raw(
        `
        SELECT t.*
          FROM quicklist.tasks t
          JOIN quicklist.projects p ON p.id = t.project_id
      WHERE t.id = ?
        AND t.project_id = ?
        AND p.app_id = ?
           AND (p.owned_by = ? OR EXISTS (
                 SELECT 1 FROM quicklist.collabs c
                  WHERE c.project_id = p.id AND c.user_id = ?
               ))
      `,
        [taskId, projectId, appId, userId, userId]
      );
      const rows = currentRes.rows as TaskRow[];
      if (rows.length === 0) {
        return Response.json(
          { error: "not_found", message: "Not Found" },
          { status: 404 }
        );
      }
      const task = rows[0];

      // Delete task
      await trx("quicklist.tasks")
        .where({ id: taskId, project_id: projectId })
        .del();

      // Compact positions: shift down items after removed position
      await trx("quicklist.tasks")
        .where({ project_id: projectId })
        .andWhere("position", ">", task.position)
        .decrement("position", 1);

      // Update project freshness
      await trx("quicklist.projects")
        .where({ id: projectId })
        .update({ updated_at: new Date(), updated_by: userId });

      return Response.json({ ok: true, id: taskId });
    });
  } catch (err) {
    console.error("DELETE quicklist task failed", err);
    return Response.json(
      { error: "server_error", message: (err as Error)?.message || "Unknown" },
      { status: 500 }
    );
  }
};

export const DELETE = protectRoute(deleteHandler, {
  require: { feature: "api:quicklists", session: true },
});
