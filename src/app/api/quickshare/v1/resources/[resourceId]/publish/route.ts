import { z } from 'zod';

import { protectRoute } from '@/42go/policy';
import { quickShareApiJson } from '@/lib/quickshare/server/api-response';
import {
  quickShareAutomationPolicy,
  withQuickShareAutomationContext,
} from '@/lib/quickshare/server/automation-route';
import { quickShareAutomationRequestSchemas } from '@/lib/quickshare/server/automation-contract';
import { publishQuickShareAutomationResource } from '@/lib/quickshare/server/automation-service';

const paramsSchema = z.object({ resourceId: quickShareAutomationRequestSchemas.resourceId });

const publishResource = async (
  request: Request,
  routeContext: { params: Promise<{ resourceId: string }> }
) =>
  withQuickShareAutomationContext(request, async context => {
    const { resourceId } = paramsSchema.parse(await routeContext.params);
    const input = quickShareAutomationRequestSchemas.publish.parse(
      await request.json().catch(() => undefined)
    );
    return quickShareApiJson({
      resource: await publishQuickShareAutomationResource(context.principal, resourceId, input),
    });
  });

export const POST = protectRoute(publishResource, quickShareAutomationPolicy);
