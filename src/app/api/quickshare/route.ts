import { getAppID } from '@/42go/config/app-config';
import { protectRoute } from '@/42go/policy';
import { getSessionUserId } from '@/42go/policy/access';
import {
  claimQuickShareHandle,
  getQuickShareAccount,
  QuickShareDomainError,
} from '@/lib/quickshare/server/account-service';
import {
  createQuickShareResource,
  listQuickShareResources,
} from '@/lib/quickshare/server/resource-service';
import { quickShareResourceCatalog } from '@/lib/quickshare/resource-catalog';
import { z } from 'zod';

const createSchema = z.object({
  type: z.string(),
  title: z.string().max(160).optional(),
  content: z.unknown().optional(),
});
const claimSchema = z.object({ action: z.literal('claim-handle'), handle: z.string() });

const context = async () => {
  const [appId, userId] = await Promise.all([getAppID(), getSessionUserId()]);
  if (!appId || !userId)
    throw new QuickShareDomainError('session_required', 'Login required.', 401);
  return { appId, userId };
};

const jsonError = (error: unknown) => {
  if (error instanceof QuickShareDomainError) {
    return Response.json({ error: error.code, message: error.message }, { status: error.status });
  }
  console.error('QuickShare API error', error);
  return Response.json(
    { error: 'quickshare_error', message: 'QuickShare could not complete that request.' },
    { status: 500 }
  );
};

export const GET = protectRoute(
  async () => {
    try {
      const principal = await context();
      const [account, resources] = await Promise.all([
        getQuickShareAccount(principal),
        listQuickShareResources(principal),
      ]);
      return Response.json({ account, resources, catalog: quickShareResourceCatalog });
    } catch (error) {
      return jsonError(error);
    }
  },
  { require: { feature: 'api:quickshare', session: true } }
);

export const POST = protectRoute(
  async (request: Request) => {
    try {
      const principal = await context();
      const body = await request.json();
      const claim = claimSchema.safeParse(body);
      if (claim.success)
        return Response.json(
          { account: await claimQuickShareHandle(principal, claim.data.handle) },
          { status: 201 }
        );
      const input = createSchema.parse(body);
      return Response.json(
        { resource: await createQuickShareResource(principal, input) },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof z.ZodError)
        return Response.json(
          { error: 'invalid_payload', message: error.issues[0]?.message ?? 'Invalid request.' },
          { status: 422 }
        );
      return jsonError(error);
    }
  },
  { require: { feature: 'api:quickshare', session: true } }
);
