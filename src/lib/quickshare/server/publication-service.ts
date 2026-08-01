import 'server-only';

import { randomUUID } from 'node:crypto';

import { getDB } from '@/42go/db';
import {
  getQuickShareAccount,
  QuickShareDomainError,
  type QuickSharePrincipal,
} from '@/lib/quickshare/server/account-service';
import {
  activateQuickShareFilesystemRelease,
  purgeQuickShareFilesystemResource,
  renameQuickShareFilesystemHandle,
} from '@/lib/quickshare/server/filesystem-publisher';
import type { QuickShareReleaseBundle } from '@/lib/quickshare/server/release-bundle';
import { hydrateQuickShareDraftContent } from '@/lib/quickshare/server/resource-service';
import type {
  QuickSharePublicIdentifier,
  QuickSharePublisher,
} from '@/lib/quickshare/server/publisher-contract';

type ResourcePublicationRow = {
  id: string;
  app_id: string;
  account_id: string;
  revision: number;
  current_draft_revision: number;
  next_identifier_kind: 'short' | 'custom';
  next_short_code: string | null;
  next_custom_id: string | null;
  published_identifier_kind: 'short' | 'custom' | null;
  published_short_code: string | null;
  published_custom_id: string | null;
  published_release_id: string | null;
  ever_published: boolean;
  type: string;
  title: string;
};

type LockedDraft = {
  revision: number;
  content: unknown;
  template_id: string | null;
  template_version: string | null;
  template_config: unknown;
};

const nextIdentifier = (row: ResourcePublicationRow, handle: string): QuickSharePublicIdentifier =>
  row.next_identifier_kind === 'short'
    ? { kind: 'short', shortCode: row.next_short_code! }
    : { kind: 'custom', handle, customId: row.next_custom_id! };

const publishedIdentifier = (
  row: ResourcePublicationRow,
  handle: string
): QuickSharePublicIdentifier | null => {
  if (!row.published_identifier_kind) return null;
  return row.published_identifier_kind === 'short'
    ? { kind: 'short', shortCode: row.published_short_code! }
    : { kind: 'custom', handle, customId: row.published_custom_id! };
};

export const quickShareFilesystemPublisher: QuickSharePublisher = {
  activate: async projection => {
    const result = await activateQuickShareFilesystemRelease({
      appId: projection.appId,
      accountId: projection.accountId,
      resourceId: projection.resourceId,
      releaseId: projection.releaseId,
      bundle: projection.bundle,
      previousIdentifier: projection.previousPublishedIdentifier,
      nextIdentifier: projection.nextPublishedIdentifier,
    });
    return { manifest: result.manifest, rollback: result.rollback };
  },
  purge: async input => purgeQuickShareFilesystemResource(input),
  renameAccountFolder: async input => renameQuickShareFilesystemHandle(input),
};

export const publishQuickShareRelease = async (
  principal: QuickSharePrincipal,
  resourceId: string,
  bundle:
    | QuickShareReleaseBundle
    | ((input: { type: string; title: string; draft: LockedDraft }) => QuickShareReleaseBundle),
  expectedDraftRevision?: number
) => {
  const account = await getQuickShareAccount(principal);
  if (!account)
    throw new QuickShareDomainError(
      'handle_required',
      'Complete handle onboarding before publishing.',
      409
    );
  const releaseId = randomUUID();
  const activation = {
    value: undefined as Awaited<ReturnType<QuickSharePublisher['activate']>> | undefined,
  };
  try {
    return await getDB().transaction(async trx => {
      const resource = await trx<ResourcePublicationRow>('quickshare.resources')
        .where({ id: resourceId, app_id: principal.appId, account_id: account.id })
        .forUpdate()
        .first();
      if (!resource) throw new QuickShareDomainError('resource_missing', 'Share not found.', 404);
      const draft = (await trx('quickshare.draft_revisions')
        .where({
          resource_id: resourceId,
          revision: resource.current_draft_revision,
          app_id: principal.appId,
        })
        .first('revision', 'content', 'template_id', 'template_version', 'template_config')) as
        LockedDraft | undefined;
      if (!draft)
        throw new QuickShareDomainError('draft_missing', 'The current draft is unavailable.', 409);
      if (expectedDraftRevision !== undefined && draft.revision !== expectedDraftRevision) {
        throw new QuickShareDomainError(
          'resource_stale_or_missing',
          'The draft changed before it could be published. Reload and try again.',
          409
        );
      }
      const completedBundle =
        typeof bundle === 'function'
          ? bundle({
              type: resource.type,
              title: resource.title,
              draft: {
                ...draft,
                content: hydrateQuickShareDraftContent(
                  resource.type as 'text' | 'markdown' | 'web-page' | 'template',
                  draft
                ),
              },
            })
          : bundle;
      const previous = publishedIdentifier(resource, account.handle);
      const next = nextIdentifier(resource, account.handle);
      activation.value = await quickShareFilesystemPublisher.activate({
        appId: principal.appId,
        accountId: account.id,
        resourceId,
        releaseId,
        draftRevision: resource.current_draft_revision,
        createdBy: principal.userId,
        bundle: completedBundle,
        previousPublishedIdentifier: previous,
        nextPublishedIdentifier: next,
      });
      const last = await trx('quickshare.release_versions')
        .where({ resource_id: resourceId })
        .max<{ max: string | null }>('release_number as max')
        .first();
      await trx('quickshare.release_versions').insert({
        id: releaseId,
        resource_id: resourceId,
        release_number: Number(last?.max ?? 0) + 1,
        draft_revision: resource.current_draft_revision,
        app_id: principal.appId,
        created_by: principal.userId,
      });
      if (!activation.value)
        throw new QuickShareDomainError(
          'publication_activation_missing',
          'Publication activation did not complete.',
          500
        );
      await trx('quickshare.release_manifests').insert({
        release_id: releaseId,
        manifest_version: activation.value.manifest.version,
        manifest: JSON.stringify(activation.value.manifest),
      });
      await trx('quickshare.release_assets').insert(
        activation.value.manifest.files.map(file => ({
          release_id: releaseId,
          asset_path: file.path,
          content_type: file.contentType,
          content_hash: file.sha256,
          byte_size: file.byteSize,
        }))
      );
      if (
        previous &&
        (previous.kind !== next.kind ||
          (previous.kind === 'short'
            ? previous.shortCode !== (next as { shortCode: string }).shortCode
            : previous.customId !== (next as { customId: string }).customId))
      ) {
        await trx('quickshare.resource_route_claims')
          .where({ resource_id: resourceId, state: 'published' })
          .delete();
        await trx('quickshare.resource_route_claims')
          .where({ resource_id: resourceId, state: 'candidate' })
          .update({ state: 'published' });
      } else if (!previous) {
        await trx('quickshare.resource_route_claims')
          .where({ resource_id: resourceId, state: 'candidate' })
          .update({ state: 'published' });
      }
      await trx('quickshare.resources').where({ id: resourceId }).update({
        lifecycle: 'published',
        ever_published: true,
        published_identifier_kind: resource.next_identifier_kind,
        published_short_code: resource.next_short_code,
        published_custom_id: resource.next_custom_id,
        published_release_id: releaseId,
        published_at: trx.fn.now(),
        unpublished_at: null,
        updated_at: trx.fn.now(),
      });
      return {
        releaseId,
        manifest: activation.value.manifest,
        previousPublishedIdentifier: previous,
        publishedIdentifier: next,
      };
    });
  } catch (error) {
    await activation.value?.rollback().catch(() => undefined);
    throw error;
  }
};

export const publishQuickShareCurrentDraft = async (
  principal: QuickSharePrincipal,
  resourceId: string,
  expectedDraftRevision: number,
  compile: (input: { type: string; title: string; content: unknown }) => QuickShareReleaseBundle
) =>
  publishQuickShareRelease(
    principal,
    resourceId,
    ({ type, title, draft }) => compile({ type, title, content: draft.content }),
    expectedDraftRevision
  );

export const unpublishQuickShareRelease = async (
  principal: QuickSharePrincipal,
  resourceId: string
) => {
  const account = await getQuickShareAccount(principal);
  if (!account)
    throw new QuickShareDomainError('account_missing', 'QuickShare account not found.', 404);
  const purge = {
    value: undefined as Awaited<ReturnType<QuickSharePublisher['purge']>> | undefined,
  };
  try {
    const result = await getDB().transaction(async trx => {
      const resource = await trx<ResourcePublicationRow>('quickshare.resources')
        .where({ id: resourceId, app_id: principal.appId, account_id: account.id })
        .forUpdate()
        .first();
      if (!resource) throw new QuickShareDomainError('resource_missing', 'Share not found.', 404);
      if (!resource.published_release_id) return { unpublished: false };
      purge.value = await quickShareFilesystemPublisher.purge({
        appId: principal.appId,
        accountId: account.id,
        resourceId,
        identifier: publishedIdentifier(resource, account.handle),
      });
      await trx('quickshare.resource_route_claims')
        .where({ resource_id: resourceId, state: 'published' })
        .delete();
      await trx('quickshare.resources').where({ id: resourceId }).update({
        lifecycle: 'unpublished',
        published_identifier_kind: null,
        published_short_code: null,
        published_custom_id: null,
        published_release_id: null,
        unpublished_at: trx.fn.now(),
        updated_at: trx.fn.now(),
      });
      return { unpublished: true };
    });
    await purge.value?.finalize();
    return result;
  } catch (error) {
    await purge.value?.rollback().catch(() => undefined);
    throw error;
  }
};

export const deleteQuickShareShare = async (
  principal: QuickSharePrincipal,
  resourceId: string,
  confirmation: 'delete-draft' | 'delete-published' | undefined
) => {
  const account = await getQuickShareAccount(principal);
  if (!account)
    throw new QuickShareDomainError('account_missing', 'QuickShare account not found.', 404);
  const purge = {
    value: undefined as Awaited<ReturnType<QuickSharePublisher['purge']>> | undefined,
  };
  try {
    await getDB().transaction(async trx => {
      // The same row lock used by publish/unpublish prevents a stale read from
      // deleting a newly published delivery projection.
      const resource = await trx<ResourcePublicationRow>('quickshare.resources')
        .where({ id: resourceId, app_id: principal.appId, account_id: account.id })
        .forUpdate()
        .first();
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
      const current = publishedIdentifier(resource, account.handle);
      if (current)
        purge.value = await quickShareFilesystemPublisher.purge({
          appId: principal.appId,
          accountId: account.id,
          resourceId,
          identifier: current,
        });
      // Release history references immutable draft revisions with RESTRICT so
      // ordinary draft retention can never erase an audit record. Permanent
      // resource deletion is the explicit terminal lifecycle operation: once
      // delivery is safely staged for purge, remove that resource's release
      // history first and let its manifest/assets cascade with it.
      await trx('quickshare.release_versions').where({ resource_id: resourceId }).delete();
      return trx('quickshare.resources')
        .where({ id: resourceId, app_id: principal.appId, account_id: account.id })
        .delete();
    });
    await purge.value?.finalize();
    return { deleted: true };
  } catch (error) {
    await purge.value?.rollback().catch(() => undefined);
    throw error;
  }
};
