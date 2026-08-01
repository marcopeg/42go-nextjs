import 'server-only';

import { z } from 'zod';

import {
  quickShareResourceCatalog,
  quickShareResourceTypeSchema,
} from '@/lib/quickshare/resource-catalog';
import { quickShareTemplateCatalog } from '@/lib/quickshare/templates/catalog';
import { quickShareCustomIdSchema } from '@/lib/quickshare/server/validation';
import {
  quickShareWebPageAssetContentTypes,
  quickShareWebPageBase64Pattern,
  quickShareWebPageLimits,
} from '@/lib/quickshare/server/web-page-compiler-core';

export const QUICKSHARE_AUTOMATION_CONTRACT_VERSION = '2026-08-01' as const;

const titleSchema = z.string().trim().min(1).max(160);
const revisionSchema = z.number().int().positive();
const resourceIdSchema = z.string().uuid();
const sourceContentSchema = z.object({ source: z.string().max(500_000) }).strict();
const webPageContentSchema = z
  .object({
    html: z.string().max(quickShareWebPageLimits.htmlCharacters),
    css: z.string().max(quickShareWebPageLimits.cssCharacters),
    javascript: z.string().max(quickShareWebPageLimits.javascriptCharacters),
    assets: z
      .array(
        z
          .object({
            path: z.string().regex(/^assets\/[A-Za-z0-9][A-Za-z0-9._-]*$/),
            contentType: z.enum(quickShareWebPageAssetContentTypes),
            data: z.string().regex(quickShareWebPageBase64Pattern),
          })
          .strict()
      )
      .max(quickShareWebPageLimits.assetCount),
  })
  .strict();
const templateContentSchema = z
  .object({
    templateId: z.string().min(1),
    templateVersion: z.string().min(1),
    config: z.unknown(),
  })
  .strict();

export const quickShareAutomationContentSchemas = {
  text: sourceContentSchema,
  markdown: sourceContentSchema,
  'web-page': webPageContentSchema,
  template: templateContentSchema,
} as const;

/**
 * These schemas are the boundary used by the v1 routes and serialized by
 * discovery. Resource content is deliberately handed to the authoritative
 * type compiler/parser after this envelope has been validated.
 */
export const quickShareAutomationRequestSchemas = {
  create: z
    .object({
      type: quickShareResourceTypeSchema,
      title: titleSchema.optional(),
      content: z.unknown().optional(),
      customId: quickShareCustomIdSchema.optional(),
    })
    .strict(),
  save: z
    .object({
      title: titleSchema,
      content: z.unknown(),
      expectedRevision: revisionSchema,
    })
    .strict(),
  identifier: z
    .object({
      customId: quickShareCustomIdSchema.nullable(),
      expectedRevision: revisionSchema,
      confirmed: z.literal(true).optional(),
    })
    .strict(),
  publish: z
    .object({ expectedDraftRevision: revisionSchema })
    .strict(),
  unpublish: z
    .object({ confirmed: z.literal(true) })
    .strict(),
  delete: z
    .object({ confirmation: z.enum(['delete-draft', 'delete-published']) })
    .strict(),
  resourceId: resourceIdSchema,
  pagination: z
    .object({
      limit: z.coerce.number().int().min(1).max(100).default(50),
      cursor: z.string().min(1).max(512).optional(),
    })
    .strict(),
} as const;

export const validateQuickShareAutomationContent = (type: string, content: unknown) => {
  const schema = quickShareAutomationContentSchemas[
    type as keyof typeof quickShareAutomationContentSchemas
  ];
  if (!schema) return content;
  return schema.parse(content);
};

const resourceSchema = z.object({
  id: resourceIdSchema,
  type: quickShareResourceTypeSchema,
  title: titleSchema,
  lifecycle: z.enum(['draft', 'published', 'unpublished']),
  revision: revisionSchema,
  publishedUrl: z.string().url().nullable(),
  nextPublicUrl: z.string().url(),
  nextIdentifierKind: z.enum(['short', 'custom']),
  nextCustomId: z.string().nullable(),
  everPublished: z.boolean(),
});

const resourceDetailSchema = resourceSchema.extend({
  content: z.unknown(),
  currentDraftRevision: revisionSchema,
});

const discoverySchema = (schema: z.core.$ZodType) =>
  z.toJSONSchema(schema, { target: 'draft-2020-12' });

type QuickShareAutomationOperation = {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  request?: z.core.$ZodType;
  pathParameters?: Record<string, z.core.$ZodType>;
  response: z.core.$ZodType;
  effects?: { destructive?: boolean; disruptive?: boolean; confirmation?: string };
};

const resourcePathParameters = { resourceId: resourceIdSchema } as const;

const operations: readonly QuickShareAutomationOperation[] = [
  {
    id: 'resources.list',
    method: 'GET',
    path: '/api/quickshare/v1/resources{?limit,cursor}',
    summary: 'List only the bearer token owner\'s QuickShare resources.',
    request: quickShareAutomationRequestSchemas.pagination,
    response: z.object({ resources: z.array(resourceSchema), nextCursor: z.string().nullable() }),
  },
  {
    id: 'resources.create',
    method: 'POST',
    path: '/api/quickshare/v1/resources',
    summary: 'Create an unpublished draft. type is required and explicit.',
    request: quickShareAutomationRequestSchemas.create,
    response: z.object({ resource: resourceSchema }),
  },
  {
    id: 'resources.read',
    method: 'GET',
    path: '/api/quickshare/v1/resources/{resourceId}',
    summary: 'Read one owner-scoped resource and its current draft.',
    response: z.object({ resource: resourceDetailSchema }),
    pathParameters: resourcePathParameters,
  },
  {
    id: 'resources.save',
    method: 'PATCH',
    path: '/api/quickshare/v1/resources/{resourceId}',
    summary: 'Save a new immutable draft revision. Saving never publishes.',
    request: quickShareAutomationRequestSchemas.save,
    response: z.object({ resource: resourceDetailSchema }),
    pathParameters: resourcePathParameters,
  },
  {
    id: 'resources.set-identifier',
    method: 'POST',
    path: '/api/quickshare/v1/resources/{resourceId}/identifier',
    summary: 'Configure the next short-code or custom-ID public route.',
    request: quickShareAutomationRequestSchemas.identifier,
    response: z.object({ resource: resourceSchema }),
    pathParameters: resourcePathParameters,
    effects: {
      disruptive: true,
      confirmation: 'For a published resource, show both publishedUrl and nextPublicUrl before confirmation. No redirects are created.',
    },
  },
  {
    id: 'resources.publish',
    method: 'POST',
    path: '/api/quickshare/v1/resources/{resourceId}/publish',
    summary: 'Compile the exact draft revision and atomically activate its static delivery output.',
    request: quickShareAutomationRequestSchemas.publish,
    response: z.object({ resource: resourceDetailSchema }),
    pathParameters: resourcePathParameters,
    effects: { disruptive: true, confirmation: 'Publishing a pending identifier change removes the old public route.' },
  },
  {
    id: 'resources.unpublish',
    method: 'POST',
    path: '/api/quickshare/v1/resources/{resourceId}/unpublish',
    summary: 'Purge public delivery while retaining the account draft.',
    request: quickShareAutomationRequestSchemas.unpublish,
    response: z.object({ resource: resourceDetailSchema }),
    pathParameters: resourcePathParameters,
    effects: {
      disruptive: true,
      confirmation: 'Unpublish removes the public route and delivery output but keeps the draft.',
    },
  },
  {
    id: 'resources.delete',
    method: 'DELETE',
    path: '/api/quickshare/v1/resources/{resourceId}',
    summary: 'Purge delivery if present, then permanently delete the database record.',
    request: quickShareAutomationRequestSchemas.delete,
    response: z.object({ deleted: z.literal(true) }),
    pathParameters: resourcePathParameters,
    effects: {
      destructive: true,
      disruptive: true,
      confirmation: 'Use delete-draft for never-published resources and delete-published for any resource that was ever public.',
    },
  },
  {
    id: 'discovery.get',
    method: 'GET',
    path: '/api/quickshare/v1/discovery',
    summary: 'Read the effective, token-authenticated v1 automation contract.',
    response: z.object({ contractVersion: z.string(), operations: z.array(z.unknown()) }),
  },
] as const;

export const getQuickShareAutomationDiscovery = () => ({
  contractVersion: QUICKSHARE_AUTOMATION_CONTRACT_VERSION,
  authentication: {
    scheme: 'Bearer',
    header: 'Authorization: Bearer <personal-token>',
    browserCookiesAccepted: false,
  },
  resourceTypes: quickShareResourceCatalog.map(definition => ({
    id: definition.id,
    choiceId: definition.choiceId,
    label: definition.label,
    description: definition.description,
    lifecycle: definition.lifecycle,
    authoring: definition.authoring,
    options: definition.options ?? [],
    available: true,
    deprecated: false,
    replacement: null,
    removalAt: null,
    contentSchema: discoverySchema(quickShareAutomationContentSchemas[definition.id]),
    defaultContent: definition.createContent?.() ??
      (definition.id === 'web-page'
        ? { html: '<main>…</main>', css: '', javascript: '', assets: [] }
        : definition.id === 'template'
          ? quickShareTemplateCatalog[0].createDraft()
          : { source: '' }),
  })),
  templates: quickShareTemplateCatalog.map(template => ({
    id: template.id,
    version: template.version,
    label: template.label,
    description: template.description,
    configuration: template.configuration,
    configurationSchema: discoverySchema(template.configSchema),
    editor: template.editor,
    available: true,
    deprecated: false,
    replacement: null,
    removalAt: null,
  })),
  limits: {
    titleCharacters: 160,
    textOrMarkdownCharacters: 500_000,
    customIdCharacters: { min: 1, max: 80 },
    webPage: quickShareWebPageLimits,
    pagination: { default: 50, maximum: 100 },
  },
  errors: [
    { code: 'unauthorized', status: 401, retryable: false },
    { code: 'invalid_payload', status: 422, retryable: false },
    { code: 'resource_missing', status: 404, retryable: false },
    { code: 'resource_stale_or_missing', status: 409, retryable: true },
    { code: 'custom_id_unavailable', status: 409, retryable: false },
    { code: 'published_delete_confirmation_required', status: 409, retryable: false },
    { code: 'quickshare_error', status: 500, retryable: true },
  ],
  operations: operations.map(operation => ({
    id: operation.id,
    method: operation.method,
    path: operation.path,
    summary: operation.summary,
    request: operation.request ? discoverySchema(operation.request) : null,
    pathParameters: operation.pathParameters
      ? Object.fromEntries(
          Object.entries(operation.pathParameters).map(([name, schema]) => [
            name,
            discoverySchema(schema),
          ])
        )
      : {},
    response: discoverySchema(operation.response),
    effects: operation.effects ?? { destructive: false, disruptive: false },
    available: true,
    deprecated: false,
    replacement: null,
    removalAt: null,
  })),
});

export const getQuickShareAutomationOperationIds = () => operations.map(operation => operation.id);
