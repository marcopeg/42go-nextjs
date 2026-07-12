"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TEventJson } from "@/42go/events";

import { createDeviceSpeechProvider } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/device-speech-provider";
import {
  areSentenceCatalogsEqual,
  getNextPlaybackSpeed,
  getReaderSentenceSelector,
  playbackBpsToSentenceIndex,
  READER_PARAGRAPH_PAUSE_MS,
  READER_SENTENCE_PAUSE_MS,
  READER_SUMMARY_PAUSE_MS,
  sentenceIndexToPlaybackBps,
} from "@/app/(app)/(lingocafe)/books/_components/reader-playback/model";
import type {
  ReaderPlaybackController,
  ReaderPlaybackSentence,
  ReaderPlaybackStatus,
  ReaderPlaybackWordRange,
  ReaderSpeechProvider,
} from "@/app/(app)/(lingocafe)/books/_components/reader-playback/types";

type UseReaderPlaybackInput = {
  bookId: string;
  pageId: string;
  language: string;
  getScrollContainer: () => HTMLElement | null;
  trackEvent: (name: string, data?: TEventJson) => void;
  onPageEnd?: () => void;
  autoStartPageKey?: string | null;
  onAutoStart?: () => void;
};

const getSentenceElement = (container: HTMLElement, sentenceId: string) =>
  container.querySelector<HTMLElement>(getReaderSentenceSelector(sentenceId));

const isElementInContainerViewport = (
  element: HTMLElement,
  container: HTMLElement
) => {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return (
    elementRect.bottom > containerRect.top && elementRect.top < containerRect.bottom
  );
};

const getViewportSentenceIndex = (
  sentences: ReaderPlaybackSentence[],
  container: HTMLElement | null
) => {
  if (!container || sentences.length === 0) return 0;
  const containerRect = container.getBoundingClientRect();
  const viewportCenter = containerRect.top + containerRect.height / 2;
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const sentence of sentences) {
    const element = getSentenceElement(container, sentence.id);
    if (!element) continue;
    const rect = element.getBoundingClientRect();
    const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = sentence.index;
    }
  }

  return closestIndex;
};

const getBoundaryWordRange = (
  sentence: string,
  charIndex: number,
  charLength: number
): ReaderPlaybackWordRange | null => {
  if (!Number.isFinite(charIndex) || charIndex < 0 || charIndex >= sentence.length) {
    return null;
  }

  const fallbackLength = sentence.slice(charIndex).match(/^\S+/)?.[0].length ?? 0;
  const length = charLength > 0 ? charLength : fallbackLength;
  if (length <= 0) return null;
  return {
    start: charIndex,
    end: Math.min(sentence.length, charIndex + length),
  };
};

export const useReaderPlayback = ({
  bookId,
  pageId,
  language,
  getScrollContainer,
  trackEvent,
  onPageEnd,
  autoStartPageKey = null,
  onAutoStart,
}: UseReaderPlaybackInput): ReaderPlaybackController => {
  const providerRef = useRef<ReaderSpeechProvider | null>(null);
  const sentencesRef = useRef<ReaderPlaybackSentence[]>([]);
  const selectedSentenceIdRef = useRef<string | null>(null);
  const activeIndexRef = useRef(-1);
  const generationRef = useRef(0);
  const paragraphTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guidedScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const programmaticScrollRef = useRef(false);
  const pendingIndexRef = useRef<number | null>(null);
  const pausedFromDelayRef = useRef(false);
  const guidedScrollRef = useRef(true);
  const speakIndexRef = useRef<(index: number, autoScroll?: boolean) => void>(
    () => undefined
  );
  const advanceRef = useRef<(index: number, generation: number) => void>(
    () => undefined
  );
  const sentenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPauseMsRef = useRef(READER_SENTENCE_PAUSE_MS);
  const catalogPageKeyRef = useRef("");
  const resetPageKeyRef = useRef("");
  const autoStartedPageKeyRef = useRef("");
  const pausedByTranslationRef = useRef(false);
  const [sentences, setSentences] = useState<ReaderPlaybackSentence[]>([]);
  const [catalogPageKey, setCatalogPageKey] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(
    "Checking device voices..."
  );
  const [status, setStatusState] = useState<ReaderPlaybackStatus>("idle");
  const statusRef = useRef<ReaderPlaybackStatus>("idle");
  const [activeIndex, setActiveIndexState] = useState(-1);
  const [activeWordRange, setActiveWordRange] =
    useState<ReaderPlaybackWordRange | null>(null);
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(1);

  const setStatus = useCallback((next: ReaderPlaybackStatus) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  const setActiveIndex = useCallback((next: number) => {
    activeIndexRef.current = next;
    setActiveIndexState(next);
  }, []);

  const clearParagraphTimer = useCallback(() => {
    if (paragraphTimerRef.current) {
      clearTimeout(paragraphTimerRef.current);
      paragraphTimerRef.current = null;
    }
  }, []);

  const clearSentenceTimer = useCallback(() => {
    if (sentenceTimerRef.current) {
      clearTimeout(sentenceTimerRef.current);
      sentenceTimerRef.current = null;
    }
  }, []);

  const reportPlaybackError = useCallback(
    (stage: string, error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Unknown playback error.";
      setUnavailableReason(message);
      setStatus("error");
      console.warn(`Reader playback failed at ${stage}.`, error);
    },
    [setStatus]
  );

  const clearGuidedScrollTimer = useCallback(() => {
    if (guidedScrollTimerRef.current) {
      clearTimeout(guidedScrollTimerRef.current);
      guidedScrollTimerRef.current = null;
    }
  }, []);

  const cancelCurrentSpeech = useCallback(() => {
    generationRef.current += 1;
    clearParagraphTimer();
    clearSentenceTimer();
    clearGuidedScrollTimer();
    programmaticScrollRef.current = false;
    pendingIndexRef.current = null;
    pausedFromDelayRef.current = false;
    setActiveWordRange(null);
    providerRef.current?.cancel();
  }, [clearGuidedScrollTimer, clearParagraphTimer, clearSentenceTimer]);

  const refreshAvailability = useCallback(() => {
    const provider = providerRef.current;
    if (!provider?.supported) {
      setCanPlay(false);
      setUnavailableReason("Text-to-speech is not available on this device.");
      return;
    }
    if (!language.trim()) {
      setCanPlay(false);
      setUnavailableReason("This book has no playback language.");
      return;
    }
    if (!provider.getMatchingVoice(language)) {
      setCanPlay(false);
      setUnavailableReason(`No ${language.toUpperCase()} voice is installed.`);
      return;
    }
    if (sentencesRef.current.length === 0) {
      setCanPlay(false);
      setUnavailableReason("This page has no readable sentences.");
      return;
    }
    setCanPlay(true);
    setUnavailableReason(null);
  }, [language]);

  useEffect(() => {
    const provider = createDeviceSpeechProvider();
    providerRef.current = provider;
    const availabilityTimer = setTimeout(refreshAvailability, 0);
    const unsubscribe = provider.subscribeToVoices(refreshAvailability);
    return () => {
      clearTimeout(availabilityTimer);
      unsubscribe();
      provider.cancel();
      providerRef.current = null;
    };
  }, [refreshAvailability]);

  const registerSentences = useCallback(
    (nextSentences: ReaderPlaybackSentence[]) => {
      sentencesRef.current = nextSentences;
      const pageKey = `${bookId}:${pageId}`;
      catalogPageKeyRef.current = pageKey;
      setCatalogPageKey(pageKey);
      setSentences((current) => {
        if (areSentenceCatalogsEqual(current, nextSentences)) return current;
        return nextSentences;
      });
      refreshAvailability();
    },
    [bookId, pageId, refreshAvailability]
  );

  const selectSentence = useCallback((sentenceId: string) => {
    selectedSentenceIdRef.current = sentenceId;
  }, []);

  const centerSentence = useCallback(
    (sentenceId: string) => {
      const container = getScrollContainer();
      if (!container) return;
      const element = getSentenceElement(container, sentenceId);
      if (!element) return;
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const targetTop =
        container.scrollTop +
        (elementRect.top - containerRect.top) -
        (container.clientHeight - elementRect.height) / 2;

      clearGuidedScrollTimer();
      programmaticScrollRef.current = true;
      guidedScrollRef.current = true;
      container.scrollTo({
        top: Math.max(0, targetTop),
        behavior: "smooth",
      });
      guidedScrollTimerRef.current = setTimeout(() => {
        guidedScrollTimerRef.current = null;
        programmaticScrollRef.current = false;
      }, 700);
    },
    [clearGuidedScrollTimer, getScrollContainer]
  );

  const speakIndex = useCallback(
    (index: number, autoScroll = false) => {
      try {
        const provider = providerRef.current;
        const sentence = sentencesRef.current[index];
        if (!provider) {
          reportPlaybackError("provider", "Speech provider is not initialized.");
          return;
        }
        if (!sentence) {
          reportPlaybackError(
            "sentence",
            `Sentence ${index} is missing from a catalog of ${sentencesRef.current.length}.`
          );
          return;
        }
        const voice = provider.getMatchingVoice(language);
        if (!voice) {
          reportPlaybackError(
            "voice",
            `No ${language.toUpperCase()} voice is installed.`
          );
          return;
        }

        clearParagraphTimer();
        clearSentenceTimer();
        pendingIndexRef.current = null;
        pausedFromDelayRef.current = false;
        if (autoScroll && guidedScrollRef.current) centerSentence(sentence.id);
        const generation = generationRef.current + 1;
        generationRef.current = generation;
        setActiveIndex(index);
        setActiveWordRange(null);
        setStatus("playing");

        const started = provider.speak({
          text: sentence.text,
          language: voice.lang,
          rate: speedRef.current,
          onStart: () => {
            if (generationRef.current !== generation) return;
            trackEvent("audio.play", {
              language,
              book_id: bookId,
              page_id: pageId,
            });
          },
          onBoundary: (boundary) => {
            if (
              generationRef.current !== generation ||
              boundary.name !== "word"
            ) {
              return;
            }
            setActiveWordRange(
              getBoundaryWordRange(
                sentence.text,
                boundary.charIndex,
                boundary.charLength
              )
            );
          },
          onEnd: () => {
            if (generationRef.current !== generation) return;
            setActiveWordRange(null);
            advanceRef.current(index, generation);
          },
          onError: (message) => {
            if (generationRef.current !== generation) return;
            setActiveWordRange(null);
            reportPlaybackError("utterance", message);
          },
        });

        if (!started && statusRef.current !== "error") {
          reportPlaybackError("speak", "Playback could not start.");
        }
      } catch (error) {
        reportPlaybackError("speak-index", error);
      }
    },
    [
      bookId,
      centerSentence,
      clearParagraphTimer,
      clearSentenceTimer,
      language,
      pageId,
      reportPlaybackError,
      setActiveIndex,
      setStatus,
      trackEvent,
    ]
  );

  const advance = useCallback(
    (index: number, generation: number) => {
      if (generationRef.current !== generation) return;
      const current = sentencesRef.current[index];
      const next = sentencesRef.current[index + 1];
      if (!current || !next) {
        setStatus("completed");
        onPageEnd?.();
        return;
      }

      const container = getScrollContainer();
      const currentElement = container
        ? getSentenceElement(container, current.id)
        : null;
      guidedScrollRef.current = Boolean(
        container &&
          currentElement &&
          isElementInContainerViewport(currentElement, container)
      );

      const pauseMs =
        next.paragraphIndex !== current.paragraphIndex
          ? current.isSummary
            ? READER_SUMMARY_PAUSE_MS
            : READER_PARAGRAPH_PAUSE_MS
          : READER_SENTENCE_PAUSE_MS;

      pendingIndexRef.current = next.index;
      pendingPauseMsRef.current = pauseMs;
      setStatus("delay");
      sentenceTimerRef.current = setTimeout(() => {
        sentenceTimerRef.current = null;
        pendingIndexRef.current = null;
        speakIndexRef.current(next.index, true);
      }, pauseMs);
    },
    [getScrollContainer, onPageEnd, setStatus]
  );

  useEffect(() => {
    speakIndexRef.current = speakIndex;
    advanceRef.current = advance;
  }, [advance, speakIndex]);

  const start = useCallback((fromBeginning = false) => {
    try {
      if (!canPlay) {
        reportPlaybackError(
          "start-availability",
          unavailableReason || "Playback is unavailable."
        );
        return;
      }
      if (sentencesRef.current.length === 0) {
        reportPlaybackError("start-catalog", "No readable sentences were found.");
        return;
      }
      cancelCurrentSpeech();
      setIsOpen(true);
      guidedScrollRef.current = true;
      const selectedIndex = selectedSentenceIdRef.current
        ? sentencesRef.current.findIndex(
            (sentence) => sentence.id === selectedSentenceIdRef.current
          )
        : -1;
      const container = getScrollContainer();
      const atTop = !container || container.scrollTop <= 8;
      const index =
        selectedIndex >= 0
          ? selectedIndex
          : fromBeginning || atTop
            ? 0
            : getViewportSentenceIndex(sentencesRef.current, container);
      if (fromBeginning && container) container.scrollTop = 0;
      speakIndexRef.current(index);
    } catch (error) {
      reportPlaybackError("start", error);
    }
  }, [
    canPlay,
    cancelCurrentSpeech,
    getScrollContainer,
    reportPlaybackError,
    unavailableReason,
  ]);

  /*
   * Keep the explicit sentence delay independent from speech rate. Paragraph
   * delays use the same timer path, with the summary-to-body gap handled by
   * the isSummary flag in the catalog.
   */
  const schedulePendingSentence = useCallback(() => {
    const pendingIndex = pendingIndexRef.current;
    if (pendingIndex === null) return;
    setStatus("delay");
    sentenceTimerRef.current = setTimeout(() => {
      sentenceTimerRef.current = null;
      pendingIndexRef.current = null;
      pausedFromDelayRef.current = false;
      speakIndexRef.current(pendingIndex, true);
    }, pendingPauseMsRef.current);
  }, [setStatus]);

  const togglePause = useCallback(() => {
    const provider = providerRef.current;
    if (!provider) return;
    if (statusRef.current === "playing") {
      provider.pause();
      pausedFromDelayRef.current = false;
      setStatus("paused");
      return;
    }
    if (statusRef.current === "delay") {
      clearParagraphTimer();
      clearSentenceTimer();
      pausedFromDelayRef.current = true;
      setStatus("paused");
      return;
    }
    if (statusRef.current === "paused") {
      if (pausedFromDelayRef.current && pendingIndexRef.current !== null) {
        schedulePendingSentence();
      } else {
        provider.resume();
        setStatus("playing");
      }
      return;
    }
    if (statusRef.current === "completed" || statusRef.current === "error") {
      cancelCurrentSpeech();
      speakIndexRef.current(
        statusRef.current === "completed"
          ? 0
          : Math.max(
              0,
              Math.min(activeIndexRef.current, sentencesRef.current.length - 1)
            )
      );
    }
  }, [
    cancelCurrentSpeech,
    clearParagraphTimer,
    clearSentenceTimer,
    schedulePendingSentence,
    setStatus,
  ]);

  const setTranslationPaused = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        if (pausedByTranslationRef.current) return;
        if (statusRef.current !== "playing" && statusRef.current !== "delay") {
          return;
        }
        pausedByTranslationRef.current = true;
        togglePause();
        return;
      }

      if (!pausedByTranslationRef.current) return;
      pausedByTranslationRef.current = false;
      if (statusRef.current === "paused") togglePause();
    },
    [togglePause]
  );

  const cycleSpeed = useCallback(() => {
    const next = getNextPlaybackSpeed(speedRef.current);
    speedRef.current = next;
    setSpeed(next);
  }, []);

  const seek = useCallback(
    (progressBps: number) => {
      if (sentencesRef.current.length === 0) return;
      const index = playbackBpsToSentenceIndex(
        progressBps,
        sentencesRef.current.length
      );
      cancelCurrentSpeech();
      setIsOpen(true);
      guidedScrollRef.current = true;
      centerSentence(sentencesRef.current[index].id);
      speakIndexRef.current(index);
    },
    [cancelCurrentSpeech, centerSentence]
  );

  const close = useCallback(() => {
    cancelCurrentSpeech();
    setIsOpen(false);
    setActiveIndex(-1);
    setStatus("idle");
    guidedScrollRef.current = true;
  }, [cancelCurrentSpeech, setActiveIndex, setStatus]);

  useEffect(() => {
    const pageKey = `${bookId}:${pageId}`;
    if (resetPageKeyRef.current === pageKey) return;
    resetPageKeyRef.current = pageKey;
    selectedSentenceIdRef.current = null;

    if (autoStartPageKey === pageKey) return;

    const resetTimer = setTimeout(close, 0);
    return () => clearTimeout(resetTimer);
  }, [
    autoStartPageKey,
    bookId,
    close,
    pageId,
  ]);

  useEffect(() => {
    const pageKey = `${bookId}:${pageId}`;
    if (autoStartPageKey !== pageKey || !canPlay) return;
    if (autoStartedPageKeyRef.current === pageKey) return;
    if (sentencesRef.current.length === 0) return;
    if (catalogPageKey !== pageKey || catalogPageKeyRef.current !== pageKey) return;

    autoStartedPageKeyRef.current = pageKey;
    const container = getScrollContainer();
    if (container) container.scrollTop = 0;
    start(true);
    onAutoStart?.();
  }, [
    autoStartPageKey,
    bookId,
    canPlay,
    catalogPageKey,
    getScrollContainer,
    onAutoStart,
    pageId,
    start,
  ]);

  const activeSentenceId = sentences[activeIndex]?.id ?? null;

  useEffect(() => {
    if (!isOpen || !activeSentenceId) return;
    const container = getScrollContainer();
    if (!container) return;
    let frame = 0;
    const syncGuidedState = () => {
      frame = 0;
      if (programmaticScrollRef.current) return;
      const element = getSentenceElement(container, activeSentenceId);
      guidedScrollRef.current = Boolean(
        element && isElementInContainerViewport(element, container)
      );
    };
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(syncGuidedState);
    };
    const markManualScroll = () => {
      clearGuidedScrollTimer();
      programmaticScrollRef.current = false;
    };
    syncGuidedState();
    container.addEventListener("scroll", schedule, { passive: true });
    container.addEventListener("pointerdown", markManualScroll, { passive: true });
    container.addEventListener("touchstart", markManualScroll, { passive: true });
    container.addEventListener("wheel", markManualScroll, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      container.removeEventListener("scroll", schedule);
      container.removeEventListener("pointerdown", markManualScroll);
      container.removeEventListener("touchstart", markManualScroll);
      container.removeEventListener("wheel", markManualScroll);
      window.removeEventListener("resize", schedule);
    };
  }, [
    activeSentenceId,
    clearGuidedScrollTimer,
    getScrollContainer,
    isOpen,
  ]);

  return {
    isOpen,
    canPlay,
    unavailableReason,
    status,
    activeSentenceId,
    activeWordRange,
    progressBps: sentenceIndexToPlaybackBps(activeIndex, sentences.length),
    speed,
    registerSentences,
    selectSentence,
    start,
    togglePause,
    setTranslationPaused,
    cycleSpeed,
    seek,
    close,
  };
};
