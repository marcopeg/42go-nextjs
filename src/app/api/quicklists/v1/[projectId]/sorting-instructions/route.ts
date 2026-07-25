import { z } from "zod";

import { protectRoute } from "@/42go/policy";
import {
  resolveQuicklistSortingInstructions,
} from "@/lib/quicklists/settings";
import { loadQuicklistApiProject } from "@/lib/quicklists/server/api-access";
import {
  isQuicklistApiContext,
  loadQuicklistApiContext,
} from "@/lib/quicklists/server/api-context";
import {
  quicklistApiError,
  quicklistApiJson,
} from "@/lib/quicklists/server/api-response";
import { quicklistSortingInstructionsRequestSchema } from "@/lib/quicklists/validation";

const paramsSchema = z.object({ projectId: z.string().uuid() });

const getSortingInstructions = async (
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

  return quicklistApiJson({
    sortingInstructions: resolveQuicklistSortingInstructions(project.settings),
  });
};

const updateSortingInstructions = async (
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) => {
  const parsedParams = paramsSchema.safeParse(await params);
  const parsedBody = quicklistSortingInstructionsRequestSchema.safeParse(
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

  const project = await loadQuicklistApiProject(
    context.db,
    context.principal,
    parsedParams.data.projectId
  );
  if (!project) return quicklistApiError(404, "not_found", "Not Found");

  const updated = await context.db("quicklist.projects")
    .where({
      id: project.id,
      app_id: context.principal.appId,
      api_enabled: true,
    })
    .update({
      settings: context.db.raw(
        `jsonb_set(
          CASE
            WHEN jsonb_typeof(settings) = 'object' THEN settings
            ELSE '{}'::jsonb
          END,
          '{sortingInstructions}',
          to_jsonb(?::text),
          true
        )`,
        [parsedBody.data.sortingInstructions]
      ),
      updated_at: new Date(),
      updated_by: context.principal.userId,
    });

  if (updated === 0) {
    return quicklistApiError(404, "not_found", "Not Found");
  }

  return quicklistApiJson({
    sortingInstructions: parsedBody.data.sortingInstructions,
  });
};

const policy = { require: { feature: "api:quicklists" } } as const;

export const GET = protectRoute(getSortingInstructions, policy);
export const POST = protectRoute(updateSortingInstructions, policy);
