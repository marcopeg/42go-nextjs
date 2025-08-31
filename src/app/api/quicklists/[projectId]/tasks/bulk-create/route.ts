import { protectRoute } from "@/42go/policy";
import { getDB } from "@/42go/db";
import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/42go/auth/lib/authOptions";
import { z } from "zod";
import { getAppID } from "@/42go/config/app-config";

const bodySchema = z.object({
  titles: z.array(z.string().min(1).max(255)).min(1),
  afterId: z.string().uuid().nullable().optional(), // null or undefined -> prepend
});

const toISO = (d: Date | string | null | undefined): string | null =>
  d ? (d instanceof Date ? d : new Date(d)).toISOString() : null;

const handler = async (
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) => {
  void req.url;
  const { projectId } = await params;

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
  const { titles, afterId } = parsed.data;

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
      // Verify access & project
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
      ).rows;
      if (access.length === 0) {
        return Response.json(
          { error: "not_found", message: "Not Found" },
          { status: 404 }
        );
      }

      // Determine insert position
      let insertAfterPosition = 0; // 0 means insert at start
      if (afterId) {
        const row = await trx("quicklist.tasks")
          .where({ project_id: projectId, id: afterId })
          .select("position")
          .first();
        if (!row) {
          return Response.json(
            { error: "bad_request", message: "afterId not found in project" },
            { status: 400 }
          );
        }
        insertAfterPosition = row.position as number;
      }

      const countNew = titles.length;

      // Shift tasks after insertAfterPosition in one query
      await trx("quicklist.tasks")
        .where({ project_id: projectId })
        .andWhere("position", ">", insertAfterPosition)
        .increment("position", countNew);

      // Prepare inserts with assigned positions
      const rowsToInsert = titles.map((title, idx) => ({
        project_id: projectId,
        title,
        position: insertAfterPosition + idx + 1,
        created_by: userId,
      }));

      const inserted = await trx("quicklist.tasks")
        .insert(rowsToInsert)
        .returning(["id", "title", "position", "updated_at", "completed_at"]);

      // Update project freshness once
      await trx("quicklist.projects")
        .where({ id: projectId })
        .update({ updated_at: new Date(), updated_by: userId });

      return Response.json({
        ok: true,
        created: inserted.map((r) => ({
          id: r.id as string,
          title: r.title as string,
          position: r.position as number,
          updated_at: toISO(r.updated_at as Date),
          completed_at: toISO(r.completed_at as Date | null),
        })),
        shift: { fromPositionExclusive: insertAfterPosition, delta: countNew },
      });
    });
  } catch (err) {
    console.error("BULK-CREATE quicklist tasks failed", err);
    return Response.json(
      { error: "server_error", message: (err as Error)?.message || "Unknown" },
      { status: 500 }
    );
  }
};

export const POST = protectRoute(handler, {
  require: { feature: "api:quicklists", session: true },
});
