"use client";

import { Languages, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  readCachedReaderTranslation,
  writeCachedReaderTranslation,
} from "@/app/(app)/(lingocafe)/books/_components/reader-translation-cache";
import {
  DEFAULT_READER_TRANSLATION_SCOPE,
  READER_TRANSLATION_SCOPE_EVENT,
  readStoredReaderPreferencesStore,
  sanitizeReaderTranslationScope,
  type ReaderTranslationScope,
  writeStoredReaderTranslationScope,
} from "@/app/(app)/(lingocafe)/books/_components/reader-preferences";
import { ExpandableFab } from "@/components/ui/expandable-fab";
import { splitLingoCafeSentences } from "@/lib/lingocafe/sentence-segmentation";
import { cn } from "@/lib/utils";

type TranslationContext =
  | { kind: "conversation"; conversationId: string }
  | { kind: "category"; categoryId: string };

type Selection = { id: string; sentenceId: string; text: string };

export const useConversationTranslationScope = () => {
  const [scope, setScope] = useState<ReaderTranslationScope>(
    DEFAULT_READER_TRANSLATION_SCOPE
  );

  useEffect(() => {
    queueMicrotask(() => {
      setScope(
        sanitizeReaderTranslationScope(
          readStoredReaderPreferencesStore().translationScope
        )
      );
    });
    const syncScope = (event: Event) => {
      setScope(
        sanitizeReaderTranslationScope(
          (event as CustomEvent<ReaderTranslationScope>).detail
        )
      );
    };
    window.addEventListener(READER_TRANSLATION_SCOPE_EVENT, syncScope);
    return () =>
      window.removeEventListener(READER_TRANSLATION_SCOPE_EVENT, syncScope);
  }, []);

  const update = (next: ReaderTranslationScope) => {
    setScope(next);
    try {
      writeStoredReaderTranslationScope(next);
    } catch {
      // The setting still works for this session when storage is unavailable.
    }
  };

  return [scope, update] as const;
};

export const ConversationActionFab = ({
  scope,
  onScopeChange,
  onPlay,
  canPlay,
  translationAvailable = true,
  immersive = false,
}: {
  scope: ReaderTranslationScope;
  onScopeChange: (scope: ReaderTranslationScope) => void;
  onPlay?: () => void;
  canPlay?: boolean;
  translationAvailable?: boolean;
  immersive?: boolean;
}) => (
  <div
    role="region"
    aria-label="Conversation actions"
    className="pointer-events-none fixed left-5 right-5 z-[1000] flex items-end justify-between"
    style={{
      bottom: immersive
        ? "calc(env(safe-area-inset-bottom) + 1.25rem)"
        : "calc(env(safe-area-inset-bottom) + 5rem)",
    }}
  >
    {translationAvailable ? (
      <div className="pointer-events-auto">
        <ExpandableFab
          label="Translation options"
          icon={<Languages aria-hidden="true" className="size-6" />}
          placement="top-start"
          selectedActionId={scope}
          actions={[
            { id: "sentence", label: "Translate sentence", onSelect: () => onScopeChange("sentence") },
            { id: "word", label: "Translate word", onSelect: () => onScopeChange("word") },
          ]}
        />
      </div>
    ) : <span />}
    {canPlay && onPlay ? (
      <div className="pointer-events-auto">
        <ExpandableFab
          label="Play conversation aloud"
          icon={<span aria-hidden="true" className="text-xl leading-none">▶</span>}
          onClick={onPlay}
        />
      </div>
    ) : null}
  </div>
);

const inlineMarkdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  a: ({ children }: { children?: React.ReactNode }) => <span className="underline">{children}</span>,
};

export const ConversationTranslatableText = ({
  text,
  sourceLanguage,
  targetLanguage,
  context,
  scope,
  idPrefix,
  activeSentenceId,
  activeWordRange,
  onSentenceCatalog,
  headingLevel,
  className,
}: {
  text: string;
  sourceLanguage: string;
  targetLanguage: string | null;
  context: TranslationContext;
  scope: ReaderTranslationScope;
  idPrefix: string;
  activeSentenceId?: string | null;
  activeWordRange?: { start: number; end: number } | null;
  onSentenceCatalog?: (items: Array<{ id: string; text: string }>) => void;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}) => {
  const sentences = splitLingoCafeSentences(text).filter((item) => item.trim());
  const [selection, setSelection] = useState<Selection | null>(null);
  const [translation, setTranslation] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const selectionTriggerRef = useRef<HTMLButtonElement | null>(null);
  const translationStatusId = `${idPrefix}:translation-status`;

  const closeTranslation = useCallback((restoreFocus = true) => {
    const trigger = selectionTriggerRef.current;
    setSelection(null);
    setTranslation(null);
    setStatus("idle");
    if (restoreFocus) {
      queueMicrotask(() => trigger?.focus());
    }
  }, []);

  useEffect(() => {
    if (!selection) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeTranslation();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeTranslation, selection]);

  useEffect(() => {
    onSentenceCatalog?.(
      sentences.map((sentence, index) => ({
        id: `${idPrefix}:sentence:${index + 1}`,
        text: sentence.trim(),
      }))
    );
  // Sentence catalogs are derived from stable loaded content.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPrefix, text]);

  const translate = async (
    next: Selection,
    trigger: HTMLButtonElement
  ) => {
    if (!targetLanguage || sourceLanguage === targetLanguage) return;
    if (selection?.id === next.id) {
      closeTranslation(false);
      return;
    }
    selectionTriggerRef.current = trigger;
    setSelection(next);
    setTranslation(null);
    setStatus("loading");
    const input = { text: next.text, from: sourceLanguage, to: targetLanguage };
    try {
      const cached = await readCachedReaderTranslation(input);
      if (cached) {
        setTranslation(cached.translation);
        setStatus("idle");
        return;
      }
      const response = await fetch("/api/lingocafe/translate", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          context:
            context.kind === "conversation"
              ? { ...context, sentenceId: next.sentenceId }
              : context,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        translation?: {
          hash: string;
          from: string;
          to: string;
          text: string;
          translation: string;
          source: "memory" | "database" | "google";
        };
      } | null;
      if (!response.ok || !payload?.translation) {
        throw new Error(payload?.message || "Could not translate.");
      }
      writeCachedReaderTranslation(payload.translation);
      setTranslation(payload.translation.translation);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  const renderSentence = (sentence: string, sentenceIndex: number) => {
    const sentenceId = `${idPrefix}:sentence:${sentenceIndex + 1}`;
    const active = activeSentenceId === sentenceId;
    const playbackText =
      active && activeWordRange ? (
        <>
          {sentence.slice(0, activeWordRange.start)}
          <mark className="rounded-[2px] bg-primary/30 text-current">
            {sentence.slice(activeWordRange.start, activeWordRange.end)}
          </mark>
          {sentence.slice(activeWordRange.end)}
        </>
      ) : null;
    if (scope === "word") {
      return (
        <span
          key={sentenceId}
          data-reader-sentence-id={sentenceId}
          className={cn("rounded-sm", active && "bg-primary/15")}
        >
          {playbackText ?? sentence.split(/(\p{L}[\p{L}\p{M}'’\-]*|\p{N}+)/gu).map((part, wordIndex) =>
            /^(\p{L}|\p{N})/u.test(part) ? (
              <button
                key={`${sentenceId}:word:${wordIndex}`}
                type="button"
                aria-controls={selection?.id === `${sentenceId}:word:${wordIndex}` ? translationStatusId : undefined}
                aria-expanded={selection?.id === `${sentenceId}:word:${wordIndex}`}
                onClick={(event) => void translate({ id: `${sentenceId}:word:${wordIndex}`, sentenceId, text: part }, event.currentTarget)}
                className="rounded-[3px] text-left outline-none hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring"
              >{part}</button>
            ) : part
          )}
        </span>
      );
    }
    return (
      <button
        key={sentenceId}
        type="button"
        data-reader-sentence-id={sentenceId}
        aria-controls={selection?.id === sentenceId ? translationStatusId : undefined}
        aria-expanded={selection?.id === sentenceId}
        onClick={(event) => void translate({ id: sentenceId, sentenceId, text: sentence.trim() }, event.currentTarget)}
        className={cn(
          "rounded-[3px] text-left outline-none hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring",
          active && "bg-primary/15"
        )}
      >
        {playbackText ?? <ReactMarkdown components={inlineMarkdownComponents}>{sentence}</ReactMarkdown>}
      </button>
    );
  };

  return (
    <div className={cn("relative", className)}>
      <div
        role={headingLevel ? "heading" : undefined}
        aria-level={headingLevel}
      >
        {sentences.map(renderSentence)}
      </div>
      {selection ? (
        <div
          className="mt-2 rounded-lg border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{selection.text}</p>
              <div
                id={translationStatusId}
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                <p className="mt-1 font-medium">
                  {status === "loading" ? "Translating…" : status === "error" ? "Could not translate. Select the text again to retry." : translation}
                </p>
              </div>
            </div>
            <button type="button" aria-label="Close translation" onClick={() => closeTranslation()} className="flex size-9 shrink-0 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
