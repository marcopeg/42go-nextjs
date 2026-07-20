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
const createSchema = z.union([
  z.object({
    title: z.string().trim().min(1).max(255),
    position: z.number().int().min(1).optional(),
  }),
  z.object({
    titles: z.array(z.string().trim().min(1).max(255)).min(1).max(100),
    afterId: z.string().uuid().nullable().optional(),
  }),
]);

const listItems = async (
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) => {
  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return quicklistApiError(400, "validation", "Invalid list ID.");
  }
  const context = await loadQuicklistApiContext(req);
  if (!isQuicklistApiContext(context)) return context;
  const project = await loadQuicklistApiProject(
    context.db,
    context.principal,
    parsedParams.data.projectId
  );
  if (!project) return quicklistApiError(404, "not_found", "Not Found");

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
    .orderBy("position", "asc")
    .orderBy("created_at", "asc");

  return quicklistApiJson({ items: items.map(serializeQuicklistApiItem) });
};

const createItems = async (
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) => {
  const parsedParams = paramsSchema.safeParse(await params);
  const parsedBody = createSchema.safeParse(await req.json().catch(() => null));
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

  const created = await context.db.transaction(async (trx) => {
    let titles: string[];
    let insertAfter = 0;

    if ("title" in parsedBody.data) {
      titles = [parsedBody.data.title];
      if (parsedBody.data.position !== undefined) {
        const countRow = await trx("quicklist.tasks")
          .where({ project_id: project.id })
          .count<{ count: string }>("* as count")
          .first();
        const count = Number(countRow?.count || 0);
        insertAfter = Math.max(0, Math.min(count, parsedBody.data.position - 1));
      } else {
        const maxRow = await trx("quicklist.tasks")
          .where({ project_id: project.id })
          .max<{ max: number | null }>("position as max")
          .first();
        insertAfter = Number(maxRow?.max || 0);
      }
    } else {
      titles = parsedBody.data.titles;
      if (parsedBody.data.afterId) {
        const after = await trx("quicklist.tasks")
          .select("position")
          .where({ project_id: project.id, id: parsedBody.data.afterId })
          .first();
        if (!after) throw new Error("after_item_not_found");
        insertAfter = after.position as number;
      }
    }

    await trx("quicklist.tasks")
      .where({ project_id: project.id })
      .andWhere("position", ">", insertAfter)
      .increment("position", titles.length);

    const rows = await trx("quicklist.tasks")
      .insert(
        titles.map((title, index) => ({
          project_id: project.id,
          title,
          position: insertAfter + index + 1,
          created_by: context.principal.userId,
        }))
      )
      .returning([
        "id",
        "title",
        "position",
        "created_at",
        "updated_at",
        "completed_at",
      ]);

    await trx("quicklist.projects")
      .where({ id: project.id })
      .update({ updated_at: new Date(), updated_by: context.principal.userId });

    return rows;
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "after_item_not_found") return null;
    throw error;
  });

  if (!created) {
    return quicklistApiError(400, "validation", "afterId does not belong to this list.");
  }

  return quicklistApiJson(
    { items: created.map(serializeQuicklistApiItem) },
    { status: 201 }
  );
};

const policy = { require: { feature: "api:quicklists" } } as const;

export const GET = protectRoute(listItems, policy);
export const POST = protectRoute(createItems, policy);
