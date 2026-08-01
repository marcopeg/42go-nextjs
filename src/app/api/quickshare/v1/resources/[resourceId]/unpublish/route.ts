import { z } from 'zod';

import { protectRoute } from '@/42go/policy';
import { quickShareApiJson } from '@/lib/quickshare/server/api-response';
import {
  quickShareAutomationPolicy,
  withQuickShareAutomationContext,
} from '@/lib/quickshare/server/automation-route';
import { quickShareAutomationRequestSchemas } from '@/lib/quickshare/server/automation-contract';
import { unpublishQuickShareAutomationResource } from '@/lib/quickshare/server/automation-service';

const paramsSchema = z.object({ resourceId: quickShareAutomationRequestSchemas.resourceId });

const unpublishResource = async (
  request: Request,
  routeContext: { params: Promise<{ resourceId: string }> }
) =>
  withQuickShareAutomationContext(request, async context => {
    const { resourceId } = paramsSchema.parse(await routeContext.params);
    const input = quickShareAutomationRequestSchemas.unpublish.parse(
      await request.json().catch(() => undefined)
    );
    void input;
    return quickShareApiJson({
      resource: await unpublishQuickShareAutomationResource(context.principal, resourceId),
    });
  });

export const POST = protectRoute(unpublishResource, quickShareAutomationPolicy);
