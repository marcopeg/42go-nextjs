"use client";

import ReactMarkdown from "react-markdown";
import { Fragment, useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import {
  readCachedReaderTranslation,
  writeCachedReaderTranslation,
  type ReaderTranslationCacheEntry,
} from "@/app/(app)/(lingocafe)/books/_components/reader-translation-cache";
import {
  getReaderTranslationAnchor,
  ReaderTranslationPopover,
  type ReaderTranslationAnchor,
} from "@/app/(app)/(lingocafe)/books/_components/ReaderTranslationPopover";
import {
  DEFAULT_READER_TRANSLATION_SCOPE,
  READER_TRANSLATION_SCOPE_EVENT,
  readStoredReaderPreferencesStore,
  sanitizeReaderTranslationScope,
  type ReaderTranslationScope,
  writeStoredReaderTranslationScope,
} from "@/app/(app)/(lingocafe)/books/_components/reader-preferences";
import { ExpandableFab } from "@/components/ui/expandable-fab";
import { TranslationScopeFab } from "@/components/ui/translation-scope-fab";
import { getLingoCafeReaderLanguages } from "@/config/lingocafe/profile-options";
import { splitLingoCafeSentenceDisplaySegments } from "@/lib/lingocafe/sentence-segmentation";
import {
  filterLingoCafeTranslationTargets,
  isSameLingoCafeTranslationLanguage,
} from "@/lib/lingocafe/translation-language";
import { cn } from "@/lib/utils";

type TranslationContext =
  | { kind: "conversation"; conversationId: string }
  | { kind: "category"; categoryId: string };

type Selection = {
  id: string;
  sentenceId: string;
  text: string;
  anchor: ReaderTranslationAnchor;
};

const conversationTranslationOpenEvent = "lingocafe:conversation-translation-open";
const fluentLanguageOptions = getLingoCafeReaderLanguages().own;

type ProfileApiResponse = {
  message?: unknown;
};

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
        <TranslationScopeFab scope={scope} onScopeChange={onScopeChange} />
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

const getTranslationSelectionStyle = (selected: boolean): CSSProperties => ({
  backgroundColor: selected ? "var(--reader-fg-soft)" : undefined,
  color: selected ? "var(--reader-highlight-fg)" : undefined,
  boxShadow: selected
    ? "inset 0 0 0 9999px var(--reader-fg-soft)"
    : undefined,
  position: selected ? "relative" : undefined,
  zIndex: selected ? 50 : undefined,
});

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
  pronunciationPlaying = false,
  onPlaySelection,
  onStartFromHere,
  onTranslationOpenChange,
  onTargetLanguageChange,
  headingLevel,
  className,
  style,
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
  pronunciationPlaying?: boolean;
  onPlaySelection?: (text: string, scope: ReaderTranslationScope) => void;
  onStartFromHere?: (sentenceId: string) => void;
  onTranslationOpenChange?: (isOpen: boolean) => void;
  onTargetLanguageChange?: (language: string) => void;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
  style?: CSSProperties;
}) => {
  const sentences = splitLingoCafeSentenceDisplaySegments(text);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [translation, setTranslation] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "idle" | "choose-language" | "saving-language" | "loading" | "error"
  >("idle");
  const [translationSource, setTranslationSource] =
    useState<ReaderTranslationCacheEntry["source"] | null>(null);
  const selectionTriggerRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const reportedOpenRef = useRef(false);
  const availableTranslationLanguages = filterLingoCafeTranslationTargets(
    fluentLanguageOptions,
    sourceLanguage
  );

  const closeTranslation = useCallback((restoreFocus = true) => {
    const trigger = selectionTriggerRef.current;
    setSelection(null);
    setTranslation(null);
    setTranslationSource(null);
    setStatus("idle");
    if (restoreFocus) {
      queueMicrotask(() => trigger?.focus());
    }
  }, []);

  useEffect(() => {
    const isOpen = selection !== null;
    if (isOpen === reportedOpenRef.current) return;
    reportedOpenRef.current = isOpen;
    onTranslationOpenChange?.(isOpen);
  }, [onTranslationOpenChange, selection]);

  useEffect(() => () => {
    if (reportedOpenRef.current) onTranslationOpenChange?.(false);
  }, [onTranslationOpenChange]);

  useEffect(() => {
    const closeOtherTranslation = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== idPrefix) {
        closeTranslation(false);
      }
    };
    window.addEventListener(conversationTranslationOpenEvent, closeOtherTranslation);
    return () => window.removeEventListener(
      conversationTranslationOpenEvent,
      closeOtherTranslation
    );
  }, [closeTranslation, idPrefix]);

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
    if (!selection) return;
    const syncAnchor = () => {
      const container = containerRef.current;
      const trigger = selectionTriggerRef.current;
      if (!container || !trigger) return;
      const anchor = getReaderTranslationAnchor(trigger, container);
      setSelection((current) => current?.id === selection.id
        ? { ...current, anchor }
        : current);
    };
    window.addEventListener("resize", syncAnchor);
    return () => window.removeEventListener("resize", syncAnchor);
  }, [selection]);

  useEffect(() => {
    if (!selection) return;
    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest("[data-reader-translation-id], [data-reader-translation-popover]")
      ) {
        return;
      }
      closeTranslation(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
  }, [closeTranslation, selection]);

  useEffect(() => {
    onSentenceCatalog?.(
      sentences.map((sentence, index) => ({
        id: `${idPrefix}:sentence:${index + 1}`,
        text: sentence.text,
      }))
    );
  // Sentence catalogs are derived from stable loaded content.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPrefix, text]);

  const loadTranslation = async (
    next: Omit<Selection, "anchor">,
    language: string
  ) => {
    setTranslation(null);
    setTranslationSource(null);
    setStatus("loading");
    const input = { text: next.text, from: sourceLanguage, to: language };
    try {
      const cached = await readCachedReaderTranslation(input);
      if (cached) {
        setTranslation(cached.translation);
        setTranslationSource(cached.source);
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
      setTranslationSource(payload.translation.source);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  };

  const translate = async (
    next: Omit<Selection, "anchor">,
    trigger: HTMLElement
  ) => {
    if (selection?.id === next.id) {
      closeTranslation(false);
      return;
    }
    if (!containerRef.current) return;
    selectionTriggerRef.current = trigger;
    setSelection({
      ...next,
      anchor: getReaderTranslationAnchor(trigger, containerRef.current),
    });
    window.dispatchEvent(new CustomEvent(conversationTranslationOpenEvent, {
      detail: idPrefix,
    }));
    setTranslation(null);
    setTranslationSource(null);

    if (
      !targetLanguage ||
      isSameLingoCafeTranslationLanguage(sourceLanguage, targetLanguage)
    ) {
      setStatus("choose-language");
      return;
    }

    await loadTranslation(next, targetLanguage);
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
          {playbackText ?? sentence.split(/(\p{L}[\p{L}\p{M}'’\-]*|\p{N}+)/gu).map((part, wordIndex) => {
            if (!/^(\p{L}|\p{N})/u.test(part)) return part;
            const wordId = `${sentenceId}:word:${wordIndex}`;
            const selected = selection?.id === wordId;
            return (
              <span
                key={wordId}
                role="button"
                tabIndex={0}
                data-reader-translation-id={wordId}
                aria-pressed={selected}
                onClick={(event) => void translate({ id: wordId, sentenceId, text: part }, event.currentTarget)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  void translate({ id: wordId, sentenceId, text: part }, event.currentTarget);
                }}
                className="rounded-[3px] text-left outline-none transition-colors hover:bg-[var(--reader-hover-bg)] focus-visible:ring-2 focus-visible:ring-ring/60"
                style={getTranslationSelectionStyle(selected)}
              >{part}</span>
            );
          })}
        </span>
      );
    }
    return (
      <span
        key={sentenceId}
        role="button"
        tabIndex={0}
        data-reader-sentence-id={sentenceId}
        data-reader-translation-id={sentenceId}
        aria-pressed={selection?.id === sentenceId}
        onClick={(event) => void translate({ id: sentenceId, sentenceId, text: sentence.trim() }, event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          void translate({ id: sentenceId, sentenceId, text: sentence.trim() }, event.currentTarget);
        }}
        className={cn(
          "rounded-[3px] text-left outline-none transition-colors hover:bg-[var(--reader-hover-bg)] focus-visible:ring-2 focus-visible:ring-ring/60",
          active && "bg-primary/15"
        )}
        style={getTranslationSelectionStyle(selection?.id === sentenceId)}
      >
        {playbackText ?? <ReactMarkdown components={inlineMarkdownComponents}>{sentence}</ReactMarkdown>}
      </span>
    );
  };

  return (
    <div ref={containerRef} className={cn("relative", className)} style={style}>
      <div
        role={headingLevel ? "heading" : undefined}
        aria-level={headingLevel}
      >
        {sentences.map((sentence, sentenceIndex) => (
          <Fragment key={`${idPrefix}:display:${sentenceIndex + 1}`}>
            {sentence.separatorBefore}
            {renderSentence(sentence.text, sentenceIndex)}
          </Fragment>
        ))}
      </div>
      {selection ? (
        <ReaderTranslationPopover
          state={{
            anchor: selection.anchor,
            status: status === "idle" ? "success" : status,
            translation,
            source: translationSource,
            error: status === "error"
              ? "Could not translate. Select the text again to retry."
              : null,
          }}
          scope={scope}
          canListen={Boolean(onPlaySelection) && status === "idle"}
          pronunciationPlaying={pronunciationPlaying}
          languageOptions={availableTranslationLanguages}
          onDismiss={() => closeTranslation()}
          onPlaySelection={onPlaySelection
            ? () => onPlaySelection(selection.text, scope)
            : undefined}
          onStartAudiobook={onStartFromHere
            ? () => {
                onStartFromHere(selection.sentenceId);
                closeTranslation(false);
              }
            : undefined}
          onLanguageSelect={(language) => {
            if (isSameLingoCafeTranslationLanguage(sourceLanguage, language)) {
              return;
            }

            const selected = selection;
            setStatus("saving-language");
            void (async () => {
              try {
                const response = await fetch("/api/profile", {
                  method: "PATCH",
                  credentials: "same-origin",
                  cache: "no-store",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    values: { ownLang: language },
                    source: "reader-translation",
                    method: "language-select",
                  }),
                });
                const payload = (await response.json().catch(() => null)) as
                  | ProfileApiResponse
                  | null;

                if (!response.ok) {
                  throw new Error(
                    typeof payload?.message === "string"
                      ? payload.message
                      : "Could not save language."
                  );
                }

                onTargetLanguageChange?.(language);
                await loadTranslation(selected, language);
              } catch {
                setStatus("choose-language");
              }
            })();
          }}
        />
      ) : null}
    </div>
  );
};
