import { z } from "zod";

import { protectRoute } from "@/42go/policy";
import { resolveQuicklistMode } from "@/lib/quicklists/mode";
import { loadQuicklistApiProject } from "@/lib/quicklists/server/api-access";
import {
  isQuicklistApiContext,
  loadQuicklistApiContext,
} from "@/lib/quicklists/server/api-context";
import { quicklistApiError, quicklistApiJson } from "@/lib/quicklists/server/api-response";
import { serializeQuicklistApiItem } from "@/lib/quicklists/server/api-serialization";

const paramsSchema = z.object({ projectId: z.string().uuid() });
const bodySchema = z.object({
  action: z.enum(["drop-completed", "reset-checklist"]),
});

const runListAction = async (
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

  const mode = resolveQuicklistMode(project.settings);
  if (parsedBody.data.action === "drop-completed" && mode !== "todo") {
    return quicklistApiError(
      409,
      "invalid_mode",
      "Completed item cleanup is only available for todo lists."
    );
  }
  if (parsedBody.data.action === "reset-checklist" && mode !== "checklist") {
    return quicklistApiError(
      409,
      "invalid_mode",
      "Checklist reset is only available for checklist lists."
    );
  }

  const affected = await context.db.transaction(async (trx) => {
    let count = 0;
    if (parsedBody.data.action === "drop-completed") {
      const completed = await trx("quicklist.tasks")
        .select("id")
        .where({ project_id: project.id })
        .whereNotNull("completed_at");
      count = completed.length;
      await trx("quicklist.tasks")
        .where({ project_id: project.id })
        .whereNotNull("completed_at")
        .del();

      const remaining = await trx("quicklist.tasks")
        .select("id", "position")
        .where({ project_id: project.id })
        .orderBy("position", "asc");
      for (const [index, item] of remaining.entries()) {
        const position = index + 1;
        if (item.position !== position) {
          await trx("quicklist.tasks")
            .where({ id: item.id, project_id: project.id })
            .update({ position, updated_at: new Date() });
        }
      }
    } else {
      const rows = await trx("quicklist.tasks")
        .where({ project_id: project.id })
        .whereNotNull("completed_at")
        .update({
          completed_at: null,
          completed_by: null,
          updated_at: new Date(),
        })
        .returning("id");
      count = rows.length;
    }

    if (count > 0) {
      await trx("quicklist.projects")
        .where({ id: project.id })
        .update({ updated_at: new Date(), updated_by: context.principal.userId });
    }
    return count;
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

  return quicklistApiJson({
    action: parsedBody.data.action,
    affected,
    items: items.map(serializeQuicklistApiItem),
  });
};

export const POST = protectRoute(runListAction, {
  require: { feature: "api:quicklists" },
});
