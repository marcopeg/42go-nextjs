import { getAppID } from '@/42go/config/app-config';
import { protectRoute } from '@/42go/policy';
import { getSessionUserId } from '@/42go/policy/access';
import {
  getQuickShareResource,
  saveQuickShareResourceDraft,
  upgradeQuickShareResourceTemplate,
  updateQuickShareResourceIdentifier,
} from '@/lib/quickshare/server/resource-service';
import {
  deleteQuickShareShare,
  publishQuickShareCurrentDraft,
  unpublishQuickShareRelease,
} from '@/lib/quickshare/server/publication-service';
import { QuickShareDomainError } from '@/lib/quickshare/server/account-service';
import {
  compileQuickShareResource,
  QuickShareCompilationError,
} from '@/lib/quickshare/server/resource-compiler';
import { z } from 'zod';

const saveSchema = z.union([
  z.object({
    action: z.literal('save'),
    title: z.string(),
    source: z.string(),
    expectedRevision: z.number().int().positive(),
  }),
  z.object({
    action: z.literal('save'),
    title: z.string(),
    content: z.unknown(),
    expectedRevision: z.number().int().positive(),
  }),
]);
const identifierSchema = z.object({
  action: z.literal('set-identifier'),
  customId: z.string().nullable(),
  expectedRevision: z.number().int().positive(),
});
const publishSchema = z.object({
  action: z.literal('publish'),
  expectedDraftRevision: z.number().int().positive(),
});
const upgradeTemplateSchema = z.object({
  action: z.literal('upgrade-template'),
  targetVersion: z.string().min(1).max(32),
  expectedRevision: z.number().int().positive(),
});
const unpublishSchema = z.object({ action: z.literal('unpublish'), confirmed: z.literal(true) });
const deleteSchema = z.object({
  action: z.literal('delete'),
  confirmation: z.enum(['delete-draft', 'delete-published']),
});

const principal = async () => {
  const [appId, userId] = await Promise.all([getAppID(), getSessionUserId()]);
  if (!appId || !userId)
    throw new QuickShareDomainError('session_required', 'Login required.', 401);
  return { appId, userId };
};

const fail = (error: unknown) => {
  if (error instanceof QuickShareDomainError)
    return Response.json({ error: error.code, message: error.message }, { status: error.status });
  if (error instanceof QuickShareCompilationError)
    return Response.json(
      { error: error.code, message: error.message, location: error.location },
      { status: 422 }
    );
  if (error instanceof z.ZodError)
    return Response.json(
      { error: 'invalid_payload', message: error.issues[0]?.message ?? 'Invalid request.' },
      { status: 422 }
    );
  console.error('QuickShare resource API error', error);
  return Response.json(
    { error: 'quickshare_error', message: 'QuickShare could not complete that request.' },
    { status: 500 }
  );
};

export const GET = protectRoute(
  async (_request: Request, context: { params: Promise<{ resourceId: string }> }) => {
    try {
      return Response.json({
        resource: await getQuickShareResource(await principal(), (await context.params).resourceId),
      });
    } catch (error) {
      return fail(error);
    }
  },
  { require: { feature: 'api:quickshare', session: true } }
);

export const PATCH = protectRoute(
  async (request: Request, context: { params: Promise<{ resourceId: string }> }) => {
    try {
      const body = await request.json();
      const resourceId = (await context.params).resourceId;
      const owner = await principal();
      const save = saveSchema.safeParse(body);
      if (save.success) {
        const content = 'content' in save.data ? save.data.content : { source: save.data.source };
        return Response.json({
          resource: await saveQuickShareResourceDraft(owner, resourceId, {
            title: save.data.title,
            content,
            expectedRevision: save.data.expectedRevision,
          }),
        });
      }
      const upgrade = upgradeTemplateSchema.safeParse(body);
      if (upgrade.success)
        return Response.json({
          resource: await upgradeQuickShareResourceTemplate(owner, resourceId, upgrade.data),
        });
      const identifier = identifierSchema.parse(body);
      return Response.json({
        resource: await updateQuickShareResourceIdentifier(
          owner,
          resourceId,
          identifier.customId,
          identifier.expectedRevision
        ),
      });
    } catch (error) {
      return fail(error);
    }
  },
  { require: { feature: 'api:quickshare', session: true } }
);

export const POST = protectRoute(
  async (request: Request, context: { params: Promise<{ resourceId: string }> }) => {
    try {
      const body = await request.json();
      const resourceId = (await context.params).resourceId;
      const owner = await principal();
      const publish = publishSchema.safeParse(body);
      if (publish.success) {
        return Response.json({
          publication: await publishQuickShareCurrentDraft(
            owner,
            resourceId,
            publish.data.expectedDraftRevision,
            compileQuickShareResource
          ),
        });
      }
      const unpublish = unpublishSchema.safeParse(body);
      if (unpublish.success)
        return Response.json(await unpublishQuickShareRelease(owner, resourceId));
      const deletion = deleteSchema.parse(body);
      return Response.json(await deleteQuickShareShare(owner, resourceId, deletion.confirmation));
    } catch (error) {
      return fail(error);
    }
  },
  { require: { feature: 'api:quickshare', session: true } }
);
