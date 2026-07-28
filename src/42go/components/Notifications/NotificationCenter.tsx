"use client";

import Link from "next/link";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Info,
  LoaderCircle,
  MessageSquareText,
} from "lucide-react";

import Markdown from "@/42go/components/Markdown";
import { Panel } from "@/42go/components/panel";
import { useAppConfig } from "@/42go/config/use-app-config";
import type {
  Communication,
  CommunicationResponse,
  PollConfig,
  InputConfig,
} from "@/42go/communications";
import { REACTION_TEMPLATES } from "@/42go/communications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useQualifiedDisplay } from "./useQualifiedDisplay";
import { getCommunicationQueuePosition } from "./queue";

const styleMap = {
  info: { Icon: Info, className: "border-primary/40 bg-primary/5 text-foreground" },
  warning: {
    Icon: AlertTriangle,
    className:
      "border-amber-400/60 bg-amber-50 text-amber-950 dark:border-amber-500/50 dark:bg-amber-950/35 dark:text-amber-100",
  },
  danger: { Icon: CircleAlert, className: "border-destructive/40 bg-destructive/10 text-destructive-foreground" },
  success: { Icon: CheckCircle2, className: "border-primary/40 bg-accent text-accent-foreground" },
};

const postAction = async (
  communicationId: string,
  action: "display" | "respond",
  payload: Record<string, unknown>
) => {
  const res = await fetch("/api/notifications", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ communicationId, action, ...payload }),
  });
  const result = (await res.json().catch(() => null)) as { message?: string } | null;
  if (!res.ok) throw new Error(result?.message || "Could not update notification.");
};

const NotificationFooter = ({
  showHistoryLink,
  primaryAction,
  secondaryAction,
}: {
  showHistoryLink: boolean;
  primaryAction: ReactNode;
  secondaryAction?: ReactNode;
}) => (
  <div className="flex min-h-11 items-center gap-2">
    {showHistoryLink && (
      <Link
        href="/notifications"
        className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <MessageSquareText className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">View all notifications</span>
      </Link>
    )}
    <div className="ml-auto flex shrink-0 items-center gap-1">
      {secondaryAction}
      {primaryAction}
    </div>
  </div>
);

const PollActions = ({
  config,
  busy,
  groupName,
  showHistoryLink,
  onSubmit,
}: {
  config: PollConfig;
  busy: boolean;
  groupName: string;
  showHistoryLink: boolean;
  onSubmit: (response: CommunicationResponse) => void;
}) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [other, setOther] = useState("");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const toggle = (id: string) =>
    setSelected((current) =>
      config.selection === "single"
        ? current.includes(id)
          ? []
          : [id]
        : current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id]
    );
  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        {config.options.map((option) => (
          <label key={option.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border bg-background px-3 py-2">
            <input
              type={config.selection === "single" ? "radio" : "checkbox"}
              name={groupName}
              checked={selected.includes(option.id)}
              onChange={() => {
                toggle(option.id);
                if (config.selection === "single") setOther("");
              }}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
      {config.allowOther && (
        <Input
          value={other}
          maxLength={500}
          placeholder="Other"
          aria-label="Other answer"
          onChange={(event) => {
            setOther(event.target.value);
            if (config.selection === "single" && event.target.value) setSelected([]);
          }}
        />
      )}
      {config.allowNotes && (
        <>
          {!showNotes ? (
            <Button type="button" variant="neutralLink" size="sm" onClick={() => setShowNotes(true)}>
              Add notes to your answer
            </Button>
          ) : (
            <Textarea value={notes} maxLength={5000} placeholder="Optional notes" onChange={(event) => setNotes(event.target.value)} />
          )}
        </>
      )}
      <NotificationFooter
        showHistoryLink={showHistoryLink}
        primaryAction={
          <Button disabled={busy} onClick={() => onSubmit({ optionIds: selected, other, notes })}>
            Submit
          </Button>
        }
        secondaryAction={
          !config.required ? (
            <Button
              variant="neutralLink"
              disabled={busy}
              onClick={() => onSubmit({ skip: true })}
            >
              Skip
            </Button>
          ) : undefined
        }
      />
    </div>
  );
};

const InputActions = ({
  config,
  busy,
  showHistoryLink,
  onSubmit,
}: {
  config: InputConfig;
  busy: boolean;
  showHistoryLink: boolean;
  onSubmit: (response: CommunicationResponse) => void;
}) => {
  const [value, setValue] = useState("");
  const Field = config.inputType === "long" ? Textarea : Input;
  return (
    <div className="space-y-3">
      <Field
        value={value}
        required={config.required}
        maxLength={config.inputType === "long" ? 5000 : 500}
        placeholder="Your answer"
        onChange={(event) => setValue(event.target.value)}
      />
      <NotificationFooter
        showHistoryLink={showHistoryLink}
        primaryAction={
          <Button disabled={busy} onClick={() => onSubmit({ input: value })}>
            Submit
          </Button>
        }
      />
    </div>
  );
};

const NotificationItem = ({
  item,
  className,
  position,
  showHistoryLink,
  onHandled,
}: {
  item: Communication;
  className?: string;
  position?: { current: number; total: number };
  showHistoryLink: boolean;
  onHandled: (id: string) => void;
}) => {
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState("");

  const recordDisplay = useCallback(
    (visitId: string) => {
      void postAction(item.id, "display", { visitId });
    },
    [item.id]
  );
  const rootRef = useQualifiedDisplay(item.id, recordDisplay);
  const presentation = styleMap[item.style];

  const respond = async (response: CommunicationResponse) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await postAction(item.id, "respond", { response });
      setLeaving(true);
      const transitionMs = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
        ? 0
        : 180;
      await new Promise<void>((resolve) =>
        window.setTimeout(resolve, transitionMs)
      );
      onHandled(item.id);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not submit response.");
      setLeaving(false);
    } finally {
      setBusy(false);
    }
  };

  const { Icon, className: styleClassName } = presentation;
  const reactions =
    item.kind === "notification" && item.reactionTemplate
      ? REACTION_TEMPLATES[item.reactionTemplate]
      : null;
  const primaryReaction = reactions?.[0];
  const secondaryReaction = reactions?.[1];
  return (
    <Panel
      className={cn(
        "relative overflow-hidden transition-[opacity,transform,max-height] motion-reduce:transition-none",
        leaving && "translate-y-1 opacity-0",
        styleClassName,
        className
      )}
    >
      <div ref={rootRef} className="space-y-4">
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            {item.title && (
              <h2 className="font-semibold leading-tight">{item.title}</h2>
            )}
            {position && position.total > 1 && (
              <span className="absolute right-4 top-4 text-xs font-medium text-muted-foreground">
                {position.current} of {position.total}
              </span>
            )}
            {item.bodyMarkdown && (
              <div className="mt-2 text-sm leading-relaxed">
                <Markdown source={item.bodyMarkdown} />
              </div>
            )}
          </div>
        </div>
        {item.mediaUrl && item.mediaType === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.mediaUrl}
            alt=""
            className="max-h-80 w-full rounded-md object-cover"
          />
        )}
        {item.mediaUrl && item.mediaType === "video" && (
          <video
            src={item.mediaUrl}
            controls
            preload="metadata"
            className="max-h-80 w-full rounded-md"
          />
        )}
        {item.linkUrl && (
          <a
            href={item.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4"
          >
            Open link
          </a>
        )}
        {primaryReaction && (
          <NotificationFooter
            showHistoryLink={showHistoryLink}
            primaryAction={
              <Button
                disabled={busy}
                onClick={() => void respond({ reaction: primaryReaction })}
              >
                {busy && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                {primaryReaction}
              </Button>
            }
            secondaryAction={
              secondaryReaction ? (
                <Button
                  variant="neutralLink"
                  disabled={busy}
                  onClick={() => void respond({ reaction: secondaryReaction })}
                >
                  {secondaryReaction}
                </Button>
              ) : undefined
            }
          />
        )}
        {item.kind === "poll" && (
          <PollActions
            config={item.interactionConfig as PollConfig}
            busy={busy}
            groupName={`notification-poll-${item.id}`}
            showHistoryLink={showHistoryLink}
            onSubmit={(response) => void respond(response)}
          />
        )}
        {item.kind === "input" && (
          <InputActions
            config={item.interactionConfig as InputConfig}
            busy={busy}
            showHistoryLink={showHistoryLink}
            onSubmit={(response) => void respond(response)}
          />
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      </div>
    </Panel>
  );
};

export const NotificationCenter = ({
  className,
  displayMode = "queue",
  showHistoryLink,
  onQueueLoaded,
}: {
  className?: string;
  displayMode?: "queue" | "list";
  showHistoryLink?: boolean;
  onQueueLoaded?: (count: number) => void;
}) => {
  const config = useAppConfig();
  const [items, setItems] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [handled, setHandled] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/notifications", {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load notifications.");
        return res.json() as Promise<{ items?: Communication[] }>;
      })
      .then((payload) => {
        const queue = Array.isArray(payload.items) ? payload.items : [];
        setItems(queue);
      })
      .catch((fetchError) => {
        if ((fetchError as Error).name !== "AbortError") {
          setError((fetchError as Error).message);
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!loading) onQueueLoaded?.(items.length);
  }, [items.length, loading, onQueueLoaded]);

  const handleItem = useCallback(
    (id: string) => {
      setItems((current) => current.filter((item) => item.id !== id));
      if (displayMode === "queue") setHandled((count) => count + 1);
    },
    [displayMode]
  );

  if (loading || (items.length === 0 && !error)) return null;
  if (items.length === 0) {
    return (
      <p role="alert" className={cn("text-sm text-destructive", className)}>
        {error}
      </p>
    );
  }

  const canLinkHistory =
    showHistoryLink ??
    Boolean(
      config?.app?.notifications?.showHistoryLink &&
        config.features.includes("page:notifications")
    );

  if (displayMode === "list") {
    return (
      <div className={cn("space-y-3", className)}>
        {items.map((item) => (
          <NotificationItem
            key={item.id}
            item={item}
            showHistoryLink={canLinkHistory}
            onHandled={handleItem}
          />
        ))}
      </div>
    );
  }

  return (
    <NotificationItem
      item={items[0]}
      className={className}
      position={getCommunicationQueuePosition(handled, items.length)}
      showHistoryLink={canLinkHistory}
      onHandled={handleItem}
    />
  );
};
