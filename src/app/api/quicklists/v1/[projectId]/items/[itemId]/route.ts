import { z } from "zod";

import { protectRoute } from "@/42go/policy";
import { loadQuicklistApiProject } from "@/lib/quicklists/server/api-access";
import {
  isQuicklistApiContext,
  loadQuicklistApiContext,
} from "@/lib/quicklists/server/api-context";
import { quicklistApiError, quicklistApiJson } from "@/lib/quicklists/server/api-response";
import { serializeQuicklistApiItem } from "@/lib/quicklists/server/api-serialization";
import { quicklistItemTextSchema } from "@/lib/quicklists/validation";

const paramsSchema = z.object({
  projectId: z.string().uuid(),
  itemId: z.string().uuid(),
});
const updateSchema = z
  .object({
    title: quicklistItemTextSchema.optional(),
    completed: z.boolean().optional(),
  })
  .refine((value) => value.title !== undefined || value.completed !== undefined, {
    message: "Include title or completed.",
  });

const updateItem = async (
  req: Request,
  { params }: { params: Promise<{ projectId: string; itemId: string }> }
) => {
  const parsedParams = paramsSchema.safeParse(await params);
  const parsedBody = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsedParams.success || !parsedBody.success) {
    return quicklistApiError(
      400,
      "validation",
      parsedBody.success ? "Invalid list or item ID." : parsedBody.error.message
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

  const current = await context.db("quicklist.tasks")
    .where({ id: parsedParams.data.itemId, project_id: project.id })
    .first();
  if (!current) return quicklistApiError(404, "not_found", "Not Found");

  const updates: Record<string, unknown> = { updated_at: new Date() };
  if (parsedBody.data.title !== undefined) updates.title = parsedBody.data.title;
  if (parsedBody.data.completed !== undefined) {
    updates.completed_at = parsedBody.data.completed ? new Date() : null;
    updates.completed_by = parsedBody.data.completed
      ? context.principal.userId
      : null;
  }

  const [updated] = await context.db("quicklist.tasks")
    .where({ id: current.id, project_id: project.id })
    .update(updates)
    .returning([
      "id",
      "title",
      "position",
      "created_at",
      "updated_at",
      "completed_at",
    ]);

  await context.db("quicklist.projects")
    .where({ id: project.id })
    .update({ updated_at: new Date(), updated_by: context.principal.userId });

  return quicklistApiJson({ item: serializeQuicklistApiItem(updated) });
};

const deleteItem = async (
  req: Request,
  { params }: { params: Promise<{ projectId: string; itemId: string }> }
) => {
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return quicklistApiError(400, "validation", "Invalid list or item ID.");
  }

  const context = await loadQuicklistApiContext(req);
  if (!isQuicklistApiContext(context)) return context;
  const project = await loadQuicklistApiProject(
    context.db,
    context.principal,
    parsedParams.data.projectId
  );
  if (!project) return quicklistApiError(404, "not_found", "Not Found");

  const result = await context.db.transaction(async (trx) => {
    const item = await trx("quicklist.tasks")
      .select("id", "position")
      .where({ id: parsedParams.data.itemId, project_id: project.id })
      .first();
    if (!item) return false;

    await trx("quicklist.tasks")
      .where({ id: item.id, project_id: project.id })
      .del();
    await trx("quicklist.tasks")
      .where({ project_id: project.id })
      .andWhere("position", ">", item.position)
      .decrement("position", 1);
    await trx("quicklist.projects")
      .where({ id: project.id })
      .update({ updated_at: new Date(), updated_by: context.principal.userId });
    return true;
  });

  if (!result) return quicklistApiError(404, "not_found", "Not Found");
  return new Response(null, { status: 204 });
};

const policy = { require: { feature: "api:quicklists" } } as const;

export const PATCH = protectRoute(updateItem, policy);
export const DELETE = protectRoute(deleteItem, policy);
