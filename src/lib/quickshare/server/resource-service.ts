import 'server-only';

import { randomBytes } from 'node:crypto';

import { getDB } from '@/42go/db';
import {
  getQuickShareAccount,
  QuickShareDomainError,
  type QuickSharePrincipal,
} from '@/lib/quickshare/server/account-service';
import {
  isQuickShareCreatableResourceType,
  type QuickShareResourceType,
} from '@/lib/quickshare/resource-catalog';
import {
  normalizeQuickShareCustomId,
  quickShareCustomIdSchema,
} from '@/lib/quickshare/server/validation';
import {
  createQuickShareWebPageDraft,
  parseQuickShareWebPageDraft,
  type QuickShareWebPageDraft,
} from '@/lib/quickshare/server/web-page-compiler-core';
import {
  createQuickShareTemplateDraft,
  parseQuickShareTemplateDraft,
  type QuickShareTemplateDraft,
} from '@/lib/quickshare/templates/catalog';
import { upgradeQuickShareTemplateDraft } from '@/lib/quickshare/templates/registry.server';

export type QuickShareResource = {
  id: string;
  type: QuickShareResourceType;
  title: string;
  lifecycle: 'draft' | 'published' | 'unpublished';
  revision: number;
  publishedUrl: string | null;
  nextPublicUrl: string;
  nextIdentifierKind: 'short' | 'custom';
  nextCustomId: string | null;
  everPublished: boolean;
};

type ResourceRow = {
  id: string;
  type: QuickShareResourceType;
  title: string;
  lifecycle: QuickShareResource['lifecycle'];
  revision: number;
  next_identifier_kind: 'short' | 'custom';
  next_short_code: string | null;
  next_custom_id: string | null;
  published_identifier_kind: 'short' | 'custom' | null;
  published_short_code: string | null;
  published_custom_id: string | null;
  ever_published: boolean;
};

const publicOrigin = () => process.env.QUICKSHARE_PUBLIC_ORIGIN ?? 'https://s.42go.dev';
const buildUrl = (
  identifier: { kind: 'short' | 'custom'; shortCode?: string | null; customId?: string | null },
  handle: string
) =>
  identifier.kind === 'short'
    ? `${publicOrigin()}/${identifier.shortCode}`
    : `${publicOrigin()}/${handle}/${identifier.customId}`;

const mapResource = (row: ResourceRow, handle: string): QuickShareResource => ({
  id: row.id,
  type: row.type,
  title: row.title,
  lifecycle: row.lifecycle,
  revision: row.revision,
  publishedUrl: row.published_identifier_kind
    ? buildUrl(
        {
          kind: row.published_identifier_kind,
          shortCode: row.published_short_code,
          customId: row.published_custom_id,
        },
        handle
      )
    : null,
  nextPublicUrl: buildUrl(
    {
      kind: row.next_identifier_kind,
      shortCode: row.next_short_code,
      customId: row.next_custom_id,
    },
    handle
  ),
  nextIdentifierKind: row.next_identifier_kind,
  nextCustomId: row.next_custom_id,
  everPublished: row.ever_published,
});

// Keep generated codes inside both the database route-claim contract and the
// static publisher's safe path-segment contract. Base64url may begin with
// "_" or "-", while public route segments must begin with an alphanumeric.
const shortCode = () => randomBytes(8).toString('hex');

export const listQuickShareResources = async (principal: QuickSharePrincipal) => {
  const account = await getQuickShareAccount(principal);
  if (!account) return [];
  const rows = await getDB()('quickshare.resources')
    .where({ app_id: principal.appId, account_id: account.id })
    .orderBy('updated_at', 'desc');
  return rows.map(row => mapResource(row, account.handle));
};

export const createQuickShareResource = async (
  principal: QuickSharePrincipal,
  input: { type: string; title?: string; content?: unknown; customId?: string | null }
) => {
  if (!isQuickShareCreatableResourceType(input.type)) {
    throw new QuickShareDomainError(
      'invalid_resource_type',
      'Choose a currently supported resource type.',
      422
    );
  }
  const type = input.type as QuickShareResourceType;
  const content = parseDraftContent(type, input.content ?? defaultDraftContent(type));
  const customId = input.customId === undefined || input.customId === null
    ? null
    : parseCustomId(input.customId);
  const account = await getQuickShareAccount(principal);
  if (!account)
    throw new QuickShareDomainError(
      'handle_required',
      'Complete handle onboarding before creating a share.',
      409
    );

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const result = await getDB().transaction(async trx => {
        const code = customId === null ? shortCode() : null;
        const identifier = customId === null
          ? { kind: 'short' as const, shortCode: code, customId: null }
          : { kind: 'custom' as const, shortCode: null, customId };
        const resources = await trx('quickshare.resources')
          .insert({
            app_id: principal.appId,
            account_id: account.id,
            type,
            title: input.title?.trim().slice(0, 160) || 'Untitled share',
            next_identifier_kind: identifier.kind,
            next_short_code: identifier.shortCode,
            next_custom_id: identifier.customId,
          })
          .returning('*');
        await trx('quickshare.resource_route_claims').insert({
          app_id: principal.appId,
          account_id: account.id,
          resource_id: resources[0].id,
          state: 'candidate',
          kind: identifier.kind,
          short_code: identifier.shortCode,
          custom_id: identifier.customId,
        });
        await trx('quickshare.draft_revisions').insert({
          resource_id: resources[0].id,
          revision: 1,
          ...draftRevisionValues(type, content),
          app_id: principal.appId,
          created_by: principal.userId,
        });
        return resources[0] as ResourceRow;
      });
      return mapResource(result, account.handle);
    } catch (error) {
      if (customId !== null && isUniqueViolation(error)) {
        throw new QuickShareDomainError(
          'custom_id_unavailable',
          'This custom ID is already in use for your handle.',
          409
        );
      }
      if (!isShortCodeCollision(error) || attempt === 3) throw error;
    }
  }
  throw new QuickShareDomainError(
    'short_code_exhausted',
    'Could not allocate a public short code.',
    503
  );
};

export type QuickShareResourceDetail = QuickShareResource & {
  content: QuickShareDraftContent;
  currentDraftRevision: number;
};

export type QuickShareTextDraftContent = { source: string };
export type QuickShareDraftContent =
  QuickShareTextDraftContent | QuickShareWebPageDraft | QuickShareTemplateDraft;

type DraftRevisionRow = {
  revision: number;
  content: unknown;
  template_id: string | null;
  template_version: string | null;
  template_config: unknown;
};

const parseTextDraftContent = (value: unknown): QuickShareTextDraftContent => {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  if (
    !parsed ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed) ||
    typeof (parsed as { source?: unknown }).source !== 'string'
  ) {
    throw new QuickShareDomainError(
      'invalid_draft_source',
      'This share has invalid draft source.',
      409
    );
  }
  const source = (parsed as { source: string }).source;
  if (source.length > 500_000)
    throw new QuickShareDomainError(
      'draft_too_large',
      'Draft source must be 500,000 characters or less.',
      422
    );
  return { source };
};

const parseDraftContent = (
  type: QuickShareResourceType,
  value: unknown
): QuickShareDraftContent => {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value;
  try {
    if (type === 'web-page') return parseQuickShareWebPageDraft(parsed);
    if (type === 'template') return parseQuickShareTemplateDraft(parsed);
    return parseTextDraftContent(parsed);
  } catch (error) {
    if (error instanceof QuickShareDomainError) throw error;
    if (error instanceof Error)
      throw new QuickShareDomainError('invalid_draft_source', error.message, 422);
    throw new QuickShareDomainError(
      'invalid_draft_source',
      'This share has invalid draft source.',
      422
    );
  }
};

const defaultDraftContent = (type: QuickShareResourceType): QuickShareDraftContent =>
  type === 'web-page'
    ? createQuickShareWebPageDraft()
    : type === 'template'
      ? createQuickShareTemplateDraft()
      : { source: '' };

const draftRevisionValues = (type: QuickShareResourceType, content: QuickShareDraftContent) =>
  type === 'template'
    ? {
        content: JSON.stringify({}),
        template_id: (content as QuickShareTemplateDraft).templateId,
        template_version: (content as QuickShareTemplateDraft).templateVersion,
        template_config: JSON.stringify((content as QuickShareTemplateDraft).config),
      }
    : {
        content: JSON.stringify(content),
        template_id: null,
        template_version: null,
        template_config: null,
      };

export const hydrateQuickShareDraftContent = (
  type: QuickShareResourceType,
  draft: Omit<DraftRevisionRow, 'revision'>
): QuickShareDraftContent => {
  if (type !== 'template') return parseDraftContent(type, draft.content);
  return parseQuickShareTemplateDraft({
    templateId: draft.template_id,
    templateVersion: draft.template_version,
    config:
      typeof draft.template_config === 'string'
        ? JSON.parse(draft.template_config)
        : draft.template_config,
  });
};

export const getQuickShareResource = async (
  principal: QuickSharePrincipal,
  resourceId: string
): Promise<QuickShareResourceDetail> => {
  const account = await getQuickShareAccount(principal);
  if (!account)
    throw new QuickShareDomainError('account_missing', 'QuickShare account not found.', 404);
  const resource = (await getDB()('quickshare.resources')
    .where({ id: resourceId, app_id: principal.appId, account_id: account.id })
    .first()) as (ResourceRow & { current_draft_revision: number }) | undefined;
  if (!resource) throw new QuickShareDomainError('resource_missing', 'Share not found.', 404);
  const draft = (await getDB()('quickshare.draft_revisions')
    .where({
      resource_id: resourceId,
      app_id: principal.appId,
      revision: resource.current_draft_revision,
    })
    .first('revision', 'content', 'template_id', 'template_version', 'template_config')) as
    DraftRevisionRow | undefined;
  if (!draft)
    throw new QuickShareDomainError('draft_missing', 'The current draft is unavailable.', 409);
  return {
    ...mapResource(resource, account.handle),
    content: hydrateQuickShareDraftContent(resource.type, draft),
    currentDraftRevision: resource.current_draft_revision,
  };
};

export const saveQuickShareResourceDraft = async (
  principal: QuickSharePrincipal,
  resourceId: string,
  input: { title: string; content: unknown; expectedRevision: number }
) => {
  if (input.title.trim().length === 0 || input.title.trim().length > 160) {
    throw new QuickShareDomainError(
      'invalid_title',
      'Title must contain 1 to 160 characters.',
      422
    );
  }
  const account = await getQuickShareAccount(principal);
  if (!account)
    throw new QuickShareDomainError('account_missing', 'QuickShare account not found.', 404);
  const result = await getDB().transaction(async trx => {
    const resource = await trx('quickshare.resources')
      .where({
        id: resourceId,
        app_id: principal.appId,
        account_id: account.id,
        revision: input.expectedRevision,
      })
      .forUpdate()
      .first();
    if (!resource)
      throw new QuickShareDomainError(
        'resource_stale_or_missing',
        'The share was changed elsewhere or no longer exists.',
        409
      );
    const content = parseDraftContent(resource.type as QuickShareResourceType, input.content);
    const nextDraftRevision = resource.current_draft_revision + 1;
    await trx('quickshare.draft_revisions').insert({
      resource_id: resourceId,
      revision: nextDraftRevision,
      app_id: principal.appId,
      created_by: principal.userId,
      ...draftRevisionValues(resource.type as QuickShareResourceType, content),
    });
    const rows = await trx('quickshare.resources')
      .where({ id: resourceId, revision: input.expectedRevision })
      .update({
        title: input.title.trim(),
        current_draft_revision: nextDraftRevision,
        revision: input.expectedRevision + 1,
        updated_at: trx.fn.now(),
      })
      .returning('*');
    return rows[0] as ResourceRow & { current_draft_revision: number };
  });
  return {
    ...mapResource(result, account.handle),
    content: parseDraftContent(result.type, input.content),
    currentDraftRevision: result.current_draft_revision,
  } satisfies QuickShareResourceDetail;
};

export const upgradeQuickShareResourceTemplate = async (
  principal: QuickSharePrincipal,
  resourceId: string,
  input: { targetVersion: string; expectedRevision: number }
) => {
  const account = await getQuickShareAccount(principal);
  if (!account)
    throw new QuickShareDomainError('account_missing', 'QuickShare account not found.', 404);
  const result = await getDB().transaction(async trx => {
    const resource = await trx('quickshare.resources')
      .where({
        id: resourceId,
        app_id: principal.appId,
        account_id: account.id,
        revision: input.expectedRevision,
      })
      .forUpdate()
      .first();
    if (!resource)
      throw new QuickShareDomainError(
        'resource_stale_or_missing',
        'The share was changed elsewhere or no longer exists.',
        409
      );
    if (resource.type !== 'template')
      throw new QuickShareDomainError(
        'template_upgrade_invalid_type',
        'Only template shares can be upgraded.',
        422
      );
    const current = (await trx('quickshare.draft_revisions')
      .where({
        resource_id: resourceId,
        app_id: principal.appId,
        revision: resource.current_draft_revision,
      })
      .first('revision', 'content', 'template_id', 'template_version', 'template_config')) as
      DraftRevisionRow | undefined;
    if (!current)
      throw new QuickShareDomainError('draft_missing', 'The current draft is unavailable.', 409);
    let next: QuickShareTemplateDraft;
    try {
      next = upgradeQuickShareTemplateDraft({
        draft: hydrateQuickShareDraftContent('template', current),
        targetVersion: input.targetVersion,
      });
    } catch (error) {
      throw new QuickShareDomainError(
        'template_upgrade_unavailable',
        error instanceof Error ? error.message : 'Template upgrade is unavailable.',
        422
      );
    }
    const nextDraftRevision = resource.current_draft_revision + 1;
    await trx('quickshare.draft_revisions').insert({
      resource_id: resourceId,
      revision: nextDraftRevision,
      app_id: principal.appId,
      created_by: principal.userId,
      ...draftRevisionValues('template', next),
    });
    const rows = await trx('quickshare.resources')
      .where({ id: resourceId, revision: input.expectedRevision })
      .update({
        current_draft_revision: nextDraftRevision,
        revision: input.expectedRevision + 1,
        updated_at: trx.fn.now(),
      })
      .returning('*');
    return { row: rows[0] as ResourceRow & { current_draft_revision: number }, content: next };
  });
  return {
    ...mapResource(result.row, account.handle),
    content: result.content,
    currentDraftRevision: result.row.current_draft_revision,
  } satisfies QuickShareResourceDetail;
};

export const updateQuickShareResourceIdentifier = async (
  principal: QuickSharePrincipal,
  resourceId: string,
  customId: string | null,
  expectedRevision: number
) => {
  const account = await getQuickShareAccount(principal);
  if (!account)
    throw new QuickShareDomainError('handle_required', 'Complete handle onboarding first.', 409);
  const parsedCustomId = customId === null ? null : parseCustomId(customId);
  const update = async () =>
    getDB().transaction(async trx => {
      const next =
        parsedCustomId === null
          ? { next_identifier_kind: 'short', next_short_code: shortCode(), next_custom_id: null }
          : {
              next_identifier_kind: 'custom',
              next_short_code: null,
              next_custom_id: parsedCustomId,
            };
      const current = await trx('quickshare.resources')
        .where({
          id: resourceId,
          app_id: principal.appId,
          account_id: account.id,
          revision: expectedRevision,
        })
        .first();
      if (!current)
        throw new QuickShareDomainError(
          'resource_stale_or_missing',
          'The share was changed elsewhere or no longer exists.',
          409
        );
      await trx('quickshare.resource_route_claims')
        .where({ resource_id: resourceId, state: 'candidate' })
        .delete();
      await trx('quickshare.resource_route_claims').insert({
        app_id: principal.appId,
        account_id: account.id,
        resource_id: resourceId,
        state: 'candidate',
        kind: next.next_identifier_kind,
        short_code: next.next_short_code,
        custom_id: next.next_custom_id,
      });
      const rows = await trx('quickshare.resources')
        .where({ id: resourceId, revision: expectedRevision })
        .update({ ...next, revision: expectedRevision + 1, updated_at: trx.fn.now() })
        .returning('*');
      return rows[0] as ResourceRow;
    });
  try {
    const row = customId === null ? await retryShortCodeClaim(update) : await update();
    return mapResource(row, account.handle);
  } catch (error) {
    if (isUniqueViolation(error))
      throw new QuickShareDomainError(
        'custom_id_unavailable',
        'This custom ID is already in use for your handle.',
        409
      );
    throw error;
  }
};

export const deleteQuickShareResourceRecord = async (
  principal: QuickSharePrincipal,
  resourceId: string,
  confirmation: 'delete-draft' | 'delete-published' | undefined
) => {
  const account = await getQuickShareAccount(principal);
  if (!account)
    throw new QuickShareDomainError('account_missing', 'QuickShare account not found.', 404);
  const resource = await getDB()('quickshare.resources')
    .where({ id: resourceId, app_id: principal.appId, account_id: account.id })
    .first('ever_published');
  if (!resource) throw new QuickShareDomainError('resource_missing', 'Share not found.', 404);
  if (resource.ever_published && confirmation !== 'delete-published') {
    throw new QuickShareDomainError(
      'published_delete_confirmation_required',
      'Confirm permanent deletion of the account record and public shared information.',
      409
    );
  }
  if (!resource.ever_published && confirmation !== 'delete-draft') {
    throw new QuickShareDomainError(
      'delete_confirmation_required',
      'Confirm deletion before removing a share.',
      409
    );
  }
  return getDB()('quickshare.resources')
    .where({ id: resourceId, app_id: principal.appId, account_id: account.id })
    .delete();
};

const parseCustomId = (value: string) => {
  const normalized = normalizeQuickShareCustomId(value);
  const parsed = quickShareCustomIdSchema.safeParse(normalized);
  if (!parsed.success)
    throw new QuickShareDomainError(
      'invalid_custom_id',
      parsed.error.issues[0]?.message ?? 'Invalid custom ID',
      422
    );
  return parsed.data;
};

const isUniqueViolation = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: string }).code === '23505';

const isShortCodeCollision = (error: unknown) =>
  isUniqueViolation(error) &&
  (error as { constraint?: string }).constraint === 'uq_quickshare_route_claim_short';

const retryShortCodeClaim = async <T>(operation: () => Promise<T>) => {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isShortCodeCollision(error) || attempt === 3) throw error;
    }
  }
  throw new QuickShareDomainError(
    'short_code_exhausted',
    'Could not allocate a public short code.',
    503
  );
};
