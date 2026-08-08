"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ChevronLeft, Star } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  getReaderFont,
  getReaderFontSize,
  type ReaderTranslationScope,
} from "@/app/(app)/(lingocafe)/books/_components/reader-preferences";
import { useReaderPlayback } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/useReaderPlayback";
import { useReaderPreferences } from "@/app/(app)/(lingocafe)/books/_components/useReaderPreferences";
import {
  ConversationTranslatableText,
} from "@/app/(app)/(lingocafe)/conversations/_components/ConversationTranslation";
import {
  ConversationError,
  ConversationLoading,
} from "@/app/(app)/(lingocafe)/conversations/_components/ConversationSharedUI";
import {
  CONVERSATIONS_POLICY,
  getResponseMessage,
  isConversationBand,
  type ConversationDetailResponse,
} from "@/app/(app)/(lingocafe)/conversations/_components/types";
import { buildConversationThreadLayout } from "@/app/(app)/(lingocafe)/conversations/_components/thread-layout";
import { Button } from "@/components/ui/button";
import { splitLingoCafeSentences } from "@/lib/lingocafe/sentence-segmentation";
import { cn } from "@/lib/utils";

const READER_SCROLL_PROGRESS_IDLE_SAVE_MS = 4000;

const clampProgressBps = (value: number) =>
  Math.min(10000, Math.max(0, Math.round(value)));

const getScrollProgressBps = (element: HTMLElement) => {
  const scrollable = element.scrollHeight - element.clientHeight;
  if (scrollable <= 0) return 0;
  return clampProgressBps((element.scrollTop / scrollable) * 10000);
};

const scrollToProgressBps = (element: HTMLElement, progressBps: number) => {
  const scrollable = element.scrollHeight - element.clientHeight;
  if (scrollable <= 0) {
    if (progressBps === 0) {
      element.scrollTop = 0;
      return true;
    }
    return false;
  }
  element.scrollTop = (scrollable * progressBps) / 10000;
  return true;
};

const parseParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] || "" : value || "";

const safeReturnHref = (value: string | null, band: string | null) => {
  if (value?.startsWith("/conversations") && !value.startsWith("//")) return value;
  const safeBand = isConversationBand(band) ? band : "intermediate";
  return `/conversations?${new URLSearchParams({ band: safeBand })}`;
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

const ConversationReaderPage = () => {
  const params = useParams<{ conversationId: string | string[] }>();
  const searchParams = useSearchParams();
  const conversationId = parseParam(params.conversationId);
  const returnHref = safeReturnHref(searchParams.get("returnTo"), searchParams.get("band"));
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const restoredConversationRef = useRef("");
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestProgressRef = useRef<number | null>(null);
  const { trackEvent } = useEventTracker();
  const [data, setData] = useState<ConversationDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationMessage, setMutationMessage] = useState<string | null>(null);
  const [starPending, setStarPending] = useState(false);
  const [readingProgressBps, setReadingProgressBps] = useState(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/lingocafe/conversations/${encodeURIComponent(conversationId)}`,
        { credentials: "same-origin", cache: "no-store", signal }
      );
      if (!response.ok) throw new Error(await getResponseMessage(response, response.status === 404 ? "Conversation not found." : "Could not load conversation."));
      const payload = (await response.json()) as ConversationDetailResponse;
      if (!isValidDetail(payload)) throw new Error("This conversation contains malformed or incomplete dialogue data.");
      payload.rounds.sort((a, b) => a.position - b.position);
      setData(payload);
      setReadingProgressBps(payload.state.progressBps);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "Could not load conversation.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void load(controller.signal);
    });
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (!data) return;
    const restoreKey = data.conversation.id;
    if (restoredConversationRef.current === restoreKey) return;
    let frame = 0;
    let attempts = 0;

    const restore = () => {
      const element = scrollRef.current;
      if (!element) return;
      const restored = scrollToProgressBps(element, data.state.progressBps);
      if (restored || attempts >= 8) {
        restoredConversationRef.current = restoreKey;
        return;
      }
      attempts += 1;
      frame = requestAnimationFrame(restore);
    };

    frame = requestAnimationFrame(restore);
    return () => {
      if (frame) cancelAnimationFrame(frame);
    };
  }, [data]);

  useEffect(() => {
    const element = scrollRef.current;
    const activeConversationId = data?.conversation.id;
    if (!element || !activeConversationId) return;
    const controller = new AbortController();
    const progressApiHref = `/api/lingocafe/conversations/${encodeURIComponent(activeConversationId)}`;

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
      const progress = getScrollProgressBps(element);
      latestProgressRef.current = progress;
      setReadingProgressBps(progress);

      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        if (latestProgressRef.current === null) return;
        void sendProgress(latestProgressRef.current);
        latestProgressRef.current = null;
        scrollTimerRef.current = null;
      }, READER_SCROLL_PROGRESS_IDLE_SAVE_MS);
    };

    element.addEventListener("scroll", scheduleProgress, { passive: true });
    return () => {
      element.removeEventListener("scroll", scheduleProgress);
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
  }, [data?.conversation.id]);

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
    getScrollContainer: () => scrollRef.current,
    trackEvent,
    restoreLastPlayedSentence: false,
  });
  const {
    preferences: readerPreferences,
    translationScope,
    readerThemeStyle,
    canResetPreferences,
    isOpen: isPreferencesOpen,
    open: openPreferences,
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

  return (
    <AppLayout title={data?.conversation.title || "Conversation"} hideMobileMenu disablePadding stickyHeader={false} policy={CONVERSATIONS_POLICY}>
      <Modal
        open
        onOpenChange={() => undefined}
        ariaLabel="Conversation reader"
        presentation="panel"
        anchor="right"
        size="full"
        showClose={false}
        closeOnOverlayClick={false}
        onOpenAutoFocus={(event) => event.preventDefault()}
        skipOpenAnimation
        skipCloseAnimation
        overlayClassName="pointer-events-none !bg-transparent"
        className="!transform-none md:!w-screen md:!max-w-none md:!border-l-0"
        bodyClassName="flex min-h-0 !overflow-hidden p-0"
      >
        <div
          className="flex h-[100dvh] min-h-0 w-full flex-col"
          style={{
            ...readerThemeStyle,
            backgroundColor: "var(--reader-bg)",
            color: "var(--reader-fg)",
          }}
        >
          <header
            className="relative flex h-16 shrink-0 items-center justify-between gap-3 border-b px-3 md:h-[68px] md:px-8"
            style={{ borderColor: "var(--reader-border)" }}
          >
            <span
              aria-hidden="true"
              className="absolute bottom-[-1px] left-0 h-[2px] bg-blue-500"
              style={{ width: `${(readingProgressBps / 10000) * 100}%` }}
            />
            <Button variant="neutralGhost" size="icon" asChild>
              <Link href={returnHref} aria-label="Back to conversations"><ChevronLeft className="size-5" /></Link>
            </Button>
            <div className="pointer-events-none absolute inset-x-24 min-w-0 text-center">
              <p className="truncate text-sm font-semibold md:text-base">{data?.conversation.title || "Conversation"}</p>
              {data ? (
                <p className="mt-0.5 text-xs" style={{ color: "var(--reader-fg-muted)" }}>
                  {data.conversation.cefrLevel.toUpperCase()} · {data.state.isRead ? "Read" : "Unread"}
                </p>
              ) : null}
            </div>
            <div className="relative z-10 flex items-center gap-1">
              <BookReaderPreferencesTrigger onClick={openPreferences} />
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

          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 md:px-8">
            <main
              className="mx-auto w-full max-w-[680px] pb-28 pt-10 md:pb-32 md:pt-24"
              style={{ fontFamily: readerFont.family, fontSize: `${readerFontSize}px` }}
            >
              {loading && !data ? <ConversationLoading label="Loading conversation…" /> : null}
              {error ? <ConversationError message={error} onRetry={() => void load()} /> : null}
              {mutationMessage ? <div role="status" aria-live="polite" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{mutationMessage}</div> : null}

              {data ? (
                <>
                  <header className="mb-12 text-center">
                    <ConversationTranslatableText
                      text={data.conversation.title}
                      sourceLanguage={data.conversation.language}
                      targetLanguage={data.translation.to}
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

                  <ol aria-label="Conversation turns">
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
                              className={cn(!startsActorRun && "invisible")}
                            />
                            <div
                              className={cn(
                                "flex min-w-0 max-w-[calc(100%_-_2.75rem)] flex-col",
                                isRight ? "items-end" : "items-start"
                              )}
                            >
                              {startsActorRun ? (
                                <p
                                  className={cn("mb-1 px-2 text-xs font-medium", isRight && "text-right")}
                                  style={{ color: "var(--reader-fg-muted)" }}
                                >
                                  {displayName}
                                </p>
                              ) : null}
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
            onOpenChange={handlePreferencesOpenChange}
            preferences={readerPreferences}
            onPreferencesChange={updatePreferences}
            translationScope={translationScope}
            onTranslationScopeChange={updateTranslationScope}
            canResetPreferences={canResetPreferences}
            onResetPreferences={resetPreferences}
            playback={playback}
          />
        </div>
      </Modal>
    </AppLayout>
  );
};

export default ConversationReaderPage;
