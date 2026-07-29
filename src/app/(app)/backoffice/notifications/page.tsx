"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Ban,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FilePenLine,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MessageSquareText,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Users,
} from "lucide-react";

import { DisplayDate } from "@/42go/components/DisplayDate";
import Markdown from "@/42go/components/Markdown";
import { communicationStyleMap } from "@/42go/components/Notifications";
import { Modal } from "@/42go/components/modal";
import { Panel } from "@/42go/components/panel";
import {
  PlainList,
  PlainListButton,
  PlainListItem,
} from "@/42go/components/PlainList";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  displays: Array<
    Omit<AudienceUser, "id"> & {
      userId: string;
      firstDisplayedAt: string;
      lastDisplayedAt: string;
      displayCount: string;
    }
  >;
  responses: Array<
    Omit<AudienceUser, "id"> & {
      userId: string;
      reaction: string | null;
      response: unknown;
      skipped: boolean;
      respondedAt: string;
    }
  >;
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

const CompactChoice = ({
  label,
  value,
  options,
  onValueChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onValueChange: (value: string) => void;
}) => {
  const selectedLabel =
    options.find((option) => option.value === value)?.label || value;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex min-h-12 w-full min-w-0 items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-left shadow-xs outline-none transition-colors hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label={`${label}: ${selectedLabel}`}
        >
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">{label}</span>
            <span className="block truncate text-sm font-medium">
              {selectedLabel}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="z-[750] w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

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
  const [showPollDescription, setShowPollDescription] = useState(
    draft.kind === "poll" && Boolean(draft.bodyMarkdown)
  );
  return (
    <div className="space-y-5">
      {draft.kind === "email" ? (
        <Field label="Subject"><Input maxLength={200} value={draft.subject} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))} /></Field>
      ) : (
        <Field label="Title"><Input maxLength={160} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></Field>
      )}
      {draft.kind !== "email" && (
        <div className="grid grid-cols-2 gap-3">
          <CompactChoice
            label="Style"
            value={draft.style}
            options={[
              { value: "info", label: "Info" },
              { value: "warning", label: "Warning" },
              { value: "danger", label: "Danger" },
              { value: "success", label: "Success" },
            ]}
            onValueChange={(style) =>
              setDraft((current) => ({
                ...current,
                style: style as CommunicationStyle,
              }))
            }
          />
          <CompactChoice
            label="Priority"
            value={String(draft.priority)}
            options={[
              { value: "0", label: "Low" },
              { value: "5", label: "Normal" },
              { value: "10", label: "High" },
            ]}
            onValueChange={(priority) =>
              setDraft((current) => ({
                ...current,
                priority: Number(priority) as 0 | 5 | 10,
              }))
            }
          />
        </div>
      )}
      {draft.kind === "poll" ? (
        showPollDescription ? (
          <Field label="Description (Markdown)">
            <Textarea
              rows={4}
              maxLength={20000}
              value={draft.bodyMarkdown}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  bodyMarkdown: event.target.value,
                }))
              }
            />
          </Field>
        ) : (
          <div>
            <Button
              type="button"
              variant="neutralLink"
              size="sm"
              onClick={() => setShowPollDescription(true)}
            >
              <Plus className="h-4 w-4" />
              Add description
            </Button>
          </div>
        )
      ) : (
        <Field
          label={
            draft.kind === "email" ? "Email body (Markdown)" : "Message (Markdown)"
          }
        >
          <Textarea
            rows={7}
            maxLength={20000}
            value={draft.bodyMarkdown}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                bodyMarkdown: event.target.value,
              }))
            }
          />
        </Field>
      )}
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
                placeholder={`Option ${index + 1}`}
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
            <label
              key={key}
              className="flex min-h-11 items-center justify-between gap-4 text-sm"
            >
              <span>{label}</span>
              <Switch
                checked={Boolean(poll[key as keyof PollConfig])}
                onCheckedChange={(checked) =>
                  setDraft((current) => ({
                    ...current,
                    interactionConfig: { ...poll, [key]: checked },
                  }))
                }
                aria-label={label}
              />
            </label>
          ))}
        </div>
      )}
      {draft.kind === "input" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Input type"><select className="h-11 rounded-md border bg-background px-3" value={input.inputType} onChange={(event) => setDraft((current) => ({ ...current, interactionConfig: { ...input, inputType: event.target.value } }))}><option value="short">Short input</option><option value="long">Long textarea</option></select></Field>
          <label className="flex min-h-11 items-center justify-between gap-4 self-end text-sm">
            <span>Response required</span>
            <Switch
              checked={input.required}
              onCheckedChange={(checked) =>
                setDraft((current) => ({
                  ...current,
                  interactionConfig: { ...input, required: checked },
                }))
              }
              aria-label="Response required"
            />
          </label>
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

const priorityLabel = (priority: Communication["priority"]) =>
  priority === 0 ? "Low" : priority === 10 ? "High" : "Normal";

const DetailValue = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="min-w-0">
    <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
    <dd className="mt-1 break-words text-sm">{children}</dd>
  </div>
);

const CommunicationSummary = ({ details }: { details: Details }) => {
  const item = details.communication;
  const poll =
    item.kind === "poll"
      ? (item.interactionConfig as PollConfig)
      : null;
  const input =
    item.kind === "input"
      ? (item.interactionConfig as InputConfig)
      : null;
  const audienceLabel =
    item.audienceMode === "everyone"
      ? "Everyone in this app"
      : item.audienceMode === "whitelist"
        ? "Only selected users"
        : "Everyone except selected users";

  return (
    <>
      <section className="space-y-2" aria-labelledby="communication-content">
        <h3 id="communication-content" className="font-semibold">
          Communication
        </h3>
        <Panel className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {item.kind === "email" ? "Subject" : "Title"}
            </p>
            <p className="mt-1 whitespace-pre-wrap font-medium">
              {item.kind === "email"
                ? item.subject || "No subject"
                : item.title || "No title"}
            </p>
          </div>
          <div className="border-t pt-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              {item.kind === "email" ? "Email body" : "Description"}
            </p>
            {item.bodyMarkdown ? (
              <div className="text-sm leading-relaxed">
                <Markdown source={item.bodyMarkdown} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No description.</p>
            )}
          </div>
        </Panel>
      </section>

      <section className="space-y-2" aria-labelledby="communication-settings">
        <h3 id="communication-settings" className="font-semibold">
          Configuration
        </h3>
        <Panel className="space-y-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <DetailValue label="Type">{kindMeta[item.kind].label}</DetailValue>
            <DetailValue label="Channel">
              {item.channel === "in_app" ? "In-app" : "Email"}
            </DetailValue>
            {item.channel === "in_app" && (
              <DetailValue label="Style">
                {item.style.charAt(0).toUpperCase() + item.style.slice(1)}
              </DetailValue>
            )}
            {item.channel === "in_app" && (
              <DetailValue label="Priority">
                {priorityLabel(item.priority)}
              </DetailValue>
            )}
            <DetailValue label="Audience">{audienceLabel}</DetailValue>
            <DetailValue label="Created by">
              {item.creatorName || "Deleted administrator"}
            </DetailValue>
          </dl>

          {details.audienceUsers.length > 0 && (
            <div className="border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground">
                Selected users
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {details.audienceUsers.map((user) => (
                  <li key={user.id}>
                    {user.name || user.username || user.email}
                    <span className="ml-1 text-muted-foreground">
                      ({user.email})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.kind === "notification" && item.reactionTemplate && (
            <div className="border-t pt-4">
              <p className="text-xs font-medium text-muted-foreground">
                Reaction template
              </p>
              <p className="mt-1 text-sm">
                {item.reactionTemplate.replaceAll("_", " ")} —{" "}
                {REACTION_TEMPLATES[item.reactionTemplate].join(" / ")}
              </p>
            </div>
          )}

          {poll && (
            <div className="space-y-3 border-t pt-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                <DetailValue label="Selection">
                  {poll.selection === "single"
                    ? "Single choice"
                    : "Multiple choice"}
                </DetailValue>
                <DetailValue label="Answer required">
                  {poll.required ? "Yes" : "No"}
                </DetailValue>
                <DetailValue label="Other answer">
                  {poll.allowOther ? "Allowed" : "Not allowed"}
                </DetailValue>
                <DetailValue label="Optional notes">
                  {poll.allowNotes ? "Allowed" : "Not allowed"}
                </DetailValue>
              </dl>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Poll options
                </p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                  {poll.options.map((option) => (
                    <li key={option.id}>{option.label}</li>
                  ))}
                </ol>
              </div>
            </div>
          )}

          {input && (
            <dl className="grid grid-cols-2 gap-4 border-t pt-4">
              <DetailValue label="Input type">
                {input.inputType === "short" ? "Short input" : "Long textarea"}
              </DetailValue>
              <DetailValue label="Response required">
                {input.required ? "Yes" : "No"}
              </DetailValue>
            </dl>
          )}

          {(item.linkUrl || item.mediaUrl) && (
            <dl className="grid gap-4 border-t pt-4 sm:grid-cols-2">
              {item.linkUrl && (
                <DetailValue label="Link URL">
                  <a
                    href={item.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    {item.linkUrl}
                  </a>
                </DetailValue>
              )}
              {item.mediaUrl && (
                <DetailValue
                  label={`Media URL${item.mediaType ? ` (${item.mediaType})` : ""}`}
                >
                  <a
                    href={item.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    {item.mediaUrl}
                  </a>
                </DetailValue>
              )}
            </dl>
          )}
        </Panel>
      </section>

      <section className="space-y-2" aria-labelledby="communication-timing">
        <h3 id="communication-timing" className="font-semibold">
          Timing
        </h3>
        <Panel>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
            <DetailValue label="Created">
              <DisplayDate date={item.createdAt} />
            </DetailValue>
            <DetailValue label="Updated">
              <DisplayDate date={item.updatedAt} />
            </DetailValue>
            <DetailValue label="Published">
              <DisplayDate date={item.publishedAt} />
            </DetailValue>
            <DetailValue label="Aborted">
              <DisplayDate date={item.abortedAt} />
            </DetailValue>
            <DetailValue label="Available from">
              <DisplayDate date={item.availableFrom} />
            </DetailValue>
            <DetailValue label="Available until">
              <DisplayDate date={item.availableUntil} />
            </DetailValue>
          </dl>
        </Panel>
      </section>
    </>
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
      stickyHeader
      title="Notifications"
      icon={Bell}
      actions={[{ type: "component", component: NewAction }]}
      disablePadding
      policy={{ require: { feature: "page:notifications", session: true, role: "backoffice", grants: ["notifications:list"] } }}
    >
      <div className="flex min-h-[calc(100vh-4rem)] flex-col overflow-hidden bg-background">
        {error ? (
          <div className="flex items-start gap-3 p-6 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-3">
              <p role="alert">{error}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void loadList()}>
                <RefreshCw />
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="md:hidden">
              {loading ? (
                <div className="p-6">
                  <LoaderCircle className="mx-auto h-6 w-6 animate-spin" aria-label="Loading notifications" />
                </div>
              ) : items.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">
                  No communications yet. Create one.
                </p>
              ) : (
                <div className="px-6">
                  <PlainList flushMobileTop>
                    {items.map((item) => {
                      const kind = kindMeta[item.kind];
                      const status = getStatus(item);
                      const AudienceIcon = item.audienceMode === "everyone" ? Users : LockKeyhole;
                      return (
                        <PlainListItem key={item.id}>
                          <PlainListButton
                            className={communicationStyleMap[item.style].className}
                            onClick={() => void openDetails(item)}
                          >
                            <kind.Icon className="mt-0.5 h-5 w-5 shrink-0" aria-label={kind.label} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold">{item.title || item.subject || kind.label}</p>
                              <p className="line-clamp-1 text-sm text-muted-foreground">{item.bodyMarkdown || "No message body"}</p>
                              <div className="mt-2 flex min-w-0 items-center justify-between gap-3 text-xs text-muted-foreground">
                                <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                                  <span className="inline-flex items-center gap-1"><status.Icon className="h-3.5 w-3.5" />{status.label}</span>
                                  <span className="inline-flex items-center gap-1"><AudienceIcon className="h-3.5 w-3.5" />{item.audienceMode === "everyone" ? "Public" : "Restricted"}</span>
                                </span>
                                <DisplayDate
                                  date={statusDate(item)}
                                  className="shrink-0 text-xs text-muted-foreground"
                                  interactive={false}
                                />
                              </div>
                            </div>
                          </PlainListButton>
                        </PlainListItem>
                      );
                    })}
                  </PlainList>
                </div>
              )}
            </div>

            <div className="hidden flex-1 overflow-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium uppercase text-muted-foreground">
                    {["Communication", "Type", "Status", "Audience", "Priority", "Date"].map((label) => (
                      <th
                        key={label}
                        className="sticky top-0 z-10 border-b bg-background/95 px-6 py-3 backdrop-blur"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="px-6 py-4">
                          <div className="h-4 w-48 rounded bg-muted" />
                          <div className="mt-1 h-3 w-72 rounded bg-muted/70" />
                        </td>
                        {Array.from({ length: 5 }).map((__, cellIndex) => (
                          <td key={cellIndex} className="px-6 py-4">
                            <div className="h-4 w-24 rounded bg-muted" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">
                        No communications yet. Create one.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const kind = kindMeta[item.kind];
                      const status = getStatus(item);
                      const AudienceIcon = item.audienceMode === "everyone" ? Users : LockKeyhole;
                      const openItem = () => void openDetails(item);
                      return (
                        <tr
                          key={item.id}
                          tabIndex={0}
                          role="button"
                          className={`${communicationStyleMap[item.style].className} cursor-pointer border-b outline-none transition-[filter,box-shadow] last:border-0 hover:brightness-[0.98] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40 dark:hover:brightness-110`}
                          onClick={openItem}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter" && event.key !== " ") return;
                            event.preventDefault();
                            openItem();
                          }}
                        >
                          <td className="px-6 py-4">
                            <div className="min-w-60 max-w-xl">
                              <p className="truncate font-medium">{item.title || item.subject || kind.label}</p>
                              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                {item.bodyMarkdown || "No message body"}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-2">
                              <kind.Icon className="h-4 w-4 shrink-0" />
                              {kind.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-2">
                              <status.Icon className="h-4 w-4 shrink-0" />
                              {status.label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-2">
                              <AudienceIcon className="h-4 w-4 shrink-0" />
                              {item.audienceMode === "everyone" ? "Public" : "Restricted"}
                            </span>
                          </td>
                          <td className="px-6 py-4">{priorityLabel(item.priority)}</td>
                          <td className="px-6 py-4 text-muted-foreground">
                            <DisplayDate date={statusDate(item)} interactive={false} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
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
          !draft && details ? (
            <div className="flex w-full flex-wrap justify-end gap-2">
              <Button
                variant="destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              {details.communication.publishedAt &&
                !details.communication.abortedAt && (
                  <Button
                    disabled={saving}
                    variant="outline"
                    onClick={() => void transition("abort")}
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    Abort
                  </Button>
                )}
            </div>
          ) : undefined
        }
      >
        {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
        {draft ? (
          <div>
            <DraftEditor
              draft={draft}
              setDraft={updateDraft}
              selectedUsers={selectedUsers}
              setSelectedUsers={setSelectedUsers}
            />
            <div className="mt-8 flex flex-wrap justify-end gap-2 border-t pt-5">
              {details && (
                <Button
                  variant="destructiveGhost"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
              <Button disabled={saving} onClick={() => void save()}>
                {saving && (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save draft
              </Button>
              {details && !details.communication.publishedAt && (
                <Button
                  disabled={saving}
                  variant="outline"
                  onClick={() => void transition("publish")}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Publish
                </Button>
              )}
            </div>
          </div>
        ) : details ? (
          <div className="space-y-6">
            <CommunicationSummary details={details} />
            <section className="space-y-2" aria-labelledby="communication-engagement">
              <h3 id="communication-engagement" className="font-semibold">
                Engagement
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(details.metrics).map(([label, value]) => (
                  <Panel
                    key={label}
                    padding="sm"
                    className="text-center"
                  >
                    <strong className="block text-xl">{value}</strong>
                    <span className="text-xs capitalize text-muted-foreground">
                      {label}
                    </span>
                  </Panel>
                ))}
              </div>
            </section>
            <section className="space-y-2"><h3 className="font-semibold">Qualified displays</h3>{details.displays.length === 0 ? <p className="text-sm text-muted-foreground">No qualified displays.</p> : details.displays.map((row) => <Panel padding="sm" key={row.userId} className="flex justify-between gap-3 text-sm"><span>{row.name || row.username || row.email}<br /><span className="text-xs text-muted-foreground">{row.displayCount} display(s)</span></span><DisplayDate date={row.lastDisplayedAt} /></Panel>)}</section>
            <section className="space-y-2"><h3 className="font-semibold">Responses</h3>{details.responses.length === 0 ? <p className="text-sm text-muted-foreground">No responses.</p> : details.responses.map((row) => <Panel padding="sm" key={row.userId} className="text-sm"><div className="flex justify-between gap-3"><strong>{row.name || row.username || row.email}</strong><DisplayDate date={row.respondedAt} /></div><pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-muted-foreground">{row.skipped ? "Skipped" : row.reaction || JSON.stringify(row.response, null, 2)}</pre></Panel>)}</section>
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
