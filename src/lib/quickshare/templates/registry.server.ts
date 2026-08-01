import { createHash } from 'node:crypto';

import type { QuickShareReleaseBundle } from '../server/release-bundle.ts';
import { QuickShareCompilationError } from '../server/text-markdown-compiler-core.ts';
import {
  quickShareTemplateCatalog,
  parseQuickShareTemplateDraft,
  type QuickShareTemplateDraft,
} from './catalog.ts';
import {
  createQuickShareLinksPageCss,
  renderQuickShareLinksPageDocument,
  type QuickShareLinksPageConfig,
} from './links-page.ts';

const sha256 = (content: Buffer | string) => createHash('sha256').update(content).digest('hex');
const extensionFor = (contentType: string) =>
  ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' })[
    contentType
  ] ?? 'bin';

const manifestFor = (files: Record<string, Buffer>) => ({
  version: 'quickshare.release/v1' as const,
  entry: 'index.html' as const,
  files: Object.entries(files)
    .sort(([left], [right]) =>
      left === 'index.html' ? -1 : right === 'index.html' ? 1 : left.localeCompare(right)
    )
    .map(([filePath, content]) => ({
      path: filePath,
      contentType:
        filePath === 'index.html'
          ? 'text/html; charset=utf-8'
          : filePath.endsWith('.css')
            ? 'text/css; charset=utf-8'
            : `image/${filePath.split('.').pop() === 'jpg' ? 'jpeg' : filePath.split('.').pop()}`,
      sha256: sha256(content),
      byteSize: content.byteLength,
    })),
});

type QuickShareLinksPageDraft = QuickShareTemplateDraft & { config: QuickShareLinksPageConfig };

const compileQuickShareLinksPageTemplate = (
  input: {
    title: string;
    content: unknown;
  },
  draft: QuickShareLinksPageDraft
): QuickShareReleaseBundle => {
  const css = Buffer.from(createQuickShareLinksPageCss(), 'utf8');
  const cssPath = `assets/links-page.${sha256(css).slice(0, 16)}.css`;
  const files: Record<string, Buffer> = { [cssPath]: css };
  let profileImageHref: string | undefined;
  if (draft.config.profileImage) {
    const image = Buffer.from(draft.config.profileImage.data, 'base64');
    if (image.byteLength > 2 * 1024 * 1024)
      throw new QuickShareCompilationError(
        'profile_image_too_large',
        'Profile image must be 2 MiB or smaller.'
      );
    const imagePath = `assets/profile.${sha256(image).slice(0, 16)}.${extensionFor(draft.config.profileImage.contentType)}`;
    files[imagePath] = image;
    profileImageHref = imagePath;
  }
  files['index.html'] = Buffer.from(
    renderQuickShareLinksPageDocument({
      config: draft.config,
      title: input.title,
      cssHref: cssPath,
      profileImageHref,
    }),
    'utf8'
  );
  return { manifest: manifestFor(files), files };
};

export const quickShareTemplateImplementations: Readonly<
  Record<
    string,
    {
      compile: (
        input: { title: string; content: unknown },
        draft: QuickShareTemplateDraft
      ) => QuickShareReleaseBundle;
      upgrade?: (draft: QuickShareTemplateDraft, targetVersion: string) => QuickShareTemplateDraft;
    }
  >
> = {
  'links-page@1': {
    compile: (input, draft) =>
      compileQuickShareLinksPageTemplate(input, draft as QuickShareLinksPageDraft),
  },
};

export const compileQuickShareTemplate = (input: {
  title: string;
  content: unknown;
}): QuickShareReleaseBundle => {
  let draft: QuickShareTemplateDraft;
  try {
    draft = parseQuickShareTemplateDraft(input.content);
  } catch (error) {
    throw new QuickShareCompilationError(
      'invalid_template_draft',
      error instanceof Error ? error.message : 'Invalid template draft.'
    );
  }
  const implementation =
    quickShareTemplateImplementations[`${draft.templateId}@${draft.templateVersion}`];
  if (!implementation)
    throw new QuickShareCompilationError(
      'template_implementation_missing',
      'This maintained template implementation is unavailable.'
    );
  return implementation.compile(input, draft);
};

export const getQuickShareTemplateCatalog = () => quickShareTemplateCatalog;

export const upgradeQuickShareTemplateDraft = (input: {
  draft: unknown;
  targetVersion: string;
}) => {
  const current = parseQuickShareTemplateDraft(input.draft);
  if (current.templateVersion === input.targetVersion) return current;
  const implementation =
    quickShareTemplateImplementations[`${current.templateId}@${current.templateVersion}`];
  if (implementation?.upgrade) return implementation.upgrade(current, input.targetVersion);
  throw new QuickShareCompilationError(
    'template_upgrade_unavailable',
    'No compatible upgrade is available for this template version.'
  );
};
