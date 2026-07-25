import { z } from "zod";

import { protectRoute } from "@/42go/policy";
import {
  buildQuicklistReorderRepresentation,
  evaluateQuicklistIfMatch,
  orderQuicklistRequestedPositions,
  quicklistReorderRequestSchema,
} from "@/lib/quicklists/reorder";
import { resolveQuicklistSortingInstructions } from "@/lib/quicklists/settings";
import { createQuicklistETag } from "@/lib/quicklists/server/etag";
import { loadQuicklistApiProject } from "@/lib/quicklists/server/api-access";
import {
  isQuicklistApiContext,
  loadQuicklistApiContext,
} from "@/lib/quicklists/server/api-context";
import {
  quicklistApiError,
  quicklistApiJson,
} from "@/lib/quicklists/server/api-response";

const paramsSchema = z.object({ projectId: z.string().uuid() });

type ReorderTaskRow = {
  id: string;
  title: string;
  position: number;
};

const loadReorderItems = async (
  db: Parameters<typeof loadQuicklistApiProject>[0],
  projectId: string,
  lock = false
) => {
  const query = db("quicklist.tasks")
    .select("id", "title", "position")
    .where({ project_id: projectId })
    .orderBy("position", "asc")
    .orderBy("created_at", "asc");

  if (lock) query.forUpdate();
  return (await query) as ReorderTaskRow[];
};

const getReorderContext = async (
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

  const items = await loadReorderItems(context.db, project.id);
  const representation = buildQuicklistReorderRepresentation(
    {
      id: project.id,
      title: project.title,
      sortingInstructions: resolveQuicklistSortingInstructions(
        project.settings
      ),
    },
    items
  );
  const etag = createQuicklistETag(representation);

  return quicklistApiJson(representation, {
    headers: { ETag: etag },
  });
};

const reorderItems = async (
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) => {
  const parsedParams = paramsSchema.safeParse(await params);
  const parsedBody = quicklistReorderRequestSchema.safeParse(
    await req.json().catch(() => null)
  );
  if (!parsedParams.success || !parsedBody.success) {
    return quicklistApiError(
      400,
      "validation",
      parsedBody.success ? "Invalid list ID." : parsedBody.error.message
    );
  }

  const context = await loadQuicklistApiContext(req);
  if (!isQuicklistApiContext(context)) return context;

  const result = await context.db.transaction(async (trx) => {
    const lockedProject = await trx("quicklist.projects")
      .select("id")
      .where({
        id: parsedParams.data.projectId,
        app_id: context.principal.appId,
        api_enabled: true,
      })
      .forUpdate()
      .first();
    if (!lockedProject) return { kind: "not_found" as const };

    const project = await loadQuicklistApiProject(
      trx,
      context.principal,
      parsedParams.data.projectId
    );
    if (!project) return { kind: "not_found" as const };

    const currentItems = await loadReorderItems(trx, project.id, true);
    const currentRepresentation = buildQuicklistReorderRepresentation(
      {
        id: project.id,
        title: project.title,
        sortingInstructions: resolveQuicklistSortingInstructions(
          project.settings
        ),
      },
      currentItems
    );
    const currentETag = createQuicklistETag(currentRepresentation);
    const ifMatch = evaluateQuicklistIfMatch(
      req.headers.get("if-match"),
      currentETag
    );
    if (ifMatch === "missing" || ifMatch === "malformed") {
      return { kind: "precondition_required" as const };
    }
    if (ifMatch === "stale") return { kind: "stale" as const };

    const orderedIds = orderQuicklistRequestedPositions(
      currentItems.map((item) => item.id),
      parsedBody.data.items
    );
    if (!orderedIds) return { kind: "validation" as const };

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
      [orderedIds, project.id]
    );
    await trx("quicklist.projects")
      .where({ id: project.id })
      .update({
        updated_at: new Date(),
        updated_by: context.principal.userId,
      });

    const currentById = new Map(
      currentItems.map((item) => [item.id, item] as const)
    );
    const reorderedItems = orderedIds.map((id, index) => ({
      ...currentById.get(id)!,
      position: index + 1,
    }));
    const nextRepresentation = buildQuicklistReorderRepresentation(
      {
        id: project.id,
        title: project.title,
        sortingInstructions: resolveQuicklistSortingInstructions(
          project.settings
        ),
      },
      reorderedItems
    );

    return {
      kind: "success" as const,
      etag: createQuicklistETag(nextRepresentation),
      items: reorderedItems.map((item) => ({
        id: item.id,
        position: item.position,
      })),
    };
  });

  if (result.kind === "not_found") {
    return quicklistApiError(404, "not_found", "Not Found");
  }
  if (result.kind === "precondition_required") {
    return quicklistApiError(
      428,
      "precondition_required",
      "A single strong If-Match value from reorder GET is required."
    );
  }
  if (result.kind === "stale") {
    return quicklistApiError(
      409,
      "conflict",
      "The list changed after reorder GET. Fetch fresh reorder context."
    );
  }
  if (result.kind === "validation") {
    return quicklistApiError(
      400,
      "validation",
      "items must contain every current item exactly once with unique gapless positions from 1..N."
    );
  }

  return quicklistApiJson(
    { items: result.items },
    { headers: { ETag: result.etag } }
  );
};

const policy = { require: { feature: "api:quicklists" } } as const;

export const GET = protectRoute(getReorderContext, policy);
export const POST = protectRoute(reorderItems, policy);
