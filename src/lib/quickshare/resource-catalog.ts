import { z } from 'zod';

import {
  quickShareTemplateCatalog,
  type QuickShareTemplateCatalogEntry,
} from './templates/catalog.ts';

export const quickShareResourceTypes = ['text', 'markdown', 'web-page', 'template'] as const;

export type QuickShareResourceType = (typeof quickShareResourceTypes)[number];

export const quickShareResourceTypeSchema = z.enum(quickShareResourceTypes);

export type QuickShareResourceDefinition = {
  choiceId: string;
  id: QuickShareResourceType;
  label: string;
  description: string;
  lifecycle: readonly ['draft', 'published', 'unpublished'];
  authoring: 'plain-text' | 'markdown' | 'web-page' | 'template';
  options?: readonly string[];
  template?: QuickShareTemplateCatalogEntry;
  createContent?: () => unknown;
};

/**
 * This is the one catalog used by browser authoring and future API discovery.
 * A type is registered only when its authoring and publication contract exists.
 */
export const quickShareResourceCatalog: readonly QuickShareResourceDefinition[] = [
  {
    choiceId: 'text',
    id: 'text',
    label: 'Text',
    description: 'A focused plain-text share.',
    lifecycle: ['draft', 'published', 'unpublished'],
    authoring: 'plain-text',
  },
  {
    choiceId: 'markdown',
    id: 'markdown',
    label: 'Markdown',
    description: 'A durable Markdown document.',
    lifecycle: ['draft', 'published', 'unpublished'],
    authoring: 'markdown',
  },
  {
    choiceId: 'web-page',
    id: 'web-page',
    label: 'Web Page',
    description: 'HTML, CSS, JavaScript, and managed static assets.',
    lifecycle: ['draft', 'published', 'unpublished'],
    authoring: 'web-page',
    options: ['html', 'css', 'javascript', 'managed-assets'],
  },
  ...quickShareTemplateCatalog.map(template => ({
    choiceId: `template:${template.id}@${template.version}`,
    id: 'template' as const,
    label: template.label,
    description: template.description,
    lifecycle: ['draft', 'published', 'unpublished'] as const,
    authoring: 'template' as const,
    options: ['guided-configuration', 'pinned-version', 'explicit-upgrade'],
    template,
    createContent: template.createDraft,
  })),
] as const;

export const getQuickShareResourceDefinition = (type: string) =>
  quickShareResourceCatalog.find(definition => definition.id === type) ?? null;

export const getQuickShareResourceCreationChoice = (choiceId: string) =>
  quickShareResourceCatalog.find(definition => definition.choiceId === choiceId) ?? null;

export const isQuickShareCreatableResourceType = (type: string): type is QuickShareResourceType =>
  getQuickShareResourceDefinition(type) !== null;
