import 'server-only';

import type { QuickShareReleaseBundle } from './release-bundle';
import {
  compileQuickShareMarkdown,
  compileQuickShareText,
  QuickShareCompilationError,
} from './text-markdown-compiler-core';
import { compileQuickShareWebPage } from './web-page-compiler-core';
import { compileQuickShareTemplate } from '@/lib/quickshare/templates/registry.server';

export { QuickShareCompilationError };

export const compileQuickShareResource = (input: {
  type: string;
  title: string;
  content: unknown;
}): QuickShareReleaseBundle => {
  if (input.type === 'text') return compileQuickShareText(input);
  if (input.type === 'markdown') return compileQuickShareMarkdown(input);
  if (input.type === 'web-page') return compileQuickShareWebPage(input);
  if (input.type === 'template') return compileQuickShareTemplate(input);
  throw new QuickShareCompilationError(
    'publisher_not_available',
    'This share type cannot be published yet.'
  );
};
