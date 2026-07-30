"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TEventJson } from "@/42go/events";

import { createDeviceSpeechProvider } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/device-speech-provider";
import {
  areSentenceCatalogsEqual,
  getReaderSentenceSelector,
  playbackBpsToSentenceIndex,
  READER_PARAGRAPH_PAUSE_MS,
  READER_PAGE_TRANSITION_PAUSE_MS,
  READER_SENTENCE_PAUSE_MS,
  READER_SUMMARY_PAUSE_MS,
  READER_TITLE_SUMMARY_PAUSE_MS,
  sentenceIndexToPlaybackBps,
} from "@/app/(app)/(lingocafe)/books/_components/reader-playback/model";
import type { ReaderPlaybackSpeed } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/model";
import {
  readLastPlayedSentenceId,
  storeLastPlayedSentenceId,
} from "@/app/(app)/(lingocafe)/books/_components/reader-playback/playback-memory";
import {
  readReaderPlaybackPreferences,
  storeReaderPlaybackPreferences,
  type ReaderPlaybackPreferences,
} from "@/app/(app)/(lingocafe)/books/_components/reader-playback/playback-preferences";
import { getTranslationPronunciationIntent } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/translation-pronunciation";
import type {
  ReaderPlaybackController,
  ReaderPlaybackSettingsSurface,
  ReaderPlaybackSentence,
  ReaderPlaybackStatus,
  ReaderPlaybackWordRange,
  ReaderSpeechProvider,
  ReaderTranslationPronunciationType,
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
  restoredPageKey?: string;
  restoreLastPlayedSentence?: boolean;
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

const getFirstViewportSentenceIndex = (
  sentences: ReaderPlaybackSentence[],
  container: HTMLElement | null
) => {
  if (!container || sentences.length === 0) return 0;
  const containerRect = container.getBoundingClientRect();

  for (const sentence of sentences) {
    const element = getSentenceElement(container, sentence.id);
    if (element && isElementInContainerViewport(element, container)) {
      return sentence.index;
    }
  }

  // Layout gaps can leave no sentence intersecting the viewport. In that case,
  // use the nearest sentence instead of jumping back to the page title.
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
  restoredPageKey = "",
  restoreLastPlayedSentence = true,
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
  const restoredSentencePageKeyRef = useRef("");
  const lastPlayedSentenceIdRef = useRef<string | null>(null);
  const onAutoStartRef = useRef(onAutoStart);
  const settingsSurfacesRef = useRef(
    new Set<ReaderPlaybackSettingsSurface>()
  );
  const translationOpenRef = useRef(false);
  const autoPauseReasonsRef = useRef(new Set<"settings" | "translation">());
  const autoPausedRef = useRef(false);
  const restartSentenceOnAutoResumeRef = useRef(false);
  const restartSentenceOnManualResumeRef = useRef(false);
  const translationPronunciationActiveRef = useRef(false);
  const [sentences, setSentences] = useState<ReaderPlaybackSentence[]>([]);
  const [catalogPageKey, setCatalogPageKey] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [settingsOpen, setSettingsOpenState] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const [capabilityPending, setCapabilityPending] = useState(true);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(
    "Checking device voices..."
  );
  const [status, setStatusState] = useState<ReaderPlaybackStatus>("idle");
  const statusRef = useRef<ReaderPlaybackStatus>("idle");
  const [translationPronunciationType, setTranslationPronunciationType] =
    useState<ReaderTranslationPronunciationType | null>(null);
  const [activeIndex, setActiveIndexState] = useState(-1);
  const [previewIndex, setPreviewIndexState] = useState<number | null>(null);
  const previewIndexRef = useRef<number | null>(null);
  const [activeWordRange, setActiveWordRange] =
    useState<ReaderPlaybackWordRange | null>(null);
  const [preferences, setPreferences] = useState<ReaderPlaybackPreferences>(
    readReaderPlaybackPreferences
  );
  const preferencesRef = useRef(preferences);
  const speedRef = useRef<ReaderPlaybackSpeed>(preferences.speed);

  const commitPreferences = useCallback(
    (patch: Partial<ReaderPlaybackPreferences>) => {
      const next = { ...preferencesRef.current, ...patch };
      preferencesRef.current = next;
      speedRef.current = next.speed;
      setPreferences(next);
      storeReaderPlaybackPreferences(next);
    },
    []
  );

  const setStatus = useCallback((next: ReaderPlaybackStatus) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  useEffect(() => {
    onAutoStartRef.current = onAutoStart;
  }, [onAutoStart]);

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
    translationPronunciationActiveRef.current = false;
    setTranslationPronunciationType(null);
    setActiveWordRange(null);
    providerRef.current?.cancel();
  }, [clearGuidedScrollTimer, clearParagraphTimer, clearSentenceTimer]);

  const refreshAvailability = useCallback(() => {
    const provider = providerRef.current;
    if (!provider?.supported) {
      setCapabilityPending(false);
      setCanPlay(false);
      setUnavailableReason("Text-to-speech is not available on this device.");
      return;
    }
    if (provider.isVoiceDiscoveryPending()) {
      setCapabilityPending(true);
      setCanPlay(false);
      setUnavailableReason("Checking device voices...");
      return;
    }
    setCapabilityPending(false);
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
      lastPlayedSentenceIdRef.current = readLastPlayedSentenceId(bookId, pageId);
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
    (sentenceId: string, behavior: ScrollBehavior = "smooth") => {
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
        behavior,
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
            lastPlayedSentenceIdRef.current = sentence.id;
            storeLastPlayedSentenceId(bookId, pageId, sentence.id);
            trackEvent("audio.play", {
              type: "sentence",
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
          ? next.isSummary && !current.isSummary
            ? READER_TITLE_SUMMARY_PAUSE_MS
            : current.isSummary
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
      const lastPlayedIndex = lastPlayedSentenceIdRef.current
        ? sentencesRef.current.findIndex(
            (sentence) => sentence.id === lastPlayedSentenceIdRef.current
          )
        : -1;
      const lastPlayedElement =
        container && lastPlayedIndex >= 0
          ? getSentenceElement(
              container,
              sentencesRef.current[lastPlayedIndex].id
            )
          : null;
      const lastPlayedIsVisible = Boolean(
        container &&
          lastPlayedElement &&
          isElementInContainerViewport(lastPlayedElement, container)
      );
      const index =
        selectedIndex >= 0
          ? selectedIndex
          : fromBeginning
            ? 0
            : lastPlayedIsVisible
              ? lastPlayedIndex
              : atTop
                ? 0
                : getFirstViewportSentenceIndex(
                    sentencesRef.current,
                    container
                  );
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
      if (
        restartSentenceOnManualResumeRef.current &&
        activeIndexRef.current >= 0
      ) {
        restartSentenceOnManualResumeRef.current = false;
        cancelCurrentSpeech();
        speakIndexRef.current(activeIndexRef.current);
        return;
      }
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

  const syncAutoPauseReason = useCallback(
    (reason: "settings" | "translation", active: boolean) => {
      const reasons = autoPauseReasonsRef.current;

      if (active) {
        if (reasons.has(reason)) return;
        const wasEmpty = reasons.size === 0;
        reasons.add(reason);
        if (
          wasEmpty &&
          (statusRef.current === "playing" || statusRef.current === "delay")
        ) {
          autoPausedRef.current = true;
          togglePause();
        }
        return;
      }

      if (!reasons.delete(reason)) return;
      if (reasons.size > 0 || !autoPausedRef.current) return;

      autoPausedRef.current = false;
      if (
        restartSentenceOnAutoResumeRef.current &&
        activeIndexRef.current >= 0
      ) {
        restartSentenceOnAutoResumeRef.current = false;
        cancelCurrentSpeech();
        speakIndexRef.current(activeIndexRef.current);
        return;
      }

      restartSentenceOnAutoResumeRef.current = false;
      if (statusRef.current === "paused") togglePause();
    },
    [cancelCurrentSpeech, togglePause]
  );

  const startAudiobookFromTranslation = useCallback(
    (sentenceId: string) => {
      if (!canPlay) return;
      if (
        (statusRef.current === "playing" || statusRef.current === "delay") &&
        !preferencesRef.current.autoPauseOnTranslation
      ) {
        return;
      }
      if (
        (statusRef.current === "playing" || statusRef.current === "delay") &&
        preferencesRef.current.autoPauseOnTranslation
      ) {
        translationOpenRef.current = true;
        syncAutoPauseReason("translation", true);
      }

      translationOpenRef.current = false;
      if (
        autoPausedRef.current &&
        autoPauseReasonsRef.current.has("translation")
      ) {
        autoPauseReasonsRef.current.delete("translation");
        autoPausedRef.current = autoPauseReasonsRef.current.size > 0;
        restartSentenceOnAutoResumeRef.current = false;
      } else {
        syncAutoPauseReason("translation", false);
      }
      const sentenceIndex = sentencesRef.current.findIndex(
        (sentence) => sentence.id === sentenceId
      );
      if (sentenceIndex < 0) {
        reportPlaybackError(
          "translation-sentence",
          "The translated sentence is missing from the playback catalog."
        );
        return;
      }

      cancelCurrentSpeech();
      restartSentenceOnManualResumeRef.current = false;
      setIsOpen(true);
      guidedScrollRef.current = true;
      speakIndexRef.current(sentenceIndex);
    },
    [
      canPlay,
      cancelCurrentSpeech,
      reportPlaybackError,
      syncAutoPauseReason,
    ]
  );

  const playTranslationSelection = useCallback(
    (selection: string, type: ReaderTranslationPronunciationType) => {
      const intent = getTranslationPronunciationIntent(
        translationPronunciationActiveRef.current,
        type
      );
      if (intent.action === "stop") {
        cancelCurrentSpeech();
        return;
      }

      const text = selection.trim();
      if (!canPlay || !text) return;
      if (
        (statusRef.current === "playing" || statusRef.current === "delay") &&
        !preferencesRef.current.autoPauseOnTranslation
      ) {
        return;
      }
      if (
        (statusRef.current === "playing" || statusRef.current === "delay") &&
        preferencesRef.current.autoPauseOnTranslation
      ) {
        translationOpenRef.current = true;
        syncAutoPauseReason("translation", true);
      }

      const provider = providerRef.current;
      const voice = provider?.getMatchingVoice(language);
      if (!provider || !voice) return;

      const hasActiveSentence = activeIndexRef.current >= 0;
      restartSentenceOnAutoResumeRef.current =
        hasActiveSentence &&
        autoPausedRef.current &&
        autoPauseReasonsRef.current.has("translation");
      restartSentenceOnManualResumeRef.current =
        hasActiveSentence &&
        isOpen &&
        statusRef.current === "paused" &&
        !autoPausedRef.current;

      cancelCurrentSpeech();
      translationPronunciationActiveRef.current = true;
      setTranslationPronunciationType(type);
      const generation = generationRef.current + 1;
      generationRef.current = generation;
      const started = provider.speak({
        text,
        language: voice.lang,
        rate: speedRef.current,
        onStart: () => {
          if (generationRef.current !== generation) return;
          trackEvent("audio.play", {
            type,
            language,
            book_id: bookId,
            page_id: pageId,
          });
        },
        onBoundary: () => undefined,
        onEnd: () => {
          if (generationRef.current !== generation) return;
          translationPronunciationActiveRef.current = false;
          setTranslationPronunciationType(null);
        },
        onError: (message) => {
          if (generationRef.current !== generation) return;
          translationPronunciationActiveRef.current = false;
          setTranslationPronunciationType(null);
          console.warn(`Reader ${type} pronunciation failed.`, message);
        },
      });

      if (!started) {
        translationPronunciationActiveRef.current = false;
        setTranslationPronunciationType(null);
        console.warn(`Reader ${type} pronunciation could not start.`);
      }
    },
    [
      bookId,
      canPlay,
      cancelCurrentSpeech,
      isOpen,
      language,
      pageId,
      syncAutoPauseReason,
      trackEvent,
    ]
  );

  const playSentenceFromTranslation = useCallback(
    (sentence: string) => playTranslationSelection(sentence, "sentence"),
    [playTranslationSelection]
  );

  const playWordFromTranslation = useCallback(
    (word: string) => playTranslationSelection(word, "word"),
    [playTranslationSelection]
  );

  const setTranslationPaused = useCallback(
    (isOpen: boolean) => {
      if (!isOpen && translationPronunciationActiveRef.current) {
        cancelCurrentSpeech();
      }
      translationOpenRef.current = isOpen;
      syncAutoPauseReason(
        "translation",
        isOpen && preferencesRef.current.autoPauseOnTranslation
      );
    },
    [cancelCurrentSpeech, syncAutoPauseReason]
  );

  const setSettingsOpen = useCallback(
    (isOpen: boolean) => {
      setSettingsOpenState(isOpen);
      const surfaces = settingsSurfacesRef.current;
      if (isOpen) {
        surfaces.add("playback");
      } else {
        surfaces.delete("playback");
      }
      syncAutoPauseReason(
        "settings",
        surfaces.size > 0 && preferencesRef.current.autoPauseOnSettings
      );
    },
    [syncAutoPauseReason]
  );

  const setSettingsSurfaceOpen = useCallback(
    (surface: ReaderPlaybackSettingsSurface, isOpen: boolean) => {
      if (surface === "playback") {
        setSettingsOpen(isOpen);
        return;
      }

      const surfaces = settingsSurfacesRef.current;
      if (isOpen) {
        surfaces.add(surface);
      } else {
        surfaces.delete(surface);
      }
      syncAutoPauseReason(
        "settings",
        surfaces.size > 0 && preferencesRef.current.autoPauseOnSettings
      );
    },
    [setSettingsOpen, syncAutoPauseReason]
  );

  const setSpeed = useCallback(
    (speed: ReaderPlaybackSpeed) => {
      if (preferencesRef.current.speed === speed) return;
      commitPreferences({ speed });

      if (activeIndexRef.current < 0) return;
      if (autoPausedRef.current) {
        restartSentenceOnAutoResumeRef.current = true;
        return;
      }
      if (statusRef.current !== "playing" && statusRef.current !== "delay") {
        return;
      }

      cancelCurrentSpeech();
      speakIndexRef.current(activeIndexRef.current);
    },
    [cancelCurrentSpeech, commitPreferences]
  );

  const setWordHighlighting = useCallback(
    (enabled: boolean) => commitPreferences({ wordHighlighting: enabled }),
    [commitPreferences]
  );

  const setSentenceHighlighting = useCallback(
    (enabled: boolean) => commitPreferences({ sentenceHighlighting: enabled }),
    [commitPreferences]
  );

  const setProgressiveReveal = useCallback(
    (enabled: boolean) => commitPreferences({ progressiveReveal: enabled }),
    [commitPreferences]
  );

  const setDimPreviousSentences = useCallback(
    (enabled: boolean) =>
      commitPreferences({ dimPreviousSentences: enabled }),
    [commitPreferences]
  );

  const setAutoPauseOnTranslation = useCallback(
    (enabled: boolean) => {
      commitPreferences({ autoPauseOnTranslation: enabled });
      syncAutoPauseReason(
        "translation",
        enabled && translationOpenRef.current
      );
    },
    [commitPreferences, syncAutoPauseReason]
  );

  const setAutoPauseOnSettings = useCallback(
    (enabled: boolean) => {
      commitPreferences({ autoPauseOnSettings: enabled });
      syncAutoPauseReason(
        "settings",
        enabled && settingsSurfacesRef.current.size > 0
      );
    },
    [commitPreferences, syncAutoPauseReason]
  );

  const previewSeek = useCallback(
    (progressBps: number | null) => {
      if (progressBps === null || sentencesRef.current.length === 0) {
        previewIndexRef.current = null;
        setPreviewIndexState(null);
        return;
      }

      const index = playbackBpsToSentenceIndex(
        progressBps,
        sentencesRef.current.length
      );
      if (previewIndexRef.current === index) return;

      previewIndexRef.current = index;
      setPreviewIndexState(index);
      centerSentence(sentencesRef.current[index].id, "auto");
    },
    [centerSentence]
  );

  const seek = useCallback(
    (progressBps: number) => {
      if (sentencesRef.current.length === 0) return;
      const index = playbackBpsToSentenceIndex(
        progressBps,
        sentencesRef.current.length
      );
      previewIndexRef.current = null;
      setPreviewIndexState(null);
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
    settingsSurfacesRef.current.clear();
    setSettingsOpenState(false);
    translationOpenRef.current = false;
    autoPauseReasonsRef.current.clear();
    autoPausedRef.current = false;
    restartSentenceOnAutoResumeRef.current = false;
    restartSentenceOnManualResumeRef.current = false;
    previewIndexRef.current = null;
    setPreviewIndexState(null);
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
    if (!restoreLastPlayedSentence || autoStartPageKey === pageKey) return;
    if (restoredPageKey !== pageKey || catalogPageKey !== pageKey) return;
    if (catalogPageKeyRef.current !== pageKey) return;
    if (restoredSentencePageKeyRef.current === pageKey) return;

    restoredSentencePageKeyRef.current = pageKey;
    const sentenceId = readLastPlayedSentenceId(bookId, pageId);
    lastPlayedSentenceIdRef.current = sentenceId;
    if (!sentenceId) return;

    const sentenceExists = sentencesRef.current.some(
      (sentence) => sentence.id === sentenceId
    );
    const container = getScrollContainer();
    const element = container
      ? getSentenceElement(container, sentenceId)
      : null;
    if (!sentenceExists || !container || !element) return;

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    container.scrollTop = Math.max(
      0,
      container.scrollTop +
        (elementRect.top - containerRect.top) -
        (container.clientHeight - elementRect.height) / 2
    );
  }, [
    autoStartPageKey,
    bookId,
    catalogPageKey,
    getScrollContainer,
    pageId,
    restoreLastPlayedSentence,
    restoredPageKey,
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
    pendingIndexRef.current = 0;
    pendingPauseMsRef.current = READER_PAGE_TRANSITION_PAUSE_MS;
    setActiveIndex(-1);
    setActiveWordRange(null);
    setIsOpen(true);
    setStatus("delay");
    sentenceTimerRef.current = setTimeout(() => {
      sentenceTimerRef.current = null;
      pendingIndexRef.current = null;
      speakIndexRef.current(0);
      onAutoStartRef.current?.();
    }, READER_PAGE_TRANSITION_PAUSE_MS);
  }, [
    autoStartPageKey,
    bookId,
    canPlay,
    catalogPageKey,
    getScrollContainer,
    pageId,
    setActiveIndex,
    setStatus,
  ]);

  const activeSentenceId =
    sentences[previewIndex ?? activeIndex]?.id ?? null;

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
    capabilityPending,
    unavailableReason,
    status,
    translationPronunciationType,
    activeSentenceId,
    activeWordRange: previewIndex === null ? activeWordRange : null,
    progressBps: sentenceIndexToPlaybackBps(activeIndex, sentences.length),
    speed: preferences.speed,
    settingsOpen,
    preferences,
    registerSentences,
    selectSentence,
    start,
    startAudiobookFromTranslation,
    playSentenceFromTranslation,
    playWordFromTranslation,
    togglePause,
    setTranslationPaused,
    setSettingsOpen,
    setSettingsSurfaceOpen,
    setSpeed,
    setWordHighlighting,
    setSentenceHighlighting,
    setProgressiveReveal,
    setDimPreviousSentences,
    setAutoPauseOnTranslation,
    setAutoPauseOnSettings,
    previewSeek,
    seek,
    close,
  };
};
