import { type z } from 'zod';

import {
  createQuickShareLinksPageConfig,
  quickShareLinksPageConfigSchema,
} from './links-page.ts';

export const quickShareTemplateId = 'links-page' as const;
export const quickShareLinksPageTemplateVersion = '1' as const;

export type QuickShareTemplateDraft = {
  templateId: string;
  templateVersion: string;
  config: unknown;
};

export type QuickShareTemplateCatalogEntry = {
  id: string;
  version: string;
  label: string;
  description: string;
  configuration: {
    profileImage: 'optional-managed-image';
    displayName: 'required';
    biography: 'optional';
    links: { ordered: true; maximum: number; urlSchemes: readonly ['http', 'https'] };
    visualOptions: readonly ['forest', 'ocean', 'sunset', 'rounded', 'pill', 'center', 'left'];
  };
  editor: { kind: string; form: readonly string[] };
  createDraft: () => QuickShareTemplateDraft;
  /** The same schema used by parseConfig and automation discovery. */
  configSchema: z.core.$ZodType;
  parseConfig: (value: unknown) => unknown;
};

export const quickShareTemplateCatalog: readonly QuickShareTemplateCatalogEntry[] = [
  {
    id: quickShareTemplateId,
    version: quickShareLinksPageTemplateVersion,
    label: 'Links Page',
    description: 'A polished profile and link hub, with no code required.',
    configuration: {
      profileImage: 'optional-managed-image',
      displayName: 'required',
      biography: 'optional',
      links: { ordered: true, maximum: 32, urlSchemes: ['http', 'https'] },
      visualOptions: ['forest', 'ocean', 'sunset', 'rounded', 'pill', 'center', 'left'],
    },
    editor: {
      kind: 'links-page',
      form: ['profileImage', 'displayName', 'biography', 'links', 'visual'],
    },
    configSchema: quickShareLinksPageConfigSchema,
    createDraft: () => ({
      templateId: quickShareTemplateId,
      templateVersion: quickShareLinksPageTemplateVersion,
      config: createQuickShareLinksPageConfig(),
    }),
    parseConfig: value => quickShareLinksPageConfigSchema.parse(value),
  },
] as const;

export const createQuickShareTemplateDraft = (): QuickShareTemplateDraft =>
  quickShareTemplateCatalog[0].createDraft();

export const parseQuickShareTemplateDraft = (value: unknown): QuickShareTemplateDraft => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Template draft must be an object.');
  const draft = value as Partial<QuickShareTemplateDraft>;
  const template = quickShareTemplateCatalog.find(
    entry => entry.id === draft.templateId && entry.version === draft.templateVersion
  );
  if (!template) {
    throw new Error('This template or template version is unavailable.');
  }
  return {
    templateId: template.id,
    templateVersion: template.version,
    config: template.parseConfig(draft.config),
  };
};
