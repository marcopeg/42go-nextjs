import { z } from "zod";

import { protectRoute } from "@/42go/policy";
import { loadQuicklistApiProject } from "@/lib/quicklists/server/api-access";
import {
  isQuicklistApiContext,
  loadQuicklistApiContext,
} from "@/lib/quicklists/server/api-context";
import { quicklistApiError, quicklistApiJson } from "@/lib/quicklists/server/api-response";
import { serializeQuicklistApiItem } from "@/lib/quicklists/server/api-serialization";

const paramsSchema = z.object({ projectId: z.string().uuid() });
const bodySchema = z.object({ itemIds: z.array(z.string().uuid()).min(1) });

const reorderItems = async (
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) => {
  const parsedParams = paramsSchema.safeParse(await params);
  const parsedBody = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsedParams.success || !parsedBody.success) {
    return quicklistApiError(
      400,
      "validation",
      parsedBody.success ? "Invalid list ID." : parsedBody.error.message
    );
  }

  const context = await loadQuicklistApiContext(req);
  if (!isQuicklistApiContext(context)) return context;
  const project = await loadQuicklistApiProject(
    context.db,
    context.principal,
    parsedParams.data.projectId
  );
  if (!project) return quicklistApiError(404, "not_found", "Not Found");

  const existing = await context.db("quicklist.tasks")
    .select("id")
    .where({ project_id: project.id });
  const existingIds = new Set(existing.map((item) => String(item.id)));
  const requestedIds = parsedBody.data.itemIds;
  if (
    requestedIds.length !== existingIds.size ||
    new Set(requestedIds).size !== requestedIds.length ||
    requestedIds.some((id) => !existingIds.has(id))
  ) {
    return quicklistApiError(
      400,
      "validation",
      "itemIds must contain every item in this list exactly once."
    );
  }

  await context.db.transaction(async (trx) => {
    await trx.raw(
      `
      WITH new_pos AS (
        SELECT id, ordinality AS new_order
          FROM unnest(?::uuid[]) WITH ORDINALITY AS item(id, ordinality)
      )
      UPDATE quicklist.tasks task
         SET position = new_pos.new_order,
             updated_at = NOW()
        FROM new_pos
       WHERE task.id = new_pos.id
         AND task.project_id = ?
         AND task.position IS DISTINCT FROM new_pos.new_order
      `,
      [requestedIds, project.id]
    );
    await trx("quicklist.projects")
      .where({ id: project.id })
      .update({ updated_at: new Date(), updated_by: context.principal.userId });
  });

  const items = await context.db("quicklist.tasks")
    .select(
      "id",
      "title",
      "position",
      "created_at",
      "updated_at",
      "completed_at"
    )
    .where({ project_id: project.id })
    .orderBy("position", "asc");

  return quicklistApiJson({ items: items.map(serializeQuicklistApiItem) });
};

export const POST = protectRoute(reorderItems, {
  require: { feature: "api:quicklists" },
});
