"use client";

import {
  Children,
  useEffect,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";

import type { ReaderBookPage } from "@/app/(app)/(lingocafe)/books/_components/book-types";
import {
  readCachedReaderTranslation,
  writeCachedReaderTranslation,
  type ReaderTranslationCacheEntry,
} from "@/app/(app)/(lingocafe)/books/_components/reader-translation-cache";
import {
  getReaderFont,
  getReaderFontSize,
  type ReaderPreferences,
} from "@/app/(app)/(lingocafe)/books/_components/reader-preferences";

type BookPageReaderProps = {
  bookPage: ReaderBookPage;
  preferences: ReaderPreferences;
};

type SentenceSelection = {
  id: string;
  text: string;
  rect: DOMRect;
};

type TranslationStatus = "idle" | "loading" | "success" | "error";

type TranslationState = SentenceSelection & {
  status: TranslationStatus;
  translation: string | null;
  source: ReaderTranslationCacheEntry["source"] | null;
  error: string | null;
};

type SentenceRenderContext = {
  bookPage: ReaderBookPage;
  enabled: boolean;
  activeSentenceId: string | null;
  index: number;
  onSentenceSelect: (selection: SentenceSelection) => void;
};

type TranslationApiResponse = {
  translation?: {
    hash?: unknown;
    from?: unknown;
    to?: unknown;
    text?: unknown;
    translation?: unknown;
    source?: unknown;
  };
  message?: unknown;
};

const popoverMaxWidth = 360;

const hasActiveTextSelection = () => {
  const selection = window.getSelection();
  return (
    !!selection &&
    !selection.isCollapsed &&
    selection.toString().trim().length > 0
  );
};

const splitSentenceSegments = (text: string) => {
  if (!text.trim()) return [text];

  const matches = text.match(
    /(\s*[^.!?。！？]+[.!?。！？]+["')\]]*|\s*[^.!?。！？]+$)/g
  );

  return matches && matches.length > 0 ? matches : [text];
};

const getPopoverStyle = (rect: DOMRect): CSSProperties => {
  const viewportWidth = window.innerWidth;
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;
  const width = Math.min(popoverMaxWidth, Math.max(240, viewportWidth - 32));
  const left = Math.min(
    viewportWidth - 16 - width / 2,
    Math.max(16 + width / 2, rect.left + rect.width / 2)
  );
  const showBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove;

  return {
    position: "fixed",
    left,
    top: showBelow ? rect.bottom + 8 : rect.top - 8,
    width,
    transform: showBelow ? "translateX(-50%)" : "translate(-50%, -100%)",
    zIndex: 60,
  };
};

const normalizeApiTranslation = (
  payload: TranslationApiResponse
): Omit<ReaderTranslationCacheEntry, "lastUsedAt"> | null => {
  const translation = payload.translation;
  if (!translation) return null;

  if (
    typeof translation.hash !== "string" ||
    typeof translation.from !== "string" ||
    typeof translation.to !== "string" ||
    typeof translation.text !== "string" ||
    typeof translation.translation !== "string"
  ) {
    return null;
  }

  const source =
    translation.source === "memory" ||
    translation.source === "database" ||
    translation.source === "google"
      ? translation.source
      : "google";

  return {
    hash: translation.hash,
    from: translation.from,
    to: translation.to,
    text: translation.text,
    translation: translation.translation,
    source,
  };
};

const ReaderTranslationPopover = ({
  state,
}: {
  state: TranslationState;
}) => (
  <div
    data-reader-translation-popover
    className="rounded-md border px-4 py-3 text-sm shadow-lg backdrop-blur"
    style={{
      ...getPopoverStyle(state.rect),
      borderColor: "var(--reader-border)",
      backgroundColor: "var(--reader-bg)",
      color: "var(--reader-fg)",
    }}
  >
    {state.status === "loading" && (
      <span style={{ color: "var(--reader-fg-muted)" }}>Translating...</span>
    )}
    {state.status === "error" && (
      <span className="text-destructive">
        {state.error || "Could not translate."}
      </span>
    )}
    {state.status === "success" && (
      <div className="space-y-2">
        <p className="leading-6">{state.translation}</p>
        {state.source && (
          <p
            className="text-[11px] uppercase tracking-normal"
            style={{ color: "var(--reader-fg-muted)" }}
          >
            {state.source}
          </p>
        )}
      </div>
    )}
  </div>
);

const renderSentenceText = (
  text: string,
  context: SentenceRenderContext
): ReactNode[] =>
  splitSentenceSegments(text).map((segment) => {
    const sentence = segment.trim();
    if (!sentence) return segment;

    const id = `${context.bookPage.page.bookId}:${context.bookPage.page.pageId}:${context.index}`;
    context.index += 1;
    const active = context.activeSentenceId === id;

    if (!context.enabled) return segment;

    const handleSelect = (
      event:
        | ReactMouseEvent<HTMLSpanElement>
        | ReactKeyboardEvent<HTMLSpanElement>
    ) => {
      if (hasActiveTextSelection()) return;
      context.onSentenceSelect({
        id,
        text: sentence,
        rect: event.currentTarget.getBoundingClientRect(),
      });
    };

    return (
      <span
        key={id}
        role="button"
        tabIndex={0}
        data-reader-sentence-id={id}
        onClick={handleSelect}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          handleSelect(event);
        }}
        className="rounded-[3px] px-0.5 transition-colors hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 dark:hover:bg-white/10"
        style={{
          backgroundColor: active ? "var(--reader-fg-soft)" : undefined,
          boxShadow: active ? "0 0 0 1px var(--reader-border)" : undefined,
        }}
      >
        {segment}
      </span>
    );
  });

const renderSentenceChildren = (
  children: ReactNode,
  context: SentenceRenderContext
) =>
  Children.toArray(children).flatMap((child) =>
    typeof child === "string" ? renderSentenceText(child, context) : child
  );

const createMarkdownComponents = (
  preferences: ReaderPreferences,
  context: SentenceRenderContext
): Components => {
  const font = getReaderFont(preferences);

  return {
    h1: ({ children }) => (
      <h1
        className="mb-5 mt-8 text-[2em] font-semibold tracking-normal"
        style={{ fontFamily: font.family, lineHeight: 1.15 }}
      >
        {renderSentenceChildren(children, context)}
      </h1>
    ),
    h2: ({ children }) => (
      <h2
        className="mb-4 mt-7 text-[1.75em] font-semibold tracking-normal"
        style={{ fontFamily: font.family, lineHeight: 1.2 }}
      >
        {renderSentenceChildren(children, context)}
      </h2>
    ),
    h3: ({ children }) => (
      <h3
        className="mb-3 mt-6 text-[1.35em] font-semibold tracking-normal"
        style={{ fontFamily: font.family, lineHeight: 1.28 }}
      >
        {renderSentenceChildren(children, context)}
      </h3>
    ),
    h4: ({ children }) => (
      <h4
        className="mb-3 mt-5 text-[1.15em] font-semibold tracking-normal"
        style={{ fontFamily: font.family, lineHeight: 1.32 }}
      >
        {renderSentenceChildren(children, context)}
      </h4>
    ),
    h5: ({ children }) => (
      <h5
        className="mb-2 mt-4 text-[1em] font-semibold tracking-normal"
        style={{ fontFamily: font.family, lineHeight: 1.35 }}
      >
        {renderSentenceChildren(children, context)}
      </h5>
    ),
    h6: ({ children }) => (
      <h6
        className="mb-2 mt-4 text-[0.92em] font-semibold tracking-normal"
        style={{ fontFamily: font.family, lineHeight: 1.35 }}
      >
        {renderSentenceChildren(children, context)}
      </h6>
    ),
    p: ({ children }) => (
      <p
        className="my-7 break-words text-[1em] leading-[1.85]"
        style={{ fontFamily: font.family }}
      >
        {renderSentenceChildren(children, context)}
      </p>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold">
        {renderSentenceChildren(children, context)}
      </strong>
    ),
    em: ({ children }) => (
      <em className="italic">{renderSentenceChildren(children, context)}</em>
    ),
  };
};

const BookPageMarkdown = ({
  source,
  preferences,
  context,
}: {
  source: string;
  preferences: ReaderPreferences;
  context: SentenceRenderContext;
}) => (
  <div className="min-w-0 max-w-none">
    <ReactMarkdown
      allowedElements={["h1", "h2", "h3", "h4", "h5", "h6", "p", "em", "strong"]}
      components={createMarkdownComponents(preferences, context)}
      skipHtml
    >
      {source}
    </ReactMarkdown>
  </div>
);

export const BookPageReader = ({
  bookPage,
  preferences,
}: BookPageReaderProps) => {
  const font = getReaderFont(preferences);
  const fontSize = getReaderFontSize(preferences);
  const titleSize = Math.round(fontSize * 1.7);
  const summarySize = Math.max(14, Math.round(fontSize * 0.9));
  const translationEnabled =
    bookPage.translation.enabled && !!bookPage.translation.to;
  const [translationState, setTranslationState] =
    useState<TranslationState | null>(null);
  const activeSentenceId = translationState?.id ?? null;
  const sentenceContext: SentenceRenderContext = {
    bookPage,
    enabled: translationEnabled,
    activeSentenceId,
    index: 0,
    onSentenceSelect: (selection) => {
      setTranslationState((current) =>
        current?.id === selection.id
          ? null
          : {
              ...selection,
              status: "loading",
              translation: null,
              source: null,
              error: null,
            }
      );
    },
  };

  useEffect(() => {
    if (
      !translationState ||
      translationState.status !== "loading" ||
      !translationEnabled ||
      !bookPage.translation.to
    ) {
      return;
    }

    const controller = new AbortController();
    const input = {
      text: translationState.text,
      from: bookPage.translation.from,
      to: bookPage.translation.to,
    };

    const loadTranslation = async () => {
      try {
        const cached = await readCachedReaderTranslation(input);
        if (cached) {
          setTranslationState((current) =>
            current?.id === translationState.id
              ? {
                  ...current,
                  status: "success",
                  translation: cached.translation,
                  source: "client",
                  error: null,
                }
              : current
          );
          return;
        }

        const res = await fetch("/api/lingocafe/translate", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal: controller.signal,
        });
        const payload = (await res.json().catch(() => null)) as
          | TranslationApiResponse
          | null;

        if (!res.ok) {
          throw new Error(
            typeof payload?.message === "string"
              ? payload.message
              : "Could not translate."
          );
        }

        const translation = payload ? normalizeApiTranslation(payload) : null;
        if (!translation) {
          throw new Error("Invalid translation response.");
        }

        writeCachedReaderTranslation(translation);
        setTranslationState((current) =>
          current?.id === translationState.id
            ? {
                ...current,
                status: "success",
                translation: translation.translation,
                source: translation.source,
                error: null,
              }
            : current
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;

        setTranslationState((current) =>
          current?.id === translationState.id
            ? {
                ...current,
                status: "error",
                error:
                  error instanceof Error
                    ? error.message
                    : "Could not translate.",
              }
            : current
        );
      }
    };

    void loadTranslation();

    return () => controller.abort();
  }, [
    bookPage.translation.from,
    bookPage.translation.to,
    translationEnabled,
    translationState,
  ]);

  useEffect(() => {
    if (!translationState) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-reader-translation-popover]")) return;
      const sentence = target.closest("[data-reader-sentence-id]");
      if (
        sentence?.getAttribute("data-reader-sentence-id") === translationState.id
      ) {
        return;
      }

      setTranslationState(null);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setTranslationState(null);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [translationState]);

  return (
    <article
      className="mx-auto flex w-full max-w-[680px] flex-col px-1 pb-16 pt-10 md:px-0 md:pb-24 md:pt-24"
      style={{ fontFamily: font.family, fontSize: `${fontSize}px` }}
    >
      <header className="mb-12 text-center">
        {bookPage.page.prefix && (
          <p
            className="mx-auto max-w-xl break-words text-sm"
            style={{ color: "var(--reader-fg-muted)" }}
          >
            {bookPage.page.prefix}
          </p>
        )}
        <h1
          className="mx-auto mt-4 max-w-2xl break-words font-semibold leading-[1.02] tracking-[-0.03em]"
          style={{ fontFamily: font.family, fontSize: `${titleSize}px` }}
        >
          {bookPage.page.title}
        </h1>
        <div
          className="mx-auto mt-8 flex w-52 items-center justify-center gap-3"
          style={{ color: "var(--reader-fg-muted)" }}
        >
          <span
            className="h-px flex-1"
            style={{ backgroundColor: "var(--reader-border)" }}
          />
          <span className="text-lg leading-none">*</span>
          <span
            className="h-px flex-1"
            style={{ backgroundColor: "var(--reader-border)" }}
          />
        </div>
        {bookPage.page.summary && (
          <p
            className="mx-auto mt-8 max-w-xl break-words italic leading-7"
            style={{
              color: "var(--reader-fg-muted)",
              fontFamily: font.family,
              fontSize: `${summarySize}px`,
            }}
          >
            {bookPage.page.summary}
          </p>
        )}
      </header>

      <BookPageMarkdown
        source={bookPage.page.content}
        preferences={preferences}
        context={sentenceContext}
      />
      {translationState && (
        <ReaderTranslationPopover state={translationState} />
      )}
    </article>
  );
};
