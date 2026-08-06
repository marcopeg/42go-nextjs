import { z } from 'zod';

import { protectRoute } from '@/42go/policy';
import { quickShareApiJson } from '@/lib/quickshare/server/api-response';
import {
  quickShareAutomationPolicy,
  withQuickShareAutomationContext,
} from '@/lib/quickshare/server/automation-route';
import { quickShareAutomationRequestSchemas } from '@/lib/quickshare/server/automation-contract';
import {
  deleteQuickShareAutomationResource,
  getQuickShareAutomationResource,
  saveQuickShareAutomationResource,
} from '@/lib/quickshare/server/automation-service';

const paramsSchema = z.object({ resourceId: quickShareAutomationRequestSchemas.resourceId });

const getResource = async (
  request: Request,
  routeContext: { params: Promise<{ resourceId: string }> }
) =>
  withQuickShareAutomationContext(request, async context => {
    const { resourceId } = paramsSchema.parse(await routeContext.params);
    return quickShareApiJson({
      resource: await getQuickShareAutomationResource(context.principal, resourceId),
    });
  });

const saveResource = async (
  request: Request,
  routeContext: { params: Promise<{ resourceId: string }> }
) =>
  withQuickShareAutomationContext(request, async context => {
    const { resourceId } = paramsSchema.parse(await routeContext.params);
    const input = quickShareAutomationRequestSchemas.save.parse(
      await request.json().catch(() => undefined)
    );
    return quickShareApiJson({
      resource: await saveQuickShareAutomationResource(context.principal, resourceId, input),
    });
  });

const deleteResource = async (
  request: Request,
  routeContext: { params: Promise<{ resourceId: string }> }
) =>
  withQuickShareAutomationContext(request, async context => {
    const { resourceId } = paramsSchema.parse(await routeContext.params);
    const input = quickShareAutomationRequestSchemas.delete.parse(
      await request.json().catch(() => undefined)
    );
    await deleteQuickShareAutomationResource(context.principal, resourceId, input);
    return quickShareApiJson({ deleted: true });
  });

export const GET = protectRoute(getResource, quickShareAutomationPolicy);
export const PATCH = protectRoute(saveResource, quickShareAutomationPolicy);
export const DELETE = protectRoute(deleteResource, quickShareAutomationPolicy);
