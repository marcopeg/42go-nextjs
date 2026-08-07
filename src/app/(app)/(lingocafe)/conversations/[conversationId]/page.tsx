"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Check, ChevronLeft, Star } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Modal } from "@/42go/components/modal";
import { useEventTracker } from "@/42go/events/use-events";
import { AppLayout } from "@/42go/layouts/app";
import { BookReaderFloatingActionBar } from "@/app/(app)/(lingocafe)/books/_components/BookReaderFloatingActionBar";
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
  ConversationBadge,
  ConversationError,
  ConversationLoading,
} from "@/app/(app)/(lingocafe)/conversations/_components/ConversationSharedUI";
import {
  CONVERSATIONS_POLICY,
  getResponseMessage,
  isConversationBand,
  type ConversationDetailResponse,
} from "@/app/(app)/(lingocafe)/conversations/_components/types";
import { Button } from "@/components/ui/button";
import { splitLingoCafeSentences } from "@/lib/lingocafe/sentence-segmentation";
import { cn } from "@/lib/utils";

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
  const readAttemptedRef = useRef("");
  const { trackEvent } = useEventTracker();
  const [data, setData] = useState<ConversationDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutationMessage, setMutationMessage] = useState<string | null>(null);
  const [starPending, setStarPending] = useState(false);

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
    if (!data || readAttemptedRef.current === data.conversation.id) return;
    readAttemptedRef.current = data.conversation.id;
    setData((current) => current ? { ...current, state: { ...current.state, isRead: true }, conversation: { ...current.conversation, isRead: true } } : current);
    void fetch(`/api/lingocafe/conversations/${encodeURIComponent(data.conversation.id)}/read`, {
      method: "PUT",
      credentials: "same-origin",
    }).then(async (response) => {
      if (!response.ok) {
        setMutationMessage(await getResponseMessage(response, "Conversation loaded, but read status could not be saved."));
      }
    }).catch(() => setMutationMessage("Conversation loaded, but read status could not be saved."));
  }, [data]);

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
            <Button variant="neutralGhost" size="icon" asChild>
              <Link href={returnHref} aria-label="Back to conversations"><ChevronLeft className="size-5" /></Link>
            </Button>
            <div className="pointer-events-none absolute inset-x-24 min-w-0 text-center">
              <p className="truncate text-sm font-semibold md:text-base">{data?.conversation.title || "Conversation"}</p>
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
                    <div className="flex flex-wrap justify-center gap-2">
                      <ConversationBadge>{data.conversation.language}</ConversationBadge>
                      <ConversationBadge>{data.conversation.cefrLevel}</ConversationBadge>
                      {data.state.isRead ? (
                        <span className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--reader-fg-muted)" }}>
                          <Check className="size-3.5" /> Read
                        </span>
                      ) : null}
                    </div>
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

                  <ol aria-label="Conversation turns" className="space-y-5">
                    {data.rounds.map((round, roundIndex) => {
                      const actor = actorMap.get(round.actorId);
                      const active = playback.activeSentenceId?.startsWith(`conversation:${data.conversation.id}:round:${round.position}:`) ?? false;
                      return (
                        <li
                          key={round.position}
                          className={cn("flex", roundIndex % 2 === 1 && "justify-end")}
                          aria-label={`Turn ${round.position}, ${actor?.name || round.actorId}`}
                        >
                          <article
                            className={cn("w-full max-w-[92%] rounded-2xl border px-4 py-3 shadow-sm md:max-w-[85%]", active && "border-primary")}
                            style={{
                              borderColor: active ? "var(--primary)" : "var(--reader-border)",
                              backgroundColor: active ? "var(--reader-hover-bg)" : "var(--reader-fg-soft)",
                            }}
                          >
                            <header className="mb-2">
                              <h2 className="text-sm font-semibold">{actor?.name || round.actorId}</h2>
                            </header>
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
