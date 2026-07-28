"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FilePenLine,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Send,
  Trash2,
  Users,
} from "lucide-react";

import { DisplayDate } from "@/42go/components/DisplayDate";
import { Modal } from "@/42go/components/modal";
import { Panel } from "@/42go/components/panel";
import {
  REACTION_TEMPLATES,
  type AudienceMode,
  type Communication,
  type CommunicationKind,
  type CommunicationStyle,
  type InputConfig,
  type PollConfig,
  type ReactionTemplate,
} from "@/42go/communications";
import { AppLayout } from "@/42go/layouts/app";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AudienceUser = {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
};

type Details = {
  communication: Communication;
  audienceUsers: AudienceUser[];
  metrics: { eligible: number; displayed: number; responded: number };
  displays: Array<AudienceUser & { firstDisplayedAt: string; lastDisplayedAt: string; displayCount: string }>;
  responses: Array<AudienceUser & { reaction: string | null; response: unknown; skipped: boolean; respondedAt: string }>;
};

type Draft = {
  kind: CommunicationKind;
  style: CommunicationStyle;
  priority: 0 | 5 | 10;
  audienceMode: AudienceMode;
  audienceUserIds: string[];
  title: string;
  subject: string;
  bodyMarkdown: string;
  linkUrl: string;
  mediaUrl: string;
  mediaType: "image" | "video" | null;
  reactionTemplate: ReactionTemplate | null;
  availableFrom: string;
  availableUntil: string;
  interactionConfig: Record<string, unknown>;
};

const blankDraft = (kind: CommunicationKind): Draft => ({
  kind,
  style: "info",
  priority: 5,
  audienceMode: "everyone",
  audienceUserIds: [],
  title: "",
  subject: "",
  bodyMarkdown: "",
  linkUrl: "",
  mediaUrl: "",
  mediaType: null,
  reactionTemplate: kind === "notification" ? "acknowledge" : null,
  availableFrom: "",
  availableUntil: "",
  interactionConfig:
    kind === "poll"
      ? {
          selection: "single",
          required: false,
          allowOther: false,
          allowNotes: false,
          options: [
            { id: crypto.randomUUID(), label: "" },
            { id: crypto.randomUUID(), label: "" },
          ],
        }
      : kind === "input"
        ? { inputType: "short", required: true }
        : {},
});

const toLocalDate = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const communicationToDraft = (
  item: Communication,
  users: AudienceUser[]
): Draft => ({
  kind: item.kind,
  style: item.style,
  priority: (item.priority ?? 5) as 0 | 5 | 10,
  audienceMode: item.audienceMode,
  audienceUserIds: users.map((user) => user.id),
  title: item.title || "",
  subject: item.subject || "",
  bodyMarkdown: item.bodyMarkdown || "",
  linkUrl: item.linkUrl || "",
  mediaUrl: item.mediaUrl || "",
  mediaType: item.mediaType,
  reactionTemplate: item.reactionTemplate,
  availableFrom: toLocalDate(item.availableFrom),
  availableUntil: toLocalDate(item.availableUntil),
  interactionConfig: item.interactionConfig,
});

const api = async <T,>(
  method: string,
  body?: unknown,
  query = ""
): Promise<T> => {
  const res = await fetch(`/api/backoffice/notifications${query}`, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await res.json().catch(() => null)) as T & { message?: string };
  if (!res.ok) throw new Error(payload?.message || "Notification request failed.");
  return payload;
};

const kindMeta = {
  notification: { label: "Notification", Icon: Bell },
  poll: { label: "Poll", Icon: ListChecks },
  input: { label: "Input", Icon: MessageSquareText },
  email: { label: "Email", Icon: Mail },
};

const getStatus = (item: Communication) => {
  const now = Date.now();
  if (item.abortedAt) return { label: "Aborted", Icon: Ban };
  if (!item.publishedAt) return { label: "Draft", Icon: FilePenLine };
  if (item.availableFrom && new Date(item.availableFrom).getTime() > now) {
    return { label: "Scheduled", Icon: CalendarClock };
  }
  if (item.availableUntil && new Date(item.availableUntil).getTime() <= now) {
    return { label: "Expired", Icon: Clock3 };
  }
  return { label: "Active", Icon: CheckCircle2 };
};

const statusDate = (item: Communication) =>
  item.availableFrom || item.availableUntil || item.publishedAt || item.createdAt;

const Field = ({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) => (
  <label className="grid gap-1.5 text-sm font-medium">
    {label}
    {children}
    {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
  </label>
);

const AudienceEditor = ({
  draft,
  setDraft,
  selectedUsers,
  setSelectedUsers,
}: {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  selectedUsers: AudienceUser[];
  setSelectedUsers: React.Dispatch<React.SetStateAction<AudienceUser[]>>;
}) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<AudienceUser[]>([]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (draft.audienceMode === "everyone" || search.trim().length < 2) {
        setResults([]);
        return;
      }
      void api<{ users: AudienceUser[] }>("GET", undefined, `?users=${encodeURIComponent(search)}`)
        .then((payload) => setResults(payload.users))
        .catch(() => setResults([]));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [draft.audienceMode, search]);
  return (
    <div className="space-y-3">
      <Field label="Audience">
        <select
          className="h-11 rounded-md border bg-background px-3"
          value={draft.audienceMode}
          onChange={(event) => {
            const audienceMode = event.target.value as AudienceMode;
            setDraft((current) => ({
              ...current,
              audienceMode,
              audienceUserIds: audienceMode === "everyone" ? [] : current.audienceUserIds,
            }));
            if (audienceMode === "everyone") setSelectedUsers([]);
          }}
        >
          <option value="everyone">Everyone in this app</option>
          <option value="whitelist">Only selected users</option>
          <option value="blacklist">Hide from specific users</option>
        </select>
      </Field>
      {draft.audienceMode !== "everyone" && (
        <>
          <Input
            value={search}
            placeholder="Filter by name, username, or email"
            onChange={(event) => setSearch(event.target.value)}
          />
          {results.length > 0 && (
            <div className="max-h-48 overflow-y-auto rounded-md border bg-background p-1">
              {results.map((user) => {
                const selected = draft.audienceUserIds.includes(user.id);
                return (
                  <button
                    type="button"
                    key={user.id}
                    disabled={selected}
                    className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50"
                    onClick={() => {
                      setSelectedUsers((current) => [...current, user]);
                      setDraft((current) => ({
                        ...current,
                        audienceUserIds: [...current.audienceUserIds, user.id],
                      }));
                    }}
                  >
                    <span><strong>{user.name || user.username || user.email}</strong><br /><span className="text-xs text-muted-foreground">{user.email}</span></span>
                    <Plus className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((user) => (
              <Button
                key={user.id}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedUsers((current) => current.filter((item) => item.id !== user.id));
                  setDraft((current) => ({
                    ...current,
                    audienceUserIds: current.audienceUserIds.filter((id) => id !== user.id),
                  }));
                }}
              >
                {user.name || user.username || user.email} ×
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const DraftEditor = ({
  draft,
  setDraft,
  selectedUsers,
  setSelectedUsers,
}: {
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft>>;
  selectedUsers: AudienceUser[];
  setSelectedUsers: React.Dispatch<React.SetStateAction<AudienceUser[]>>;
}) => {
  const poll = draft.interactionConfig as PollConfig;
  const input = draft.interactionConfig as InputConfig;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {draft.kind !== "email" && (
          <>
            <Field label="Style">
              <select className="h-11 rounded-md border bg-background px-3" value={draft.style} onChange={(event) => setDraft((current) => ({ ...current, style: event.target.value as CommunicationStyle }))}>
                <option value="info">Info</option><option value="warning">Warning</option><option value="danger">Danger</option><option value="success">Success</option>
              </select>
            </Field>
            <Field label="Priority">
              <div className="grid grid-cols-3 rounded-md border p-1">
                {([0, 5, 10] as const).map((priority) => (
                  <Button key={priority} type="button" size="sm" variant={draft.priority === priority ? "default" : "neutralGhost"} onClick={() => setDraft((current) => ({ ...current, priority }))}>
                    {priority === 0 ? "Low" : priority === 5 ? "Normal" : "High"}
                  </Button>
                ))}
              </div>
            </Field>
          </>
        )}
      </div>
      {draft.kind === "email" ? (
        <Field label="Subject"><Input maxLength={200} value={draft.subject} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} /></Field>
      ) : (
        <Field label="Title"><Input maxLength={160} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></Field>
      )}
      <Field label={draft.kind === "email" ? "Email body (Markdown)" : "Message (Markdown)"}>
        <Textarea rows={7} maxLength={20000} value={draft.bodyMarkdown} onChange={(event) => setDraft((current) => ({ ...current, bodyMarkdown: event.target.value }))} />
      </Field>
      {draft.kind === "notification" && (
        <Field label="Reaction template">
          <select className="h-11 rounded-md border bg-background px-3" value={draft.reactionTemplate || "acknowledge"} onChange={(event) => setDraft((current) => ({ ...current, reactionTemplate: event.target.value as ReactionTemplate }))}>
            {Object.entries(REACTION_TEMPLATES).map(([value, labels]) => <option key={value} value={value}>{value.replaceAll("_", " ")} — {labels.join(" / ")}</option>)}
          </select>
        </Field>
      )}
      {draft.kind === "poll" && (
        <div className="space-y-3">
          <Field label="Selection">
            <select className="h-11 rounded-md border bg-background px-3" value={poll.selection} onChange={(event) => setDraft((current) => ({ ...current, interactionConfig: { ...poll, selection: event.target.value } }))}>
              <option value="single">Single choice</option><option value="multiple">Multiple choice</option>
            </select>
          </Field>
          {poll.options.map((option, index) => (
            <div key={option.id} className="flex gap-2">
              <Input
                maxLength={200}
                aria-label={`Poll option ${index + 1}`}
                value={option.label}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  interactionConfig: { ...poll, options: poll.options.map((item) => item.id === option.id ? { ...item, label: event.target.value } : item) },
                }))}
              />
              {poll.options.length > 2 && <Button type="button" variant="neutralGhost" size="icon" aria-label={`Remove option ${index + 1}`} onClick={() => setDraft((current) => ({ ...current, interactionConfig: { ...poll, options: poll.options.filter((item) => item.id !== option.id) } }))}><Trash2 className="h-4 w-4" /></Button>}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setDraft((current) => ({ ...current, interactionConfig: { ...poll, options: [...poll.options, { id: crypto.randomUUID(), label: "" }] } }))}><Plus className="mr-2 h-4 w-4" />Add option</Button>
          {[
            ["required", "Answer required"],
            ["allowOther", "Allow Other short answer"],
            ["allowNotes", "Allow optional notes"],
          ].map(([key, label]) => (
            <label key={key} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={Boolean(poll[key as keyof PollConfig])} onChange={(event) => setDraft((current) => ({ ...current, interactionConfig: { ...poll, [key]: event.target.checked } }))} />{label}</label>
          ))}
        </div>
      )}
      {draft.kind === "input" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Input type"><select className="h-11 rounded-md border bg-background px-3" value={input.inputType} onChange={(event) => setDraft((current) => ({ ...current, interactionConfig: { ...input, inputType: event.target.value } }))}><option value="short">Short input</option><option value="long">Long textarea</option></select></Field>
          <label className="flex min-h-11 items-center gap-3 self-end text-sm"><input type="checkbox" checked={input.required} onChange={(event) => setDraft((current) => ({ ...current, interactionConfig: { ...input, required: event.target.checked } }))} />Response required</label>
        </div>
      )}
      {draft.kind !== "email" && (
        <>
          <Field label="Link URL" hint="HTTPS outside local development"><Input type="url" value={draft.linkUrl} onChange={(event) => setDraft((current) => ({ ...current, linkUrl: event.target.value }))} /></Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2"><Field label="Media URL"><Input type="url" value={draft.mediaUrl} onChange={(event) => setDraft((current) => ({ ...current, mediaUrl: event.target.value, mediaType: event.target.value ? current.mediaType || "image" : null }))} /></Field></div>
            <Field label="Media type"><select disabled={!draft.mediaUrl} className="h-11 rounded-md border bg-background px-3" value={draft.mediaType || "image"} onChange={(event) => setDraft((current) => ({ ...current, mediaType: event.target.value as "image" | "video" }))}><option value="image">Image</option><option value="video">Video</option></select></Field>
          </div>
        </>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Available from"><Input type="datetime-local" value={draft.availableFrom} onChange={(event) => setDraft((current) => ({ ...current, availableFrom: event.target.value }))} /></Field>
        <Field label="Available until"><Input type="datetime-local" value={draft.availableUntil} onChange={(event) => setDraft((current) => ({ ...current, availableUntil: event.target.value }))} /></Field>
      </div>
      <AudienceEditor draft={draft} setDraft={setDraft} selectedUsers={selectedUsers} setSelectedUsers={setSelectedUsers} />
    </div>
  );
};

export default function BackofficeNotificationsPage() {
  const [items, setItems] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [details, setDetails] = useState<Details | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<AudienceUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTitle, setDeleteTitle] = useState("");

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await api<{ items: Communication[] }>("GET");
      setItems(payload.items);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadList(), 0);
    return () => window.clearTimeout(timer);
  }, [loadList]);

  const openDetails = async (item: Communication) => {
    setError("");
    try {
      const loaded = await api<Details>("GET", undefined, `?id=${encodeURIComponent(item.id)}`);
      setDetails(loaded);
      setSelectedUsers(loaded.audienceUsers);
      setDraft(loaded.communication.publishedAt ? null : communicationToDraft(loaded.communication, loaded.audienceUsers));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load details.");
    }
  };

  const openCreate = (kind: CommunicationKind) => {
    setDetails(null);
    setSelectedUsers([]);
    setDraft(blankDraft(kind));
    setNewMenuOpen(false);
  };

  const serializeDraft = (value: Draft) => ({
    ...value,
    title: value.title || null,
    subject: value.subject || null,
    bodyMarkdown: value.bodyMarkdown || null,
    linkUrl: value.linkUrl || null,
    mediaUrl: value.mediaUrl || null,
    availableFrom: value.availableFrom ? new Date(value.availableFrom).toISOString() : null,
    availableUntil: value.availableUntil ? new Date(value.availableUntil).toISOString() : null,
  });

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      const loaded = details
        ? await api<Details>("PATCH", { id: details.communication.id, action: "edit", draft: serializeDraft(draft) })
        : await api<Details>("POST", serializeDraft(draft));
      setDetails(loaded);
      setSelectedUsers(loaded.audienceUsers);
      setDraft(communicationToDraft(loaded.communication, loaded.audienceUsers));
      await loadList();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save notification.");
    } finally {
      setSaving(false);
    }
  };

  const transition = async (action: "publish" | "abort") => {
    if (!details) return;
    setSaving(true);
    try {
      const loaded = await api<Details>("PATCH", { id: details.communication.id, action });
      setDetails(loaded);
      setDraft(null);
      await loadList();
    } catch (transitionError) {
      setError(transitionError instanceof Error ? transitionError.message : "Could not update notification.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!details) return;
    setSaving(true);
    try {
      await api("DELETE", {
        id: details.communication.id,
        confirmationTitle: deleteTitle || null,
      });
      setDeleteOpen(false);
      setDeleteTitle("");
      setDetails(null);
      setDraft(null);
      await loadList();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete notification.");
    } finally {
      setSaving(false);
    }
  };

  const activeModal = Boolean(draft || details);
  const current = details?.communication;
  const deleteConfirmationLabel = current?.title || current?.subject || "";
  const collected = Boolean(details && (details.metrics.displayed > 0 || details.metrics.responded > 0));
  const updateDraft: React.Dispatch<React.SetStateAction<Draft>> = (update) => {
    setDraft((currentDraft) => {
      if (!currentDraft) return currentDraft;
      return typeof update === "function" ? update(currentDraft) : update;
    });
  };
  const editorTitle = draft
    ? `${details ? "Edit" : "New"} ${kindMeta[draft.kind].label}`
    : current?.title || current?.subject || kindMeta[current?.kind || "notification"].label;

  const NewAction = () => (
      <div className="relative">
        <Button onClick={() => setNewMenuOpen((open) => !open)}><Plus className="mr-2 h-4 w-4" />New</Button>
        {newMenuOpen && (
          <div className="absolute right-0 top-full z-40 mt-2 w-52 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
            {(Object.keys(kindMeta) as CommunicationKind[]).map((kind) => {
              const { Icon, label } = kindMeta[kind];
              return <button type="button" key={kind} className="flex min-h-11 w-full items-center gap-3 rounded-sm px-3 text-sm hover:bg-accent" onClick={() => openCreate(kind)}><Icon className="h-4 w-4" />{label}</button>;
            })}
          </div>
        )}
      </div>
  );

  return (
    <AppLayout
      title="Notifications"
      subtitle="Communicate with users in this app"
      icon={Bell}
      actions={[{ type: "component", component: NewAction }]}
      policy={{ require: { feature: "page:notifications", session: true, role: "backoffice", grants: ["notifications:list"] } }}
    >
      <div className="mx-auto w-full max-w-5xl space-y-3">
        {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {loading && <LoaderCircle className="mx-auto h-6 w-6 animate-spin" aria-label="Loading notifications" />}
        {!loading && items.length === 0 && <Panel><p className="text-sm text-muted-foreground">No communications yet. Create one. Chuck Norris already approved the empty state.</p></Panel>}
        {items.map((item) => {
          const kind = kindMeta[item.kind];
          const status = getStatus(item);
          const AudienceIcon = item.audienceMode === "everyone" ? Users : LockKeyhole;
          return (
            <button type="button" key={item.id} className="block w-full text-left" onClick={() => void openDetails(item)}>
              <Panel className="flex items-start gap-3 transition-colors hover:bg-accent/50">
                <kind.Icon className="mt-0.5 h-5 w-5 shrink-0" aria-label={kind.label} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{item.title || item.subject || kind.label}</p>
                      <p className="line-clamp-1 text-sm text-muted-foreground">{item.bodyMarkdown || "No message body"}</p>
                    </div>
                    <DisplayDate
                      date={statusDate(item)}
                      className="shrink-0 text-xs text-muted-foreground"
                      interactive={false}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><status.Icon className="h-3.5 w-3.5" />{status.label}</span>
                    <span className="inline-flex items-center gap-1"><AudienceIcon className="h-3.5 w-3.5" />{item.audienceMode === "everyone" ? "Public" : "Restricted"}</span>
                  </div>
                </div>
                <MoreHorizontal className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Panel>
            </button>
          );
        })}
      </div>

      <Modal
        open={activeModal}
        onOpenChange={(open) => {
          if (!open) { setDetails(null); setDraft(null); setSelectedUsers([]); setError(""); }
        }}
        presentation="panel"
        size="xl"
        title={editorTitle}
        subtitle={current?.publishedAt ? "Published communications are locked." : "Drafts stay private until published."}
        footer={
          <div className="flex w-full flex-wrap justify-end gap-2">
            {details && <Button variant="destructive" onClick={() => setDeleteOpen(true)}><Trash2 className="mr-2 h-4 w-4" />Delete</Button>}
            {draft && <Button disabled={saving} onClick={() => void save()}>{saving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}Save draft</Button>}
            {details && !details.communication.publishedAt && <Button disabled={saving} variant="outline" onClick={() => void transition("publish")}><Send className="mr-2 h-4 w-4" />Publish</Button>}
            {details && details.communication.publishedAt && !details.communication.abortedAt && <Button disabled={saving} variant="outline" onClick={() => void transition("abort")}><Ban className="mr-2 h-4 w-4" />Abort</Button>}
          </div>
        }
      >
        {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
        {draft ? (
          <DraftEditor draft={draft} setDraft={updateDraft} selectedUsers={selectedUsers} setSelectedUsers={setSelectedUsers} />
        ) : details ? (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(details.metrics).map(([label, value]) => <Panel key={label} padding="sm" className="text-center"><strong className="block text-xl">{value}</strong><span className="text-xs capitalize text-muted-foreground">{label}</span></Panel>)}
            </div>
            <Panel className="space-y-2">
              <p className="text-sm"><strong>Created by:</strong> {details.communication.creatorName || "Deleted administrator"}</p>
              <p className="text-sm"><strong>Audience:</strong> {details.communication.audienceMode}</p>
              <p className="text-sm"><strong>Published:</strong> <DisplayDate date={details.communication.publishedAt} /></p>
            </Panel>
            <section className="space-y-2"><h3 className="font-semibold">Qualified displays</h3>{details.displays.length === 0 ? <p className="text-sm text-muted-foreground">No qualified displays.</p> : details.displays.map((row) => <Panel padding="sm" key={row.id} className="flex justify-between gap-3 text-sm"><span>{row.name || row.username || row.email}<br /><span className="text-xs text-muted-foreground">{row.displayCount} display(s)</span></span><DisplayDate date={row.lastDisplayedAt} /></Panel>)}</section>
            <section className="space-y-2"><h3 className="font-semibold">Responses</h3>{details.responses.length === 0 ? <p className="text-sm text-muted-foreground">No responses.</p> : details.responses.map((row) => <Panel padding="sm" key={row.id} className="text-sm"><div className="flex justify-between gap-3"><strong>{row.name || row.username || row.email}</strong><DisplayDate date={row.respondedAt} /></div><pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">{row.skipped ? "Skipped" : row.reaction || JSON.stringify(row.response, null, 2)}</pre></Panel>)}</section>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete communication?"
        subtitle={collected ? "This permanently deletes collected display and response data." : "This draft can be deleted permanently."}
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button variant="neutralLink" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={saving || (collected && deleteTitle !== deleteConfirmationLabel)} onClick={() => void remove()}>Delete permanently</Button>
          </div>
        }
      >
        {collected && (
          <Field label={`Type “${deleteConfirmationLabel}” to delete ${details?.metrics.displayed || 0} display and ${details?.metrics.responded || 0} response records.`}>
            <Input value={deleteTitle} onChange={(event) => setDeleteTitle(event.target.value)} />
          </Field>
        )}
        {!collected && <p className="text-sm text-muted-foreground">This action cannot be undone.</p>}
      </Modal>
    </AppLayout>
  );
}
