import { protectRoute } from '@/42go/policy';
import { quickShareApiJson } from '@/lib/quickshare/server/api-response';
import {
  quickShareAutomationPolicy,
  withQuickShareAutomationContext,
} from '@/lib/quickshare/server/automation-route';
import { quickShareAutomationRequestSchemas } from '@/lib/quickshare/server/automation-contract';
import {
  createQuickShareAutomationResource,
  listQuickShareAutomationResources,
} from '@/lib/quickshare/server/automation-service';

const encodeCursor = (offset: number) =>
  Buffer.from(JSON.stringify({ offset }), 'utf8').toString('base64url');

const decodeCursor = (value: string | undefined) => {
  if (!value) return 0;
  try {
    const candidate = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    return Number.isInteger(candidate.offset) && candidate.offset >= 0 ? candidate.offset : null;
  } catch {
    return null;
  }
};

const listResources = async (request: Request) =>
  withQuickShareAutomationContext(request, async context => {
    const url = new URL(request.url);
    const parsed = quickShareAutomationRequestSchemas.pagination.safeParse({
      limit: url.searchParams.get('limit') ?? undefined,
      cursor: url.searchParams.get('cursor') ?? undefined,
    });
    if (!parsed.success) throw parsed.error;
    const offset = decodeCursor(parsed.data.cursor);
    if (offset === null) {
      return Response.json(
        { error: 'invalid_cursor', message: 'The cursor is invalid.' },
        { status: 422, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    const all = await listQuickShareAutomationResources(context.principal);
    const resources = all.slice(offset, offset + parsed.data.limit);
    const nextOffset = offset + resources.length;
    return quickShareApiJson({
      resources,
      nextCursor: nextOffset < all.length ? encodeCursor(nextOffset) : null,
    });
  });

const createResource = async (request: Request) =>
  withQuickShareAutomationContext(request, async context => {
    const parsed = quickShareAutomationRequestSchemas.create.parse(
      await request.json().catch(() => undefined)
    );
    return quickShareApiJson(
      { resource: await createQuickShareAutomationResource(context.principal, parsed) },
      { status: 201 }
    );
  });

export const GET = protectRoute(listResources, quickShareAutomationPolicy);
export const POST = protectRoute(createResource, quickShareAutomationPolicy);
