'use client';

import { Modal } from '@/42go/components/modal';
import { Panel } from '@/42go/components/panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, ExternalLink, LoaderCircle, Pencil } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

const normalizeCustomIdInput = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
const hasValidCustomIdShape = (value: string) =>
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value);

type QuickShareUrlProps = {
  resourceId: string;
  handle: string;
  publishedUrl: string | null;
  nextPublicUrl: string;
  nextIdentifierKind: 'short' | 'custom';
  nextCustomId: string | null;
  disabled?: boolean;
  onChange: (customId: string | null) => Promise<void>;
};

export const QuickShareUrl = ({
  resourceId,
  handle,
  publishedUrl,
  nextPublicUrl,
  nextIdentifierKind,
  nextCustomId,
  disabled = false,
  onChange,
}: QuickShareUrlProps) => {
  const inputId = useId();
  const errorId = useId();
  const helperId = useId();
  const [open, setOpen] = useState(false);
  const [draftCustomId, setDraftCustomId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<
    'idle' | 'checking' | 'available' | 'unavailable' | 'invalid' | 'error'
  >('idle');
  const isLive = publishedUrl === nextPublicUrl;
  const trimmedDraftCustomId = draftCustomId.trim();
  const previewUrl = (() => {
    if (!trimmedDraftCustomId) {
      if (nextIdentifierKind === 'short') return nextPublicUrl;
      try {
        return `${new URL(nextPublicUrl).origin}/[generated-id]`;
      } catch {
        return nextPublicUrl;
      }
    }
    try {
      const origin = new URL(nextPublicUrl).origin;
      return `${origin}/${encodeURIComponent(handle || '[handle]')}/${encodeURIComponent(trimmedDraftCustomId)}`;
    } catch {
      return nextPublicUrl;
    }
  })();
  const showCurrentPublishedUrl = Boolean(publishedUrl && publishedUrl !== previewUrl);
  const availabilityBlocksSave =
    Boolean(trimmedDraftCustomId) &&
    (availability === 'checking' ||
      availability === 'unavailable' ||
      availability === 'invalid');

  useEffect(() => {
    if (!open || !trimmedDraftCustomId || !hasValidCustomIdShape(trimmedDraftCustomId)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch(
        `/api/quickshare/${resourceId}?customId=${encodeURIComponent(trimmedDraftCustomId)}`,
        { credentials: 'same-origin', signal: controller.signal }
      )
        .then(async response => {
          const payload = await response.json().catch(() => ({}));
          if (!response.ok)
            throw new Error(payload.message ?? 'Could not check ID availability.');
          setAvailability(payload.availability?.available ? 'available' : 'unavailable');
        })
        .catch(reason => {
          if (reason instanceof DOMException && reason.name === 'AbortError') return;
          setAvailability('error');
        });
    }, 500);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, resourceId, trimmedDraftCustomId]);

  const openEditor = () => {
    const currentCustomId = nextIdentifierKind === 'custom' ? (nextCustomId ?? '') : '';
    setDraftCustomId(currentCustomId);
    setAvailability(currentCustomId ? 'checking' : 'idle');
    setError(null);
    setOpen(true);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (saving) return;
    setOpen(nextOpen);
  };

  const save = async () => {
    if (availabilityBlocksSave) return;
    const nextCustomIdValue = draftCustomId.trim() || null;
    const currentCustomId = nextIdentifierKind === 'custom' ? nextCustomId : null;
    if (nextCustomIdValue === currentCustomId) {
      setOpen(false);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onChange(nextCustomIdValue);
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'This custom ID is unavailable.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel as="section" padding="sm">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="min-w-0 break-all text-sm text-foreground">{nextPublicUrl}</p>
        <div
          role="group"
          aria-label="Share URL actions"
          className="flex shrink-0 items-center gap-1"
        >
          {isLive ? (
            <Button asChild variant="neutralGhost" size="icon">
              <a
                href={nextPublicUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Open share URL"
                title="Open share URL"
              >
                <ExternalLink className="size-4" />
              </a>
            </Button>
          ) : (
            <Button
              type="button"
              variant="neutralGhost"
              size="icon"
              disabled
              aria-label="Open share URL"
              title="Publish this URL before opening it"
            >
              <ExternalLink className="size-4" />
            </Button>
          )}
          <span aria-hidden="true" className="px-1 text-sm text-muted-foreground">
            ·
          </span>
          <Button
            type="button"
            variant="neutralGhost"
            size="icon"
            aria-label="Edit share URL"
            title="Edit share URL"
            disabled={disabled}
            onClick={openEditor}
          >
            <Pencil className="size-4" />
          </Button>
        </div>
      </div>

      <Modal
        open={open}
        onOpenChange={handleOpenChange}
        title="Customize URL"
        presentation="panel"
        anchor="right"
        size="md"
        showClose={false}
        closeOnOverlayClick={!saving}
        actions={
          <Button
            type="button"
            variant="link"
            className="h-9 px-2 md:hidden"
            disabled={saving || availabilityBlocksSave}
            onClick={() => void save()}
          >
            {saving ? 'Saving…' : 'Done'}
          </Button>
        }
        headerClassName="px-4 py-3 md:px-6 md:py-4"
        bodyClassName="px-4 py-4 md:px-5 md:py-5"
        footerClassName="hidden md:flex md:px-5 md:py-4"
        footer={
          <>
            <Button
              type="button"
              variant="neutralLink"
              disabled={saving}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving || availabilityBlocksSave}
              onClick={() => void save()}
            >
              {saving ? 'Saving…' : 'Save URL'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-3 text-sm">
            {showCurrentPublishedUrl && publishedUrl ? (
              <div className="space-y-1">
                <p className="font-medium">Current published URL</p>
                <a
                  href={publishedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block break-all text-primary underline-offset-4 hover:underline"
                >
                  {publishedUrl}
                </a>
              </div>
            ) : null}
            <div className="space-y-1">
              <p className="font-medium">URL</p>
              <p className="break-all text-muted-foreground">{previewUrl}</p>
            </div>
          </div>

          <div>
            <label htmlFor={inputId} className="text-sm font-medium">
              Custom ID
            </label>
            <div className="relative mt-2">
              <Input
                id={inputId}
                value={draftCustomId}
                onChange={event => {
                  const next = normalizeCustomIdInput(event.target.value);
                  setDraftCustomId(next);
                  setError(null);
                  setAvailability(
                    !next ? 'idle' : hasValidCustomIdShape(next) ? 'checking' : 'invalid'
                  );
                }}
                className="pr-10"
                placeholder="my-share"
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={80}
                pattern="[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
                enterKeyHint="done"
                aria-invalid={
                  Boolean(error) ||
                  availability === 'unavailable' ||
                  availability === 'invalid'
                }
                aria-describedby={`${helperId}${error ? ` ${errorId}` : ''}`}
                disabled={saving}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void save();
                  }
                }}
              />
              {availability === 'checking' ? (
                <LoaderCircle
                  aria-label="Checking ID availability"
                  className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
                />
              ) : availability === 'available' ? (
                <Check
                  aria-label="ID available"
                  className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-in text-primary fade-in zoom-in-75 duration-200 motion-reduce:animate-none"
                />
              ) : null}
            </div>
            <p
              id={helperId}
              role={availability === 'unavailable' || availability === 'invalid' ? 'alert' : undefined}
              className={`mt-2 text-xs leading-5 ${
                availability === 'unavailable' || availability === 'invalid'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }`}
            >
              {availability === 'unavailable'
                ? 'ID not available.'
                : availability === 'invalid'
                  ? 'Start and end with a letter or number.'
                  : availability === 'error'
                    ? 'Availability could not be checked. Saving will verify the ID.'
                    : 'Use 1–80 lowercase letters (a–z), numbers (0–9), or hyphens (-). Start and end with a letter or number. Leave blank for a generated short URL.'}
            </p>
            {error ? (
              <p id={errorId} role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </div>

          {publishedUrl ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <p className="font-medium text-destructive">Changing a published URL is disruptive.</p>
              <p className="mt-1 text-muted-foreground">
                The current URL stays live until you publish again. The next publish removes the
                old URL permanently. There are no redirects.
              </p>
            </div>
          ) : null}
        </div>
      </Modal>
    </Panel>
  );
};
