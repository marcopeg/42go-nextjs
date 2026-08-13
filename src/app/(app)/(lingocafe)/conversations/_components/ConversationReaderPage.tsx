"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, Star } from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { Modal } from "@/42go/components/modal";
import { useEventTracker } from "@/42go/events/use-events";
import { AppLayout } from "@/42go/layouts/app";
import { BookReaderFloatingActionBar } from "@/app/(app)/(lingocafe)/books/_components/BookReaderFloatingActionBar";
import { PersonaAvatar } from "@/app/(app)/(lingocafe)/_components/PersonaAvatar";
import { BookReaderPlaybackControls } from "@/app/(app)/(lingocafe)/books/_components/BookReaderPlaybackControls";
import {
  BookReaderPreferencesPanel,
  BookReaderPreferencesTrigger,
} from "@/app/(app)/(lingocafe)/books/_components/BookReaderPreferencesPanel";
import {
  ReaderContentSkeleton,
  useReaderEntrySkeleton,
} from "@/app/(app)/(lingocafe)/books/_components/ReaderContentSkeleton";
import {
  getReaderFont,
  getReaderFontSize,
  type ReaderTranslationScope,
} from "@/app/(app)/(lingocafe)/books/_components/reader-preferences";
import { useReaderPlayback } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/useReaderPlayback";
import {
  createElementReaderScrollTarget,
  getReaderScrollProgressBps,
  scrollReaderToProgressBps,
} from "@/app/(app)/(lingocafe)/books/_components/reader-scroll-target";
import {
  getConversationScrollMemoryKey,
  readReaderScrollMemory,
  READER_SCROLL_READY_SELECTOR,
  restoreReaderScrollMemory,
  writeReaderScrollMemory,
  type ReaderScrollSurface,
} from "@/app/(app)/(lingocafe)/books/_components/reader-scroll-memory";
import { useReaderPreferences } from "@/app/(app)/(lingocafe)/books/_components/useReaderPreferences";
import {
  ConversationTranslatableText,
} from "@/app/(app)/(lingocafe)/conversations/_components/ConversationTranslation";
import {
  ConversationError,
} from "@/app/(app)/(lingocafe)/conversations/_components/ConversationSharedUI";
import {
  CONVERSATIONS_POLICY,
  buildConversationHref,
  getResponseMessage,
  type ConversationDetailResponse,
} from "@/app/(app)/(lingocafe)/conversations/_components/types";
import { buildConversationThreadLayout } from "@/app/(app)/(lingocafe)/conversations/_components/thread-layout";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { splitLingoCafeSentences } from "@/lib/lingocafe/sentence-segmentation";
import { cn } from "@/lib/utils";

const READER_SCROLL_PROGRESS_IDLE_SAVE_MS = 4000;
const READER_OVERLAY_SCROLL_RESTORE_INTERVAL_MS = 50;
const READER_OVERLAY_SCROLL_RESTORE_MAX_ATTEMPTS = 40;
const READER_CONTENT_RESTORE_INTERVAL_MS = 25;
const READER_CONTENT_RESTORE_MAX_ATTEMPTS = 200;

const subscribeToDesktopReader = (onStoreChange: () => void) => {
  const query = window.matchMedia("(min-width: 768px)");
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
};

const getDesktopReaderSnapshot = () =>
  window.matchMedia("(min-width: 768px)").matches;

const getDesktopReaderServerSnapshot = () => false;

const parseParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || "" : value || "";

const safeReturnHref = (value: string | null) => {
  if (value?.startsWith("/conversations") && !value.startsWith("//")) return value;
  return "/conversations";
};

const replaceConversationReaderHistory = (href: string) => {
  if (typeof window === "undefined") return;
  const currentHref = `${window.location.pathname}${window.location.search}`;
  if (currentHref === href) return;
  window.history.replaceState(null, "", href);
};

const isValidDetail = (value: ConversationDetailResponse) =>
  Boolean(
    value?.conversation?.id &&
      value.conversation.title &&
      Array.isArray(value.actors) &&
      Array.isArray(value.rounds) &&
      value.rounds.length > 0 &&
      value.rounds.every(
        (round) =>
          Number.isInteger(round.position) &&
          round.position > 0 &&
          typeof round.actorId === "string" &&
          typeof round.text === "string" &&
          round.text.trim()
      )
  );

const ConversationReaderShell = ({
  children,
  isDesktopReader,
  onClose,
}: {
  children: ReactNode;
  isDesktopReader: boolean;
  onClose: () => void;
}) => {
  return (
    <Modal
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      ariaLabel="Conversation reader"
      presentation="panel"
      anchor="right"
      size="full"
      showClose={false}
      closeOnOverlayClick={false}
      swipeToClose={!isDesktopReader}
      swipeFromEdge={!isDesktopReader}
      onOpenAutoFocus={(event) => event.preventDefault()}
      skipOpenAnimation={isDesktopReader}
      skipCloseAnimation={isDesktopReader}
      overlayClassName="!bg-transparent"
      className="h-[100dvh] min-h-0 will-change-transform md:!transform-none md:!w-screen md:!max-w-none md:!border-l-0"
      bodyClassName="flex min-h-0 !overflow-hidden p-0"
    >
      {children}
    </Modal>
  );
};

export const ConversationReaderPage = ({
  intercepted = false,
}: {
  intercepted?: boolean;
}) => {
  const params = useParams<{ conversationId: string | string[] }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = parseParam(params.conversationId);
  const returnHref = safeReturnHref(searchParams.get("returnTo"));
  const isDesktopReader = useSyncExternalStore(
    subscribeToDesktopReader,
    getDesktopReaderSnapshot,
    getDesktopReaderServerSnapshot
  );
  const desktopScrollRef = useRef<HTMLDivElement | null>(null);
  const getReaderScrollTarget = useCallback(
    () =>
      desktopScrollRef.current
        ? createElementReaderScrollTarget(desktopScrollRef.current)
        : null,
    []
  );
  const restoredConversationRef = useRef<Record<ReaderScrollSurface, string>>({
    desktop: "",
    mobile: "",
  });
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overlayRestoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const overlayScrollTopRef = useRef<number | null>(null);
  const latestProgressRef = useRef<number | null>(null);
  const displayedProgressRef = useRef(0);
  const scrollPersistenceSuspendedRef = useRef(false);
  const forceTopConversationRef = useRef("");
  const { trackEvent } = useEventTracker();
  const [activeConversationId, setActiveConversationId] = useState(conversationId);
  const [data, setData] = useState<ConversationDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationMessage, setMutationMessage] = useState<string | null>(null);
  const [starPending, setStarPending] = useState(false);
  const [readingProgressBps, setReadingProgressBps] = useState(0);
  const updateDisplayedProgress = useCallback((progressBps: number) => {
    if (displayedProgressRef.current === progressBps) return;
    displayedProgressRef.current = progressBps;
    setReadingProgressBps(progressBps);
  }, []);
  const persistLocalReaderPosition = useCallback(() => {
    const target = getReaderScrollTarget();
    const activeConversationId = data?.conversation.id;
    if (!target || !activeConversationId) return;
    const surfaceKey: ReaderScrollSurface = window.matchMedia(
      "(min-width: 768px)"
    ).matches
      ? "desktop"
      : "mobile";
    writeReaderScrollMemory(
      getConversationScrollMemoryKey(activeConversationId),
      surfaceKey,
      target,
      getReaderScrollProgressBps(target)
    );
  }, [data?.conversation.id, getReaderScrollTarget]);
  const closeReader = useCallback(() => {
    persistLocalReaderPosition();
    scrollPersistenceSuspendedRef.current = true;
    if (intercepted) {
      router.back();
      return;
    }
    router.replace(returnHref, { scroll: false });
  }, [intercepted, persistLocalReaderPosition, returnHref, router]);
  const entrySkeletonPending = useReaderEntrySkeleton();
  const showEntrySkeleton = !isDesktopReader && entrySkeletonPending;
  const showContentSkeleton = showEntrySkeleton || (loading && !data);
  const showReaderContent = Boolean(data) && !showEntrySkeleton;

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/lingocafe/conversations/${encodeURIComponent(activeConversationId)}`,
        { credentials: "same-origin", cache: "no-store", signal }
      );
      if (!response.ok) throw new Error(await getResponseMessage(response, response.status === 404 ? "Conversation not found." : "Could not load conversation."));
      const payload = (await response.json()) as ConversationDetailResponse;
      if (!isValidDetail(payload)) throw new Error("This conversation contains malformed or incomplete dialogue data.");
      payload.rounds.sort((a, b) => a.position - b.position);
      setData(payload);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "Could not load conversation.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [activeConversationId]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void load(controller.signal);
    });
    return () => controller.abort();
  }, [load]);

  useLayoutEffect(() => {
    if (!data) return;
    const surfaceKey: ReaderScrollSurface = isDesktopReader
      ? "desktop"
      : "mobile";
    const restoreKey = `${surfaceKey}:${data.conversation.id}`;
    if (restoredConversationRef.current[surfaceKey] === restoreKey) return;
    scrollPersistenceSuspendedRef.current = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const retryRestore = () => {
      if (attempts >= READER_CONTENT_RESTORE_MAX_ATTEMPTS) return;
      attempts += 1;
      timer = setTimeout(restore, READER_CONTENT_RESTORE_INTERVAL_MS);
    };

    const restore = () => {
      const target = getReaderScrollTarget();
      if (!target) {
        retryRestore();
        return;
      }
      if (!target.contentRoot.querySelector(READER_SCROLL_READY_SELECTOR)) {
        retryRestore();
        return;
      }
      const shouldForceTop = forceTopConversationRef.current === data.conversation.id;
      const scrollMemoryKey = getConversationScrollMemoryKey(data.conversation.id);
      const scrollMemory = shouldForceTop
        ? null
        : readReaderScrollMemory(scrollMemoryKey, surfaceKey);
      const restoredFromMemory = scrollMemory
        ? restoreReaderScrollMemory(target, scrollMemory)
        : false;
      const restored = shouldForceTop
        ? (target.setScrollTop(0), true)
        : restoredFromMemory ||
          scrollReaderToProgressBps(target, data.state.progressBps);
      const restoredProgressBps = shouldForceTop
        ? 0
        : restoredFromMemory && scrollMemory
          ? scrollMemory.progressBps
          : data.state.progressBps;
      if (restored) {
        updateDisplayedProgress(restoredProgressBps);
        restoredConversationRef.current[surfaceKey] = restoreKey;
        writeReaderScrollMemory(
          scrollMemoryKey,
          surfaceKey,
          target,
          restoredProgressBps
        );
        if (shouldForceTop) forceTopConversationRef.current = "";
        scrollPersistenceSuspendedRef.current = false;
        return;
      }
      retryRestore();
    };

    restore();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [data, getReaderScrollTarget, isDesktopReader, updateDisplayedProgress]);

  useEffect(() => {
    const target = getReaderScrollTarget();
    const activeConversationId = data?.conversation.id;
    if (!target || !activeConversationId) return;
    const controller = new AbortController();
    const progressApiHref = `/api/lingocafe/conversations/${encodeURIComponent(activeConversationId)}`;
    const surfaceKey: ReaderScrollSurface = isDesktopReader
      ? "desktop"
      : "mobile";
    const scrollMemoryKey = getConversationScrollMemoryKey(
      activeConversationId
    );

    const sendProgress = async (progress: number) => {
      try {
        const response = await fetch(progressApiHref, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ progress_bps: progress }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Could not save conversation progress.");
        const saved = (await response.json()) as {
          progressBps: number;
          isRead: boolean;
        };
        setData((current) => current
          ? {
              ...current,
              state: {
                ...current.state,
                progressBps: saved.progressBps,
                isRead: saved.isRead,
              },
              conversation: {
                ...current.conversation,
                isRead: saved.isRead,
              },
            }
          : current);
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        console.warn("Could not save conversation progress", caught);
      }
    };

    const scheduleProgress = () => {
      if (scrollPersistenceSuspendedRef.current) return;
      const progress = getReaderScrollProgressBps(target);
      writeReaderScrollMemory(
        scrollMemoryKey,
        surfaceKey,
        target,
        progress
      );
      latestProgressRef.current = progress;
      updateDisplayedProgress(progress);

      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        if (latestProgressRef.current === null) return;
        void sendProgress(latestProgressRef.current);
        latestProgressRef.current = null;
        scrollTimerRef.current = null;
      }, READER_SCROLL_PROGRESS_IDLE_SAVE_MS);
    };

    const removeScrollListener = target.addScrollListener(scheduleProgress);
    return () => {
      removeScrollListener();
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = null;
      }
      if (latestProgressRef.current !== null) {
        void fetch(progressApiHref, {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ progress_bps: latestProgressRef.current }),
        }).catch((caught) => {
          console.warn("Could not save final conversation progress", caught);
        });
        latestProgressRef.current = null;
      }
      controller.abort();
    };
  }, [
    data?.conversation.id,
    getReaderScrollTarget,
    isDesktopReader,
    updateDisplayedProgress,
  ]);

  const playbackCatalog = useMemo(() => {
    if (!data) return [];
    let index = 0;
    return data.rounds.flatMap((round) =>
      splitLingoCafeSentences(round.text)
        .filter((sentence) => sentence.trim())
        .map((sentence, sentenceIndex) => ({
          id: `conversation:${data.conversation.id}:round:${round.position}:sentence:${sentenceIndex + 1}`,
          text: sentence.trim(),
          index: index++,
          paragraphIndex: round.position - 1,
        }))
    );
  }, [data]);

  const playback = useReaderPlayback({
    contentType: "conversation",
    contentId: data?.conversation.id ?? conversationId,
    language: data?.speech?.language || data?.conversation.language || "",
    getScrollTarget: getReaderScrollTarget,
    trackEvent,
    restoreLastPlayedSentence: false,
  });
  const {
    preferences: readerPreferences,
    translationScope,
    readerThemeStyle,
    canResetPreferences,
    isOpen: isPreferencesOpen,
    onOpenChange: handlePreferencesOpenChange,
    updatePreferences,
    updateTranslationScope,
    resetPreferences,
  } = useReaderPreferences({
    trackEvent,
    eventContext: data?.conversation.id
      ? { conversation_id: data.conversation.id }
      : {},
    setSettingsSurfaceOpen: playback.setSettingsSurfaceOpen,
  });
  const readerFont = getReaderFont(readerPreferences);
  const readerFontSize = getReaderFontSize(readerPreferences);
  const titleSize = Math.round(readerFontSize * 1.7);
  const summarySize = Math.max(14, Math.round(readerFontSize * 0.9));
  const registerPlaybackSentences = playback.registerSentences;
  const translationPlaybackProps = {
    pronunciationPlaying:
      playback.translationPronunciationType === translationScope,
    onPlaySelection: playback.canPlay
      ? (text: string, scope: ReaderTranslationScope) => {
          if (scope === "word") {
            playback.playWordFromTranslation(text);
            return;
          }
          playback.playSentenceFromTranslation(text);
        }
      : undefined,
    onTranslationOpenChange: playback.setTranslationPaused,
  };

  useEffect(() => {
    registerPlaybackSentences(playbackCatalog);
  }, [playbackCatalog, registerPlaybackSentences]);

  const actorMap = useMemo(
    () => new Map(data?.actors.map((actor) => [actor.id, actor]) ?? []),
    [data]
  );
  const threadLayout = useMemo(
    () => buildConversationThreadLayout(data?.rounds ?? []),
    [data?.rounds]
  );
  const updateTranslationTargetLanguage = useCallback((language: string) => {
    setData((current) => current
      ? {
          ...current,
          translation: { ...current.translation, to: language },
        }
      : current);
  }, []);

  const handlePreferencesPanelOpenChange = useCallback(
    (next: boolean) => {
      if (!isDesktopReader) {
        if (overlayRestoreTimerRef.current) {
          clearTimeout(overlayRestoreTimerRef.current);
          overlayRestoreTimerRef.current = null;
        }

        if (next && overlayScrollTopRef.current === null) {
          overlayScrollTopRef.current =
            document.scrollingElement?.scrollTop ?? window.scrollY;
        } else if (overlayScrollTopRef.current !== null) {
          const scrollTop = overlayScrollTopRef.current;
          overlayScrollTopRef.current = null;
          let attempts = 0;
          const restoreAfterUnlock = () => {
            if (
              getComputedStyle(document.body).overflow === "hidden" &&
              attempts < READER_OVERLAY_SCROLL_RESTORE_MAX_ATTEMPTS
            ) {
              attempts += 1;
              overlayRestoreTimerRef.current = setTimeout(
                restoreAfterUnlock,
                READER_OVERLAY_SCROLL_RESTORE_INTERVAL_MS
              );
              return;
            }
            window.scrollTo({ top: scrollTop, behavior: "auto" });
            overlayRestoreTimerRef.current = null;
          };
          overlayRestoreTimerRef.current = setTimeout(
            restoreAfterUnlock,
            READER_OVERLAY_SCROLL_RESTORE_INTERVAL_MS
          );
        }
      }

      handlePreferencesOpenChange(next);
    },
    [handlePreferencesOpenChange, isDesktopReader]
  );
  const openPreferencesPanel = useCallback(() => {
    handlePreferencesPanelOpenChange(true);
  }, [handlePreferencesPanelOpenChange]);

  useEffect(
    () => () => {
      if (overlayRestoreTimerRef.current) {
        clearTimeout(overlayRestoreTimerRef.current);
      }
    },
    []
  );

  const toggleStar = async () => {
    if (!data || starPending) return;
    const previous = data.state.isStarred;
    const next = !previous;
    setStarPending(true);
    setMutationMessage(null);
    setData((current) => current ? { ...current, state: { ...current.state, isStarred: next }, conversation: { ...current.conversation, isStarred: next } } : current);
    try {
      const response = await fetch(`/api/lingocafe/conversations/${encodeURIComponent(data.conversation.id)}/star`, {
        method: next ? "PUT" : "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(await getResponseMessage(response, "Could not update star."));
    } catch (caught) {
      setData((current) => current ? { ...current, state: { ...current.state, isStarred: previous }, conversation: { ...current.conversation, isStarred: previous } } : current);
      setMutationMessage(caught instanceof Error ? caught.message : "Could not update star.");
    } finally {
      setStarPending(false);
    }
  };

  const switchConversationLevel = useCallback(
    (nextConversationId: string) => {
      if (!data || nextConversationId === data.conversation.id) return;
      persistLocalReaderPosition();
      scrollPersistenceSuspendedRef.current = true;
      forceTopConversationRef.current = nextConversationId;
      updateDisplayedProgress(0);
      setData(null);
      setLoading(true);
      setActiveConversationId(nextConversationId);
      replaceConversationReaderHistory(
        buildConversationHref({ id: nextConversationId, returnTo: returnHref })
      );
    },
    [data, persistLocalReaderPosition, returnHref, updateDisplayedProgress]
  );

  const reader = (
    <ConversationReaderShell
      isDesktopReader={isDesktopReader}
      onClose={closeReader}
    >
      <div
        className="flex h-full min-h-0 w-full flex-col overflow-x-clip"
        style={{
          ...readerThemeStyle,
          backgroundColor: "var(--reader-bg)",
          color: "var(--reader-fg)",
        }}
      >
          <header
            className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b px-3 md:relative md:h-[68px] md:px-8"
            style={{
              borderColor: "var(--reader-border)",
              backgroundColor: "var(--reader-bg)",
            }}
          >
            <span
              aria-hidden="true"
              className="absolute bottom-[-1px] left-0 h-[2px] bg-blue-500"
              style={{ width: `${(readingProgressBps / 10000) * 100}%` }}
            />
            <DialogClose asChild>
              <Button
                type="button"
                variant="neutralGhost"
                size="icon"
                aria-label="Back to conversations"
              >
                <ChevronLeft className="size-5" />
              </Button>
            </DialogClose>
            <div className="pointer-events-none absolute inset-x-24 min-w-0 text-center">
              <p className="truncate text-sm font-semibold md:text-base">{data?.conversation.title || "Conversation"}</p>
              {data ? (
                <p className="mt-0.5 text-xs" style={{ color: "var(--reader-fg-muted)" }}>
                  {data.conversation.cefrLevel.toUpperCase()} · {data.state.isRead ? "Read" : "Unread"}
                </p>
              ) : null}
            </div>
            <div className="relative z-10 flex items-center gap-1">
              <BookReaderPreferencesTrigger onClick={openPreferencesPanel} />
              {data ? (
                <button
                  type="button"
                  aria-label={data.state.isStarred ? "Unstar conversation" : "Star conversation"}
                  aria-pressed={data.state.isStarred}
                  disabled={starPending}
                  onClick={() => void toggleStar()}
                  className="flex size-11 items-center justify-center rounded-md hover:bg-black/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 dark:hover:bg-white/10"
                  style={{ color: data.state.isStarred ? "var(--primary)" : "var(--reader-fg-muted)" }}
                >
                  <Star aria-hidden="true" className={cn("size-5", data.state.isStarred && "fill-current")} />
                </button>
              ) : null}
            </div>
          </header>

          <div
            ref={desktopScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 md:px-8"
          >
            <main
              className={cn(
                "mx-auto w-full max-w-[680px] pt-10 md:pb-48 md:pt-24",
                playback.isOpen
                  ? "pb-[calc(13rem+env(safe-area-inset-bottom))]"
                  : "pb-[calc(1.75rem+env(safe-area-inset-bottom))]"
              )}
              style={{ fontFamily: readerFont.family, fontSize: `${readerFontSize}px` }}
            >
              {showContentSkeleton ? <ReaderContentSkeleton variant="conversation" /> : null}
              {!showEntrySkeleton && error ? <ConversationError message={error} onRetry={() => void load()} /> : null}
              {mutationMessage ? <div role="status" aria-live="polite" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{mutationMessage}</div> : null}

              {data && showReaderContent ? (
                <>
                  <header className="mb-12 text-center">
                    <ConversationTranslatableText
                      text={data.conversation.title}
                      sourceLanguage={data.conversation.language}
                      targetLanguage={data.translation.to}
                      onTargetLanguageChange={updateTranslationTargetLanguage}
                      context={{ kind: "conversation", conversationId: data.conversation.id }}
                      scope={translationScope}
                      idPrefix={`conversation:${data.conversation.id}:title`}
                      headingLevel={1}
                      className="mx-auto mt-4 max-w-2xl break-words font-semibold leading-[1.02] tracking-[-0.03em]"
                      style={{ fontFamily: readerFont.family, fontSize: `${titleSize}px` }}
                      {...translationPlaybackProps}
                    />
                    <div
                      className="mx-auto mt-8 flex w-52 items-center justify-center gap-3"
                      style={{ color: "var(--reader-fg-muted)" }}
                    >
                      <span className="h-px flex-1" style={{ backgroundColor: "var(--reader-border)" }} />
                      <span className="text-lg leading-none">*</span>
                      <span className="h-px flex-1" style={{ backgroundColor: "var(--reader-border)" }} />
                    </div>
                    {data.conversation.description ? (
                      <ConversationTranslatableText
                        text={data.conversation.description}
                        sourceLanguage={data.translation.from}
                        targetLanguage={data.translation.to}
                        onTargetLanguageChange={updateTranslationTargetLanguage}
                        context={{ kind: "conversation", conversationId: data.conversation.id }}
                        scope={translationScope}
                        idPrefix={`conversation:${data.conversation.id}:description`}
                        className="mx-auto mt-8 max-w-xl break-words italic leading-7"
                        style={{
                          color: "var(--reader-fg-muted)",
                          fontFamily: readerFont.family,
                          fontSize: `${summarySize}px`,
                        }}
                        {...translationPlaybackProps}
                      />
                    ) : null}
                  </header>

                  <ol
                    aria-label="Conversation turns"
                    data-reader-scroll-ready="true"
                  >
                    {data.rounds.map((round, roundIndex) => {
                      const actor = actorMap.get(round.actorId);
                      const placement = threadLayout[roundIndex];
                      const isRight = placement?.side === "right";
                      const startsActorRun = placement?.startsActorRun ?? true;
                      const displayName = actor?.identity.displayName || actor?.name || round.actorId;
                      const persona = actor?.identity.source === "persona"
                        ? actor.identity.persona
                        : null;
                      const active = playback.activeSentenceId?.startsWith(`conversation:${data.conversation.id}:round:${round.position}:`) ?? false;
                      return (
                        <li
                          key={round.position}
                          className={cn(
                            "flex",
                            roundIndex > 0 && (startsActorRun ? "mt-5" : "mt-2"),
                            isRight && "justify-end"
                          )}
                          aria-label={`Turn ${round.position}, ${displayName}`}
                        >
                          <div
                            className={cn(
                              "flex w-full max-w-[96%] items-end gap-2 md:max-w-[88%]",
                              isRight && "flex-row-reverse"
                            )}
                          >
                            <PersonaAvatar
                              displayName={displayName}
                              avatarUrl={persona?.avatarUrl}
                              avatarFallbackUrl={persona?.avatarFallbackUrl}
                              nameAlign={isRight ? "right" : "left"}
                              className={cn(!startsActorRun && "invisible")}
                            />
                            <div
                              className={cn(
                                "flex min-w-0 max-w-[calc(100%_-_2.75rem)] flex-col",
                                isRight ? "items-end" : "items-start"
                              )}
                            >
                              <article
                                className={cn(
                                  "w-fit max-w-full rounded-2xl border px-4 py-3 shadow-sm",
                                  isRight && "text-right",
                                  active && "border-primary"
                                )}
                                style={{
                                  borderColor: active ? "var(--primary)" : "var(--reader-border)",
                                  backgroundColor: active ? "var(--reader-hover-bg)" : "var(--reader-fg-soft)",
                                }}
                              >
                                <ConversationTranslatableText
                                  text={round.text}
                                  sourceLanguage={data.translation.from}
                                  targetLanguage={data.translation.to}
                                  onTargetLanguageChange={updateTranslationTargetLanguage}
                                  context={{ kind: "conversation", conversationId: data.conversation.id }}
                                  scope={translationScope}
                                  idPrefix={`conversation:${data.conversation.id}:round:${round.position}`}
                                  activeSentenceId={playback.activeSentenceId}
                                  activeWordRange={playback.activeWordRange}
                                  className="leading-7"
                                  onStartFromHere={playback.canPlay
                                    ? playback.startAudiobookFromTranslation
                                    : undefined}
                                  {...translationPlaybackProps}
                                />
                              </article>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                  {data.availableLevels.length > 1 ? (
                    <nav
                      aria-label="Available conversation levels"
                      className="mt-16 text-center md:fixed md:top-1/2 md:right-[max(1rem,calc((100vw-680px)/2-5rem))] md:z-20 md:mt-0 md:flex md:w-12 md:-translate-y-1/2 md:flex-col md:items-center"
                    >
                      <div className="flex flex-wrap justify-center gap-2 md:w-12 md:flex-col">
                        {data.availableLevels.map((level) => {
                          const isCurrent = level.id === data.conversation.id;
                          const levelLabel = level.cefrLevel.toUpperCase();
                          return isCurrent ? (
                            <span
                              key={level.id}
                              aria-current="page"
                              aria-label={`Current conversation level ${levelLabel}`}
                              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-primary bg-primary/10 px-3 text-sm font-semibold uppercase text-foreground md:w-12"
                            >
                              {levelLabel}
                            </span>
                          ) : (
                            <button
                              key={level.id}
                              type="button"
                              onClick={() => switchConversationLevel(level.id)}
                              aria-label={`Switch to conversation level ${levelLabel}`}
                              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm font-semibold uppercase outline-none transition-colors hover:bg-[var(--reader-hover-bg)] focus-visible:ring-[3px] focus-visible:ring-ring/50 md:w-12"
                              style={{ borderColor: "var(--reader-border)" }}
                            >
                              {levelLabel}
                            </button>
                          );
                        })}
                      </div>
                    </nav>
                  ) : null}
                  {!playback.capabilityPending && !playback.canPlay && playback.unavailableReason ? (
                    <p role="status" className="mt-8 text-center text-xs text-muted-foreground">Voiceover unavailable: {playback.unavailableReason}</p>
                  ) : null}
                </>
              ) : null}
            </main>
          </div>

          {data ? (
            <BookReaderFloatingActionBar
              playback={playback}
              translationAvailable={data.translation.enabled}
              translationScope={translationScope}
              onTranslationScopeChange={updateTranslationScope}
              readerThemeStyle={readerThemeStyle}
            />
          ) : null}
          <BookReaderPlaybackControls playback={playback} />
          <BookReaderPreferencesPanel
            open={isPreferencesOpen}
            onOpenChange={handlePreferencesPanelOpenChange}
            preferences={readerPreferences}
            onPreferencesChange={updatePreferences}
            translationScope={translationScope}
            onTranslationScopeChange={updateTranslationScope}
            canResetPreferences={canResetPreferences}
            onResetPreferences={resetPreferences}
            playback={playback}
            preserveDocumentScroll={!isDesktopReader}
          />
      </div>
    </ConversationReaderShell>
  );

  if (intercepted) return reader;

  return (
    <AppLayout
      title={data?.conversation.title || "Conversation"}
      hideHeader
      hideMobileMenu
      disablePadding
      stickyHeader={false}
      policy={CONVERSATIONS_POLICY}
    >
      {reader}
    </AppLayout>
  );
};
