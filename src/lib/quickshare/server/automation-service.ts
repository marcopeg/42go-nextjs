import 'server-only';

import type { z } from 'zod';

import type { QuickShareApiPrincipal } from '@/lib/quickshare/server/api-token-store';
import {
  quickShareAutomationRequestSchemas,
  validateQuickShareAutomationContent,
} from '@/lib/quickshare/server/automation-contract';
import {
  createQuickShareResource,
  getQuickShareResource,
  listQuickShareResources,
  saveQuickShareResourceDraft,
  updateQuickShareResourceIdentifier,
} from '@/lib/quickshare/server/resource-service';
import {
  deleteQuickShareShare,
  publishQuickShareCurrentDraft,
  unpublishQuickShareRelease,
} from '@/lib/quickshare/server/publication-service';
import { compileQuickShareResource } from '@/lib/quickshare/server/resource-compiler';

export type QuickShareAutomationPrincipal = QuickShareApiPrincipal;

type CreateInput = z.infer<typeof quickShareAutomationRequestSchemas.create>;
type SaveInput = z.infer<typeof quickShareAutomationRequestSchemas.save>;
type IdentifierInput = z.infer<typeof quickShareAutomationRequestSchemas.identifier>;
type PublishInput = z.infer<typeof quickShareAutomationRequestSchemas.publish>;
type DeleteInput = z.infer<typeof quickShareAutomationRequestSchemas.delete>;

const toDomainPrincipal = (principal: QuickShareAutomationPrincipal) => ({
  appId: principal.appId,
  userId: principal.userId,
});

export const createQuickShareAutomationResource = async (
  principal: QuickShareAutomationPrincipal,
  input: CreateInput
) =>
  createQuickShareResource(toDomainPrincipal(principal), {
    ...input,
    content:
      input.content === undefined
        ? undefined
        : validateQuickShareAutomationContent(input.type, input.content),
  });

export const getQuickShareAutomationResource = async (
  principal: QuickShareAutomationPrincipal,
  resourceId: string
) => getQuickShareResource(toDomainPrincipal(principal), resourceId);

export const saveQuickShareAutomationResource = async (
  principal: QuickShareAutomationPrincipal,
  resourceId: string,
  input: SaveInput
) => {
  const current = await getQuickShareResource(toDomainPrincipal(principal), resourceId);
  return saveQuickShareResourceDraft(toDomainPrincipal(principal), resourceId, {
    ...input,
    content: validateQuickShareAutomationContent(current.type, input.content),
  });
};

export const setQuickShareAutomationIdentifier = async (
  principal: QuickShareAutomationPrincipal,
  resourceId: string,
  input: IdentifierInput
) =>
  updateQuickShareResourceIdentifier(
    toDomainPrincipal(principal),
    resourceId,
    input.customId,
    input.expectedRevision
  );

export const publishQuickShareAutomationResource = async (
  principal: QuickShareAutomationPrincipal,
  resourceId: string,
  input: PublishInput
) => {
  await publishQuickShareCurrentDraft(
    toDomainPrincipal(principal),
    resourceId,
    input.expectedDraftRevision,
    compileQuickShareResource
  );
  return getQuickShareResource(toDomainPrincipal(principal), resourceId);
};

export const unpublishQuickShareAutomationResource = async (
  principal: QuickShareAutomationPrincipal,
  resourceId: string
) => {
  await unpublishQuickShareRelease(toDomainPrincipal(principal), resourceId);
  return getQuickShareResource(toDomainPrincipal(principal), resourceId);
};

export const deleteQuickShareAutomationResource = async (
  principal: QuickShareAutomationPrincipal,
  resourceId: string,
  input: DeleteInput
) => deleteQuickShareShare(toDomainPrincipal(principal), resourceId, input.confirmation);

export const listQuickShareAutomationResources = async (
  principal: QuickShareAutomationPrincipal
) => listQuickShareResources(toDomainPrincipal(principal));
