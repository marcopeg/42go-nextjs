import { z } from "zod";

import { protectRoute } from "@/42go/policy";
import { QUICKLIST_MODES } from "@/lib/quicklists/mode";
import { loadQuicklistApiProject } from "@/lib/quicklists/server/api-access";
import {
  isQuicklistApiContext,
  loadQuicklistApiContext,
} from "@/lib/quicklists/server/api-context";
import { quicklistApiError, quicklistApiJson } from "@/lib/quicklists/server/api-response";
import {
  serializeQuicklistApiItem,
  serializeQuicklistApiList,
} from "@/lib/quicklists/server/api-serialization";

const paramsSchema = z.object({ projectId: z.string().uuid() });
const updateSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    mode: z.enum(QUICKLIST_MODES).optional(),
  })
  .refine((value) => value.title !== undefined || value.mode !== undefined, {
    message: "Include title or mode.",
  });

const getList = async (
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

  const items = (await context.db("quicklist.tasks")
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
    .orderBy("created_at", "asc")) as Array<{
    id: string;
    title: string;
    position: number;
    created_at: Date;
    updated_at: Date;
    completed_at: Date | null;
  }>;

  return quicklistApiJson({
    list: serializeQuicklistApiList(project),
    items: items.map(serializeQuicklistApiItem),
  });
};

const updateList = async (
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) => {
  const parsedParams = paramsSchema.safeParse(await params);
  const parsedBody = updateSchema.safeParse(await req.json().catch(() => null));
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

  const updates: Record<string, unknown> = {
    updated_at: new Date(),
    updated_by: context.principal.userId,
  };
  if (parsedBody.data.title !== undefined) updates.title = parsedBody.data.title;
  if (parsedBody.data.mode !== undefined) {
    updates.settings = context.db.raw(
      "jsonb_set(COALESCE(settings, '{}'::jsonb), '{mode}', to_jsonb(?::text), true)",
      [parsedBody.data.mode]
    );
  }

  const [updated] = await context.db("quicklist.projects")
    .where({ id: project.id, app_id: context.principal.appId, api_enabled: true })
    .update(updates)
    .returning([
      "id",
      "title",
      "settings",
      "created_at",
      "updated_at",
    ]);

  return quicklistApiJson({
    list: serializeQuicklistApiList({
      ...updated,
      owned: project.owned,
      role: project.role,
    }),
  });
};

const deleteList = async (
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
  if (!project.owned) {
    return quicklistApiError(403, "forbidden", "Only the list owner can delete it.");
  }

  await context.db("quicklist.projects")
    .where({ id: project.id, app_id: context.principal.appId, owned_by: context.principal.userId })
    .del();

  return new Response(null, { status: 204 });
};

const policy = { require: { feature: "api:quicklists" } } as const;

export const GET = protectRoute(getList, policy);
export const PATCH = protectRoute(updateList, policy);
export const DELETE = protectRoute(deleteList, policy);
