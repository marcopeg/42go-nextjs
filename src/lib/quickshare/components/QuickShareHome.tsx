'use client';

import { AppLayout } from '@/42go/layouts/app/AppLayout';
import { Modal } from '@/42go/components/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  quickShareResourceCatalog,
  type QuickShareResourceDefinition,
} from '@/lib/quickshare/resource-catalog';
import { buildQuickShareWebPagePreview } from '@/lib/quickshare/web-page-preview';
import {
  createQuickShareLinksPageCss,
  renderQuickShareLinksPageDocument,
  type QuickShareLinksPageConfig,
} from '@/lib/quickshare/templates/links-page';
import {
  FileCode2,
  Globe2,
  ImagePlus,
  LoaderCircle,
  MoveDown,
  MoveUp,
  Plus,
  Share2,
  Trash2,
  Upload,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { QuickShareCreateSplitButton } from '@/lib/quickshare/components/QuickShareCreateSplitButton';

type Account = { handle: string } | null;
type Resource = {
  id: string;
  type: 'text' | 'markdown' | 'web-page' | 'template';
  title: string;
  lifecycle: 'draft' | 'published' | 'unpublished';
  revision: number;
  publishedUrl: string | null;
  nextPublicUrl: string;
  nextIdentifierKind: 'short' | 'custom';
  nextCustomId: string | null;
  everPublished: boolean;
};
type TextDraft = { source: string };
type WebPageAsset = { path: string; contentType: string; data: string };
type WebPageDraft = { html: string; css: string; javascript: string; assets: WebPageAsset[] };
type TemplateDraft = {
  templateId: 'links-page';
  templateVersion: '1';
  config: QuickShareLinksPageConfig;
};
type ResourceDetail = Resource & {
  content: TextDraft | WebPageDraft | TemplateDraft;
  currentDraftRevision: number;
};

const isWebPageDraft = (value: ResourceDetail['content']): value is WebPageDraft => 'html' in value;
const isTemplateDraft = (value: ResourceDetail['content']): value is TemplateDraft =>
  'templateId' in value;
const defaultWebPageDraft = (): WebPageDraft => ({
  html: '<main>\n  <h1>Hello, QuickShare.</h1>\n</main>',
  css: 'body { margin: 0; padding: 2rem; font: 16px/1.5 system-ui, sans-serif; }',
  javascript: '',
  assets: [],
});
const defaultTemplateDraft = (): TemplateDraft => ({
  templateId: 'links-page',
  templateVersion: '1',
  config: {
    displayName: 'Your name',
    biography: 'A short introduction for your visitors.',
    links: [{ id: 'website', label: 'My website', url: 'https://example.com' }],
    visual: { theme: 'forest', buttonStyle: 'rounded', alignment: 'center' },
  },
});

const messageFrom = async (response: Response, fallback: string) => {
  const payload = await response.json().catch(() => ({}));
  return response.ok ? payload : Promise.reject(new Error(payload.message ?? fallback));
};

const urlState = (resource: Resource) => {
  if (!resource.publishedUrl)
    return (
      <p className="mt-2 break-all text-xs text-muted-foreground">
        Next public URL (not published): {resource.nextPublicUrl}
      </p>
    );
  if (resource.publishedUrl !== resource.nextPublicUrl)
    return (
      <div className="mt-2 space-y-1 break-all text-xs">
        <p className="text-foreground">Published URL: {resource.publishedUrl}</p>
        <p className="text-muted-foreground">
          Next public URL after Publish: {resource.nextPublicUrl}
        </p>
      </div>
    );
  return (
    <p className="mt-2 break-all text-xs text-muted-foreground">
      Published URL: {resource.publishedUrl}
    </p>
  );
};

export const QuickShareHome = () => {
  const [account, setAccount] = useState<Account>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selected, setSelected] = useState<ResourceDetail | null>(null);
  const [handle, setHandle] = useState('');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [webPage, setWebPage] = useState<WebPageDraft>(defaultWebPageDraft);
  const [template, setTemplate] = useState<TemplateDraft>(defaultTemplateDraft);
  const [customId, setCustomId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [unpublishOpen, setUnpublishOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch('/api/quickshare', { credentials: 'same-origin' });
    const payload = await messageFrom(response, 'Could not load QuickShare.');
    setAccount(payload.account);
    setResources(payload.resources ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    void fetch('/api/quickshare', { credentials: 'same-origin' })
      .then(response => messageFrom(response, 'Could not load QuickShare.'))
      .then(payload => {
        if (active) {
          setAccount(payload.account);
          setResources(payload.resources ?? []);
        }
      })
      .catch((reason: unknown) => {
        if (active)
          setError(reason instanceof Error ? reason.message : 'Could not load QuickShare.');
      });
    return () => {
      active = false;
    };
  }, []);

  const openResource = async (resource: Resource) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/quickshare/${resource.id}`, {
        credentials: 'same-origin',
      });
      const payload = await messageFrom(response, 'Could not open this share.');
      const detail = payload.resource as ResourceDetail;
      setSelected(detail);
      setTitle(detail.title);
      setSource(
        isWebPageDraft(detail.content) || isTemplateDraft(detail.content)
          ? ''
          : detail.content.source
      );
      setWebPage(isWebPageDraft(detail.content) ? detail.content : defaultWebPageDraft());
      setTemplate(isTemplateDraft(detail.content) ? detail.content : defaultTemplateDraft());
      setCustomId(detail.nextIdentifierKind === 'custom' ? (detail.nextCustomId ?? '') : '');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not open this share.');
    } finally {
      setBusy(false);
    }
  };

  const submitHandle = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/quickshare', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'claim-handle', handle }),
      });
      const payload = await messageFrom(response, 'Could not claim handle.');
      setAccount(payload.account);
      setHandle('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not claim handle.');
    } finally {
      setBusy(false);
    }
  };

  const create = async (definition: QuickShareResourceDefinition) => {
    setBusy(true);
    setError(null);
    try {
      const title =
        definition.id === 'text'
          ? 'Untitled text'
          : definition.id === 'markdown'
            ? 'Untitled Markdown'
            : definition.id === 'web-page'
              ? 'Untitled web page'
              : 'Untitled links page';
      const content =
        definition.createContent?.() ??
        (definition.id === 'web-page' ? defaultWebPageDraft() : { source: '' });
      const response = await fetch('/api/quickshare', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: definition.id, title, content }),
      });
      const payload = await messageFrom(response, 'Could not create a draft.');
      await refresh();
      await openResource(payload.resource as Resource);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create a draft.');
    } finally {
      setBusy(false);
    }
  };

  const replaceResource = (next: Resource) => {
    setResources(items => [next, ...items.filter(item => item.id !== next.id)]);
    if (selected?.id === next.id)
      setSelected(current => (current ? { ...current, ...next } : current));
  };

  const save = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const content =
        selected.type === 'web-page'
          ? webPage
          : selected.type === 'template'
            ? template
            : { source };
      const response = await fetch(`/api/quickshare/${selected.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          title,
          content,
          expectedRevision: selected.revision,
        }),
      });
      const payload = await messageFrom(response, 'Could not save this draft.');
      const next = payload.resource as ResourceDetail;
      setSelected(next);
      setTitle(next.title);
      setSource(
        isWebPageDraft(next.content) || isTemplateDraft(next.content) ? '' : next.content.source
      );
      setWebPage(isWebPageDraft(next.content) ? next.content : defaultWebPageDraft());
      setTemplate(isTemplateDraft(next.content) ? next.content : defaultTemplateDraft());
      replaceResource(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this draft.');
    } finally {
      setBusy(false);
    }
  };

  const setIdentifier = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/quickshare/${selected.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'set-identifier',
          customId: customId.trim() || null,
          expectedRevision: selected.revision,
        }),
      });
      const payload = await messageFrom(response, 'Could not update the public URL.');
      const next = payload.resource as Resource;
      replaceResource(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'This custom ID is unavailable.');
    } finally {
      setBusy(false);
    }
  };

  const action = async (body: object, fallback: string) => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/quickshare/${selected.id}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      await messageFrom(response, fallback);
      if ((body as { action?: string }).action === 'delete') {
        setSelected(null);
        await refresh();
        return;
      }
      await refresh();
      await openResource(selected);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : fallback);
    } finally {
      setBusy(false);
    }
  };

  const dirty = Boolean(
    selected &&
    (title !== selected.title ||
      (selected.type === 'web-page'
        ? JSON.stringify(webPage) !==
          JSON.stringify(
            isWebPageDraft(selected.content) ? selected.content : defaultWebPageDraft()
          )
        : selected.type === 'template'
          ? JSON.stringify(template) !==
            JSON.stringify(
              isTemplateDraft(selected.content) ? selected.content : defaultTemplateDraft()
            )
          : source !==
            (isWebPageDraft(selected.content) || isTemplateDraft(selected.content)
              ? ''
              : selected.content.source)))
  );
  const preview = useMemo(
    () =>
      selected?.type === 'markdown' ? (
        <ReactMarkdown>{source}</ReactMarkdown>
      ) : (
        <pre className="whitespace-pre-wrap break-words font-sans">{source}</pre>
      ),
    [selected?.type, source]
  );
  const webPreview = useMemo(() => buildQuickShareWebPagePreview(webPage), [webPage]);
  const templatePreview = useMemo(
    () =>
      renderQuickShareLinksPageDocument({
        config: template.config,
        title: title || 'Links page preview',
        cssHref: `data:text/css,${encodeURIComponent(createQuickShareLinksPageCss())}`,
        profileImageHref: template.config.profileImage
          ? `data:${template.config.profileImage.contentType};base64,${template.config.profileImage.data}`
          : undefined,
      }),
    [template, title]
  );

  const updateTemplateLink = (id: string, field: 'label' | 'url', value: string) =>
    setTemplate(current => ({
      ...current,
      config: {
        ...current.config,
        links: current.config.links.map(link =>
          link.id === id ? { ...link, [field]: value } : link
        ),
      },
    }));
  const moveTemplateLink = (index: number, delta: -1 | 1) =>
    setTemplate(current => {
      const target = index + delta;
      if (target < 0 || target >= current.config.links.length) return current;
      const links = [...current.config.links];
      [links[index], links[target]] = [links[target], links[index]];
      return { ...current, config: { ...current.config, links } };
    });
  const addTemplateLink = () =>
    setTemplate(current => ({
      ...current,
      config: {
        ...current.config,
        links: [
          ...current.config.links,
          { id: `link-${Date.now().toString(36)}`, label: 'New link', url: 'https://example.com' },
        ],
      },
    }));
  const setTemplateProfileImage = async (file: File | null) => {
    if (!file) return;
    if (!(['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as string[]).includes(file.type)) {
      setError('Choose a PNG, JPEG, WebP, or GIF profile image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Profile image must be 2 MiB or smaller.');
      return;
    }
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read this profile image.'));
      reader.onload = () =>
        typeof reader.result === 'string'
          ? resolve(reader.result.split(',', 2)[1] ?? '')
          : reject(new Error('Could not read this profile image.'));
      reader.readAsDataURL(file);
    });
    setTemplate(current => ({
      ...current,
      config: {
        ...current.config,
        profileImage: {
          contentType: file.type as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
          data,
          alt: `${current.config.displayName} profile image`,
        },
      },
    }));
  };

  const addAsset = async (file: File | null) => {
    if (!file) return;
    setError(null);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read this asset.'));
        reader.onload = () =>
          typeof reader.result === 'string'
            ? resolve(reader.result.split(',', 2)[1] ?? '')
            : reject(new Error('Could not read this asset.'));
        reader.readAsDataURL(file);
      });
      const name =
        file.name
          .toLowerCase()
          .replace(/[^a-z0-9._-]/g, '-')
          .replace(/^[-.]+/, '') || 'asset';
      const path = `assets/${name}`;
      setWebPage(current => ({
        ...current,
        assets: [
          ...current.assets.filter(asset => asset.path !== path),
          { path, contentType: file.type || 'application/octet-stream', data },
        ],
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not add this asset.');
    }
  };

  const CreateShareAction = () => (
    <QuickShareCreateSplitButton
      definitions={quickShareResourceCatalog}
      disabled={busy}
      onCreate={create}
    />
  );

  return (
    <AppLayout
      icon={Share2}
      title="QuickShare"
      subtitle="Publish when you are ready"
      actions={[{ type: 'component', component: CreateShareAction }]}
      policy={{ require: { feature: 'page:quickshare' } }}
    >
      <main className="mx-auto w-full max-w-6xl space-y-6 p-4 pb-24 md:p-6">
        {selected?.type === 'template' && (
          <Modal
            open
            onOpenChange={open => {
              if (!open) setSelected(null);
            }}
            title="Edit Links Page"
            subtitle={`Maintained template v${template.templateVersion} — pinned until an explicit upgrade`}
            presentation="panel"
            anchor="right"
            size="lg"
            footer={
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="neutralLink" onClick={() => setSelected(null)}>
                  Close
                </Button>
                <Button type="button" disabled={busy || !dirty} onClick={() => void save()}>
                  {busy ? 'Saving…' : 'Save draft'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || dirty}
                  onClick={() =>
                    void action(
                      { action: 'publish', expectedDraftRevision: selected.currentDraftRevision },
                      'Could not publish this draft.'
                    )
                  }
                >
                  Publish
                </Button>
                {selected.publishedUrl && (
                  <Button
                    type="button"
                    variant="destructiveOutline"
                    disabled={busy}
                    onClick={() => setUnpublishOpen(true)}
                  >
                    Unpublish
                  </Button>
                )}
                <Button
                  type="button"
                  variant="destructiveGhost"
                  disabled={busy}
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This template never changes automatically. Any future compatible upgrade must be
                explicitly accepted.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled
                title="No compatible upgrade is installed"
              >
                No template upgrade available
              </Button>
              <label className="block space-y-1 text-sm font-medium">
                Share title
                <Input value={title} onChange={event => setTitle(event.target.value)} />
              </label>
              <div className="space-y-2 rounded-md border p-3">
                <label className="block text-sm font-medium">
                  Custom ID <span className="font-normal text-muted-foreground">(optional)</span>
                  <Input
                    value={customId}
                    onChange={event => setCustomId(event.target.value)}
                    placeholder="my-links"
                  />
                </label>
                <p className="text-xs text-muted-foreground">
                  Changing an identifier removes the old URL on the next Publish. There are no
                  redirects.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void setIdentifier()}
                >
                  Use this URL
                </Button>
                {urlState(selected)}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm font-medium">
                  Display name
                  <Input
                    value={template.config.displayName}
                    onChange={event =>
                      setTemplate(current => ({
                        ...current,
                        config: { ...current.config, displayName: event.target.value },
                      }))
                    }
                  />
                </label>
                <label className="block space-y-1 text-sm font-medium">
                  Profile image{' '}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={event => {
                      void setTemplateProfileImage(event.target.files?.[0] ?? null);
                      event.currentTarget.value = '';
                    }}
                  />
                </label>
              </div>
              {template.config.profileImage && (
                <div className="flex items-center gap-3 rounded-md border p-3">
                  <ImagePlus className="size-4 text-primary" />
                  <label className="min-w-0 flex-1 text-sm font-medium">
                    Image alt text
                    <Input
                      value={template.config.profileImage.alt}
                      onChange={event =>
                        setTemplate(current =>
                          current.config.profileImage
                            ? {
                                ...current,
                                config: {
                                  ...current.config,
                                  profileImage: {
                                    ...current.config.profileImage,
                                    alt: event.target.value,
                                  },
                                },
                              }
                            : current
                        )
                      }
                    />
                  </label>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructiveGhost"
                    aria-label="Remove profile image"
                    onClick={() =>
                      setTemplate(current => ({
                        ...current,
                        config: { ...current.config, profileImage: undefined },
                      }))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
              <label className="block space-y-1 text-sm font-medium">
                Biography
                <Textarea
                  value={template.config.biography}
                  onChange={event =>
                    setTemplate(current => ({
                      ...current,
                      config: { ...current.config, biography: event.target.value },
                    }))
                  }
                  className="min-h-24"
                />
              </label>
              <fieldset className="grid gap-3 rounded-md border p-3 sm:grid-cols-3">
                <legend className="px-1 text-sm font-medium">Visual options</legend>
                <label className="text-sm font-medium">
                  Theme
                  <select
                    className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={template.config.visual.theme}
                    onChange={event =>
                      setTemplate(current => ({
                        ...current,
                        config: {
                          ...current.config,
                          visual: {
                            ...current.config.visual,
                            theme: event.target
                              .value as QuickShareLinksPageConfig['visual']['theme'],
                          },
                        },
                      }))
                    }
                  >
                    <option value="forest">Forest</option>
                    <option value="ocean">Ocean</option>
                    <option value="sunset">Sunset</option>
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Buttons
                  <select
                    className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={template.config.visual.buttonStyle}
                    onChange={event =>
                      setTemplate(current => ({
                        ...current,
                        config: {
                          ...current.config,
                          visual: {
                            ...current.config.visual,
                            buttonStyle: event.target
                              .value as QuickShareLinksPageConfig['visual']['buttonStyle'],
                          },
                        },
                      }))
                    }
                  >
                    <option value="rounded">Rounded</option>
                    <option value="pill">Pill</option>
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Alignment
                  <select
                    className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={template.config.visual.alignment}
                    onChange={event =>
                      setTemplate(current => ({
                        ...current,
                        config: {
                          ...current.config,
                          visual: {
                            ...current.config.visual,
                            alignment: event.target
                              .value as QuickShareLinksPageConfig['visual']['alignment'],
                          },
                        },
                      }))
                    }
                  >
                    <option value="center">Centered</option>
                    <option value="left">Left</option>
                  </select>
                </label>
              </fieldset>
              <div className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Ordered links</p>
                    <p className="text-xs text-muted-foreground">
                      Use arrows to reorder with mouse, touch, or keyboard.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={template.config.links.length >= 32}
                    onClick={addTemplateLink}
                  >
                    <Plus className="size-4" /> Add link
                  </Button>
                </div>
                <ol className="space-y-3">
                  {template.config.links.map((link, index) => (
                    <li
                      key={link.id}
                      className="grid gap-2 rounded border p-3 sm:grid-cols-[auto_1fr_1fr_auto]"
                    >
                      <span className="pt-2 text-xs text-muted-foreground">{index + 1}</span>
                      <Input
                        aria-label={`Link ${index + 1} label`}
                        value={link.label}
                        onChange={event => updateTemplateLink(link.id, 'label', event.target.value)}
                      />
                      <Input
                        aria-label={`Link ${index + 1} URL`}
                        value={link.url}
                        onChange={event => updateTemplateLink(link.id, 'url', event.target.value)}
                      />
                      <span className="flex gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="neutralGhost"
                          aria-label={`Move ${link.label} up`}
                          disabled={index === 0}
                          onClick={() => moveTemplateLink(index, -1)}
                        >
                          <MoveUp className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="neutralGhost"
                          aria-label={`Move ${link.label} down`}
                          disabled={index === template.config.links.length - 1}
                          onClick={() => moveTemplateLink(index, 1)}
                        >
                          <MoveDown className="size-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="destructiveGhost"
                          aria-label={`Remove ${link.label}`}
                          disabled={template.config.links.length === 1}
                          onClick={() =>
                            setTemplate(current => ({
                              ...current,
                              config: {
                                ...current.config,
                                links: current.config.links.filter(item => item.id !== link.id),
                              },
                            }))
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="rounded-md border bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Guided draft preview — not the published version
                </p>
                <iframe
                  title="Links Page draft preview"
                  sandbox=""
                  referrerPolicy="no-referrer"
                  srcDoc={templatePreview}
                  className="mt-2 min-h-96 w-full rounded border bg-background"
                />
              </div>
            </div>
          </Modal>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        {!account ? (
          <section className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Choose your QuickShare handle</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              It names custom share URLs. Changing it later changes every custom link.
            </p>
            <form onSubmit={submitHandle} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Input
                value={handle}
                onChange={event => setHandle(event.target.value)}
                aria-label="QuickShare handle"
                placeholder="your-handle"
                required
              />
              <Button type="submit" disabled={busy}>
                {busy ? 'Claiming…' : 'Claim handle'}
              </Button>
            </form>
          </section>
        ) : (
          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.6fr)]">
            <section className="min-w-0 space-y-3">
              <div>
                <div>
                  <h2 className="text-lg font-semibold">Your shares</h2>
                  <p className="text-xs text-muted-foreground">{account.handle}</p>
                </div>
              </div>
              {resources.length === 0 ? (
                <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
                  No shares yet. Create a draft. Nothing is public until you Publish.
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border bg-card">
                  {resources.map(resource => (
                    <button
                      key={resource.id}
                      type="button"
                      className="w-full border-b p-4 text-left last:border-b-0 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => void openResource(resource)}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate font-medium">{resource.title}</span>
                        <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium">
                          {resource.lifecycle}
                        </span>
                      </span>
                      <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        {resource.type === 'web-page' && <FileCode2 className="size-3" />}
                        {resource.type}
                      </span>
                      {urlState(resource)}
                    </button>
                  ))}
                </div>
              )}
            </section>
            <section className="min-w-0 rounded-lg border bg-card p-4 shadow-sm md:p-6">
              {!selected ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  <Globe2 className="mx-auto mb-3 size-8" />
                  Choose a share or create a new draft.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        {selected.type === 'web-page'
                          ? 'Web page draft'
                          : selected.type === 'markdown'
                            ? 'Markdown draft'
                            : 'Text draft'}
                      </p>
                      <h2 className="text-lg font-semibold">Edit your share</h2>
                    </div>
                    <span className="rounded-full border px-2 py-1 text-xs">
                      {selected.lifecycle}
                    </span>
                  </div>
                  <label className="block space-y-1 text-sm font-medium">
                    Title
                    <Input value={title} onChange={event => setTitle(event.target.value)} />
                  </label>
                  {selected.type === 'web-page' ? (
                    <div className="space-y-4">
                      <label className="block space-y-1 text-sm font-medium">
                        HTML
                        <Textarea
                          value={webPage.html}
                          onChange={event =>
                            setWebPage(current => ({ ...current, html: event.target.value }))
                          }
                          className="min-h-48 font-mono"
                          spellCheck={false}
                        />
                      </label>
                      <label className="block space-y-1 text-sm font-medium">
                        CSS
                        <Textarea
                          value={webPage.css}
                          onChange={event =>
                            setWebPage(current => ({ ...current, css: event.target.value }))
                          }
                          className="min-h-40 font-mono"
                          spellCheck={false}
                        />
                      </label>
                      <label className="block space-y-1 text-sm font-medium">
                        JavaScript
                        <Textarea
                          value={webPage.javascript}
                          onChange={event =>
                            setWebPage(current => ({ ...current, javascript: event.target.value }))
                          }
                          className="min-h-40 font-mono"
                          spellCheck={false}
                        />
                      </label>
                      <div className="space-y-3 rounded-md border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">Managed assets</p>
                            <p className="text-xs text-muted-foreground">
                              Use paths such as assets/photo.png in HTML or CSS. Files are private
                              until Publish.
                            </p>
                          </div>
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10">
                            <Upload className="size-4" /> Add asset
                            <input
                              type="file"
                              className="sr-only"
                              onChange={event => {
                                void addAsset(event.target.files?.[0] ?? null);
                                event.currentTarget.value = '';
                              }}
                            />
                          </label>
                        </div>
                        {webPage.assets.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No managed assets.</p>
                        ) : (
                          <ul className="divide-y rounded border">
                            {webPage.assets.map(asset => (
                              <li
                                key={asset.path}
                                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                              >
                                <span className="min-w-0 truncate font-mono">{asset.path}</span>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="destructiveGhost"
                                  aria-label={`Remove ${asset.path}`}
                                  onClick={() =>
                                    setWebPage(current => ({
                                      ...current,
                                      assets: current.assets.filter(
                                        item => item.path !== asset.path
                                      ),
                                    }))
                                  }
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="rounded-md border bg-muted/20 p-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          Sandboxed draft preview — it has no QuickShare account authority
                        </p>
                        <iframe
                          title="Sandboxed web-page draft preview"
                          sandbox="allow-scripts"
                          referrerPolicy="no-referrer"
                          srcDoc={webPreview}
                          className="mt-2 min-h-72 w-full rounded border bg-background"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <label className="block space-y-1 text-sm font-medium">
                        {selected.type === 'markdown' ? 'Markdown source' : 'Text source'}
                        <Textarea
                          value={source}
                          onChange={event => setSource(event.target.value)}
                          className="min-h-56 font-mono"
                        />
                      </label>
                      <div className="rounded-md border bg-muted/20 p-3">
                        <p className="text-xs font-medium text-muted-foreground">
                          Draft preview — not the published version
                        </p>
                        <div className="prose prose-sm mt-2 max-w-none break-words dark:prose-invert">
                          {preview}
                        </div>
                      </div>
                    </>
                  )}
                  <div className="space-y-2 rounded-md border p-3">
                    <label className="block text-sm font-medium">
                      Custom ID{' '}
                      <span className="font-normal text-muted-foreground">(optional)</span>
                      <Input
                        value={customId}
                        onChange={event => setCustomId(event.target.value)}
                        placeholder="my-share"
                      />
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Changing an identifier after publishing removes the old URL on the next
                      Publish. There are no redirects.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => void setIdentifier()}
                    >
                      Use this URL
                    </Button>
                    {urlState(selected)}
                  </div>
                  <div className="flex flex-wrap gap-2 border-t pt-4">
                    <Button type="button" disabled={busy || !dirty} onClick={() => void save()}>
                      {busy ? <LoaderCircle className="size-4 animate-spin" /> : null} Save draft
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy || dirty}
                      onClick={() =>
                        void action(
                          {
                            action: 'publish',
                            expectedDraftRevision: selected.currentDraftRevision,
                          },
                          'Could not publish this draft.'
                        )
                      }
                    >
                      Publish
                    </Button>
                    {selected.publishedUrl && (
                      <Button
                        type="button"
                        variant="destructiveOutline"
                        disabled={busy}
                        onClick={() => setUnpublishOpen(true)}
                      >
                        Unpublish
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="destructiveGhost"
                      disabled={busy}
                      onClick={() => setDeleteOpen(true)}
                    >
                      Delete
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {dirty
                      ? 'Save this draft before publishing. Saving never changes the public page.'
                      : 'Publishing is explicit. Saving never changes the public page.'}
                  </p>
                  <Modal
                    open={unpublishOpen}
                    onOpenChange={setUnpublishOpen}
                    title="Unpublish this share"
                    subtitle="This removes its public delivery output. Your account record and editable draft stay here."
                    size="sm"
                    footer={
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="neutralLink"
                          onClick={() => setUnpublishOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => {
                            setUnpublishOpen(false);
                            void action(
                              { action: 'unpublish', confirmed: true },
                              'Could not unpublish this share.'
                            );
                          }}
                        >
                          Unpublish
                        </Button>
                      </div>
                    }
                  >
                    <p className="text-sm text-muted-foreground">
                      Visitors will no longer reach this URL. You can publish the retained draft
                      again later.
                    </p>
                  </Modal>
                  <Modal
                    open={deleteOpen}
                    onOpenChange={setDeleteOpen}
                    title={
                      selected.everPublished
                        ? 'Permanently delete published information'
                        : 'Delete this draft'
                    }
                    subtitle={
                      selected.everPublished
                        ? 'This is disruptive. It permanently deletes the account record and shared information. Any current delivery output is removed first.'
                        : 'This permanently removes this draft from your account.'
                    }
                    size="sm"
                    footer={
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="neutralLink"
                          onClick={() => setDeleteOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={busy}
                          onClick={() => {
                            setDeleteOpen(false);
                            void action(
                              {
                                action: 'delete',
                                confirmation: selected.everPublished
                                  ? 'delete-published'
                                  : 'delete-draft',
                              },
                              'Could not delete this share.'
                            );
                          }}
                        >
                          Delete permanently
                        </Button>
                      </div>
                    }
                  >
                    <p className="text-sm text-muted-foreground">This cannot be undone.</p>
                  </Modal>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </AppLayout>
  );
};
