import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import { quickShareResourceCatalog } from '../src/lib/quickshare/resource-catalog.ts';
import { validateQuickShareReleaseBundle } from '../src/lib/quickshare/server/release-bundle.ts';
import {
  compileQuickShareTemplate,
  quickShareTemplateImplementations,
  upgradeQuickShareTemplateDraft,
} from '../src/lib/quickshare/templates/registry.server.ts';
import {
  createQuickShareTemplateDraft,
  parseQuickShareTemplateDraft,
} from '../src/lib/quickshare/templates/catalog.ts';

describe('QuickShare maintained templates', () => {
  it('registers the Links Page as a creation choice with stable discovery metadata', () => {
    const choice = quickShareResourceCatalog.find(
      item => item.choiceId === 'template:links-page@1'
    );
    assert.equal(choice?.id, 'template');
    assert.equal(choice?.template?.id, 'links-page');
    assert.equal(choice?.template?.version, '1');
    assert.deepEqual(choice?.template?.configuration.links.urlSchemes, ['http', 'https']);
    assert.equal(
      (choice?.createContent?.() as { templateId?: string } | undefined)?.templateId,
      'links-page'
    );
    assert.equal(typeof quickShareTemplateImplementations['links-page@1']?.compile, 'function');
  });

  it('compiles deterministic, accessible, self-contained links output', () => {
    const draft = createQuickShareTemplateDraft();
    draft.config.displayName = '<Chuck & Co>';
    draft.config.biography = '<script>nope</script>';
    draft.config.links = [{ id: 'one', label: '<Launch>', url: 'https://example.com/a?x=1&y=2' }];
    const first = compileQuickShareTemplate({ title: 'Links', content: draft });
    const second = compileQuickShareTemplate({ title: 'Links', content: draft });
    assert.deepEqual(first.manifest, second.manifest);
    assert.equal(validateQuickShareReleaseBundle(first).manifest.entry, 'index.html');
    const html = first.files['index.html'].toString();
    assert.match(html, /&lt;Chuck &amp; Co&gt;/);
    assert.match(html, /&lt;script&gt;nope&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>nope/);
    assert.match(html, /<ol class="links" aria-label="Links">/);
    assert.match(html, /target="_blank" rel="noopener noreferrer"/);
    assert.match(html, /assets\/links-page\.[a-f0-9]{16}\.css/);
  });

  it('rejects executable URLs and keeps template versions pinned without a silent upgrade', () => {
    const draft = createQuickShareTemplateDraft();
    assert.throws(() =>
      parseQuickShareTemplateDraft({
        ...draft,
        config: {
          ...draft.config,
          links: [{ ...draft.config.links[0], url: 'javascript:alert(1)' }],
        },
      })
    );
    assert.throws(() => parseQuickShareTemplateDraft({ ...draft, templateVersion: '2' }));
    assert.throws(() => upgradeQuickShareTemplateDraft({ draft, targetVersion: '2' }));
    assert.deepEqual(parseQuickShareTemplateDraft(draft), draft);
  });

  it('persists template fields outside generic source content and routes template publishing through the shared compiler', async () => {
    const [service, publisher, compiler, editor] = await Promise.all([
      readFile('src/lib/quickshare/server/resource-service.ts', 'utf8'),
      readFile('src/lib/quickshare/server/publication-service.ts', 'utf8'),
      readFile('src/lib/quickshare/server/resource-compiler.ts', 'utf8'),
      readFile(
        'src/app/(app)/(quickshare)/quickshare/_components/QuickShareHome.tsx',
        'utf8'
      ),
    ]);
    assert.match(service, /template_id:/);
    assert.match(service, /template_version:/);
    assert.match(service, /template_config:/);
    assert.match(service, /hydrateQuickShareDraftContent/);
    assert.match(publisher, /hydrateQuickShareDraftContent/);
    assert.match(compiler, /input\.type === ['"]template['"]/);
    assert.match(editor, /Edit Links Page/);
    assert.match(editor, /Use arrows to reorder/);
    assert.match(editor, /expectedDraftRevision/);
  });
});
