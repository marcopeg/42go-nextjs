import { protectRoute } from '@/42go/policy';

import { getQuickShareAutomationDiscovery } from '@/lib/quickshare/server/automation-contract';
import { quickShareApiJson } from '@/lib/quickshare/server/api-response';
import {
  quickShareAutomationPolicy,
  withQuickShareAutomationContext,
} from '@/lib/quickshare/server/automation-route';

const getDiscovery = async (request: Request) =>
  withQuickShareAutomationContext(request, async () =>
    quickShareApiJson(getQuickShareAutomationDiscovery())
  );

export const GET = protectRoute(getDiscovery, quickShareAutomationPolicy);
