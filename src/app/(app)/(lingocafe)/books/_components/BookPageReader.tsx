"use client";

import {
  Children,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";

import { useEventTracker } from "@/42go/events/use-events";
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

type SentenceAnchor = {
  left: number;
  top: number;
  bottom: number;
  width: number;
  containerWidth: number;
  containerViewportLeft: number;
  viewportWidth: number;
  showBelow: boolean;
};

type SentenceSelection = {
  id: string;
  text: string;
  anchor: SentenceAnchor;
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
  getSentenceAnchor: (element: HTMLElement) => SentenceAnchor | null;
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
const mobilePopoverBreakpointPx = 768;
const tapMovementThresholdPx = 10;

type TapCandidate = {
  pointerId: number;
  clientX: number;
  clientY: number;
  cancelled: boolean;
};

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

const getSentenceAnchorInContainer = (
  element: HTMLElement,
  container: HTMLElement
): SentenceAnchor => {
  const rect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;

  return {
    left: rect.left - containerRect.left,
    top: rect.top - containerRect.top,
    bottom: rect.bottom - containerRect.top,
    width: rect.width,
    containerWidth: containerRect.width,
    containerViewportLeft: containerRect.left,
    viewportWidth: window.innerWidth,
    showBelow: spaceBelow >= 160 || spaceBelow >= spaceAbove,
  };
};

const getPopoverStyle = (anchor: SentenceAnchor): CSSProperties => {
  if (anchor.viewportWidth < mobilePopoverBreakpointPx) {
    return {
      position: "absolute",
      left: -anchor.containerViewportLeft,
      top: anchor.showBelow ? anchor.bottom + 8 : anchor.top - 8,
      width: anchor.viewportWidth,
      transform: anchor.showBelow ? undefined : "translateY(-100%)",
      zIndex: 60,
      borderLeftWidth: 0,
      borderRightWidth: 0,
      borderRadius: 0,
      paddingLeft: 20,
      paddingRight: 20,
    };
  }

  const width = Math.min(
    popoverMaxWidth,
    Math.max(240, anchor.containerWidth - 32)
  );
  const left = Math.min(
    anchor.containerWidth - 16 - width / 2,
    Math.max(16 + width / 2, anchor.left + anchor.width / 2)
  );

  return {
    position: "absolute",
    left,
    top: anchor.showBelow ? anchor.bottom + 8 : anchor.top - 8,
    width,
    transform: anchor.showBelow ? "translateX(-50%)" : "translate(-50%, -100%)",
    zIndex: 60,
  };
};

const getReaderSentenceElement = (id: string) => {
  const escapedId =
    typeof CSS !== "undefined" && CSS.escape
      ? CSS.escape(id)
      : id.replace(/["\\]/g, "\\$&");

  return document.querySelector<HTMLElement>(
    `[data-reader-sentence-id="${escapedId}"]`
  );
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

const getTranslationSourceLabel = (
  source: ReaderTranslationCacheEntry["source"]
) =>
  ({
    client: "CL",
    memory: "MEM",
    database: "DB",
    google: "API",
  })[source];

const ReaderTranslationPopover = ({
  state,
}: {
  state: TranslationState;
}) => (
  <div
    data-reader-translation-popover
    className="relative rounded-md border px-4 py-3 pb-4 backdrop-blur"
    style={{
      ...getPopoverStyle(state.anchor),
      borderColor: "var(--reader-popover-border)",
      backgroundColor: "var(--reader-popover-bg)",
      color: "var(--reader-fg)",
      fontSize: "1em",
      lineHeight: 1.45,
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
      <div>
        <p>{state.translation}</p>
        {state.source && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-1.5 right-2 uppercase tracking-normal"
            style={{
              color: "var(--reader-fg-muted)",
              fontSize: "6px",
              lineHeight: "6px",
              textSizeAdjust: "none",
              WebkitTextSizeAdjust: "none",
            }}
          >
            {getTranslationSourceLabel(state.source)}
          </span>
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

    let tapCandidate: TapCandidate | null = null;
    const isTapMovement = (event: ReactPointerEvent<HTMLSpanElement>) => {
      if (!tapCandidate || tapCandidate.pointerId !== event.pointerId) {
        return false;
      }

      return (
        Math.abs(event.clientX - tapCandidate.clientX) <=
          tapMovementThresholdPx &&
        Math.abs(event.clientY - tapCandidate.clientY) <= tapMovementThresholdPx
      );
    };
    const handleSelect = (target: HTMLSpanElement) => {
      if (hasActiveTextSelection()) return;
      const anchor = context.getSentenceAnchor(target);
      if (!anchor) return;
      context.onSentenceSelect({
        id,
        text: sentence,
        anchor,
      });
    };

    return (
      <span
        key={id}
        role="button"
        tabIndex={0}
        data-reader-sentence-id={id}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          if (event.pointerType === "mouse") {
            handleSelect(event.currentTarget);
            return;
          }

          tapCandidate = {
            pointerId: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY,
            cancelled: false,
          };
        }}
        onPointerMove={(event) => {
          if (!tapCandidate || tapCandidate.pointerId !== event.pointerId) {
            return;
          }

          if (!isTapMovement(event)) {
            tapCandidate.cancelled = true;
          }
        }}
        onPointerCancel={(event) => {
          if (tapCandidate?.pointerId === event.pointerId) {
            tapCandidate = null;
          }
        }}
        onPointerUp={(event) => {
          if (event.pointerType === "mouse") return;
          if (!tapCandidate || tapCandidate.pointerId !== event.pointerId) {
            return;
          }

          const shouldSelect = !tapCandidate.cancelled && isTapMovement(event);
          tapCandidate = null;
          if (shouldSelect) handleSelect(event.currentTarget);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          handleSelect(event.currentTarget);
        }}
        className="cursor-pointer rounded-[3px] px-0.5 transition-colors hover:bg-[var(--reader-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        style={{
          backgroundColor: active ? "var(--reader-highlight-bg)" : undefined,
          color: active ? "var(--reader-highlight-fg)" : undefined,
          position: active ? "relative" : undefined,
          zIndex: active ? 50 : undefined,
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
  const { trackEvent } = useEventTracker();
  const font = getReaderFont(preferences);
  const fontSize = getReaderFontSize(preferences);
  const titleSize = Math.round(fontSize * 1.7);
  const summarySize = Math.max(14, Math.round(fontSize * 0.9));
  const articleRef = useRef<HTMLElement | null>(null);
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
    getSentenceAnchor: (element) =>
      articleRef.current
        ? getSentenceAnchorInContainer(element, articleRef.current)
        : null,
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
      bookId: bookPage.page.bookId,
      pageId: bookPage.page.pageId,
      sentenceId: translationState.id,
    };

    const loadTranslation = async () => {
      try {
        const cached = await readCachedReaderTranslation(input);
        if (cached) {
          trackEvent("page.translate", {
            cache_type: cached.source,
            from: cached.from,
            to: cached.to,
            translation_hash: cached.hash,
            book_id: bookPage.page.bookId,
            page_id: bookPage.page.pageId,
            sentence_id: translationState.id,
          });
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
    bookPage.page.bookId,
    bookPage.page.pageId,
    trackEvent,
    translationEnabled,
    translationState,
  ]);

  useEffect(() => {
    if (!activeSentenceId) return;

    let frame = 0;
    const syncPopoverAnchor = () => {
      frame = 0;
      const sentence = getReaderSentenceElement(activeSentenceId);
      const container = articleRef.current;
      if (!sentence || !container) return;
      const anchor = getSentenceAnchorInContainer(sentence, container);
      setTranslationState((current) =>
        current?.id === activeSentenceId ? { ...current, anchor } : current
      );
    };
    const scheduleSync = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(syncPopoverAnchor);
    };

    window.addEventListener("resize", scheduleSync);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", scheduleSync);
    };
  }, [activeSentenceId]);

  useEffect(() => {
    if (!activeSentenceId) return;

    let outsideTapCandidate: TapCandidate | null = null;
    const isOutsideTapMovement = (event: PointerEvent) => {
      if (
        !outsideTapCandidate ||
        outsideTapCandidate.pointerId !== event.pointerId
      ) {
        return false;
      }

      return (
        Math.abs(event.clientX - outsideTapCandidate.clientX) <=
          tapMovementThresholdPx &&
        Math.abs(event.clientY - outsideTapCandidate.clientY) <=
          tapMovementThresholdPx
      );
    };
    const isSentenceTarget = (target: EventTarget | null) =>
      target instanceof Element &&
      !!target.closest("[data-reader-sentence-id]");
    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (isSentenceTarget(target)) {
        outsideTapCandidate = null;
        return;
      }

      if (event.pointerType === "touch") {
        outsideTapCandidate = {
          pointerId: event.pointerId,
          clientX: event.clientX,
          clientY: event.clientY,
          cancelled: false,
        };
        return;
      }

      setTranslationState(null);
    };
    const cancelOutsidePointer = (event: PointerEvent) => {
      if (outsideTapCandidate?.pointerId === event.pointerId) {
        outsideTapCandidate = null;
      }
    };
    const closeOnOutsidePointerMove = (event: PointerEvent) => {
      if (
        !outsideTapCandidate ||
        outsideTapCandidate.pointerId !== event.pointerId
      ) {
        return;
      }

      if (!isOutsideTapMovement(event)) {
        outsideTapCandidate.cancelled = true;
      }
    };
    const closeOnOutsidePointerUp = (event: PointerEvent) => {
      if (
        !outsideTapCandidate ||
        outsideTapCandidate.pointerId !== event.pointerId
      ) {
        return;
      }

      const shouldClose =
        !outsideTapCandidate.cancelled && isOutsideTapMovement(event);
      outsideTapCandidate = null;
      if (shouldClose) setTranslationState(null);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setTranslationState(null);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    document.addEventListener("pointermove", closeOnOutsidePointerMove);
    document.addEventListener("pointerup", closeOnOutsidePointerUp);
    document.addEventListener("pointercancel", cancelOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
      document.removeEventListener("pointermove", closeOnOutsidePointerMove);
      document.removeEventListener("pointerup", closeOnOutsidePointerUp);
      document.removeEventListener("pointercancel", cancelOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeSentenceId]);

  return (
    <article
      ref={articleRef}
      className="relative mx-auto flex w-full max-w-[680px] flex-col px-1 pb-16 pt-10 md:px-0 md:pb-24 md:pt-24"
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
          {renderSentenceText(bookPage.page.title, sentenceContext)}
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
            {renderSentenceText(bookPage.page.summary, sentenceContext)}
          </p>
        )}
      </header>

      <BookPageMarkdown
        source={bookPage.page.content}
        preferences={preferences}
        context={sentenceContext}
      />
      {translationState && <ReaderTranslationPopover state={translationState} />}
    </article>
  );
};
