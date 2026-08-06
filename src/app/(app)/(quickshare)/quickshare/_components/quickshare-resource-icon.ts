import { FileText, FileType2, Globe2, LayoutTemplate, type LucideIcon } from 'lucide-react';

import type { QuickShareResourceDefinition } from '@/lib/quickshare/resource-catalog';

export const getQuickShareResourceIcon = (
  definition: QuickShareResourceDefinition
): LucideIcon => {
  if (definition.id === 'web-page') return Globe2;
  if (definition.id === 'template') return LayoutTemplate;
  if (definition.id === 'markdown') return FileType2;
  return FileText;
};
