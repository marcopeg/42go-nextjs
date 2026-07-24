import type {
  ReaderSpeechProvider,
  ReaderSpeechRequest,
} from "@/app/(app)/(lingocafe)/books/_components/reader-playback/types";

const VOICE_DISCOVERY_FALLBACK_MS = 1500;

type VoiceDiscoveryStatus = "pending" | "resolved";

let voiceDiscoveryStarted = false;
let voiceDiscoveryStatus: VoiceDiscoveryStatus = "pending";
let voiceDiscoverySynthesis: SpeechSynthesis | null = null;
let voiceDiscoveryFallbackTimer: ReturnType<typeof setTimeout> | null = null;
const voiceDiscoveryListeners = new Set<() => void>();

const normalizePrimaryLanguage = (language: string) =>
  language.trim().toLowerCase().split(/[-_]/)[0] || "";

const notifyVoiceDiscoveryListeners = () => {
  voiceDiscoveryListeners.forEach((listener) => listener());
};

const resolveVoiceDiscovery = () => {
  if (voiceDiscoveryFallbackTimer) {
    clearTimeout(voiceDiscoveryFallbackTimer);
    voiceDiscoveryFallbackTimer = null;
  }
  voiceDiscoveryStatus = "resolved";
  notifyVoiceDiscoveryListeners();
};

export const preloadDeviceSpeechVoices = () => {
  if (voiceDiscoveryStarted || typeof window === "undefined") return;

  voiceDiscoveryStarted = true;
  const supported =
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined";

  if (!supported) {
    voiceDiscoveryStatus = "resolved";
    notifyVoiceDiscoveryListeners();
    return;
  }

  voiceDiscoverySynthesis = window.speechSynthesis;
  voiceDiscoverySynthesis.addEventListener(
    "voiceschanged",
    resolveVoiceDiscovery
  );

  if (voiceDiscoverySynthesis.getVoices().length > 0) {
    resolveVoiceDiscovery();
    return;
  }

  voiceDiscoveryStatus = "pending";
  voiceDiscoveryFallbackTimer = setTimeout(
    resolveVoiceDiscovery,
    VOICE_DISCOVERY_FALLBACK_MS
  );
};

const subscribeToDeviceSpeechVoices = (listener: () => void) => {
  voiceDiscoveryListeners.add(listener);
  preloadDeviceSpeechVoices();
  return () => voiceDiscoveryListeners.delete(listener);
};

export const createDeviceSpeechProvider = (): ReaderSpeechProvider => {
  preloadDeviceSpeechVoices();

  const supported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined";
  const synthesis = supported ? window.speechSynthesis : null;
  let activeUtterance: SpeechSynthesisUtterance | null = null;

  const getMatchingVoice = (language: string) => {
    if (!synthesis) return null;
    const primaryLanguage = normalizePrimaryLanguage(language);
    if (!primaryLanguage) return null;

    return (
      synthesis
        .getVoices()
        .find(
          (voice) => normalizePrimaryLanguage(voice.lang) === primaryLanguage
        ) ?? null
    );
  };

  const subscribeToVoices = (listener: () => void) => {
    if (!synthesis) return () => undefined;
    return subscribeToDeviceSpeechVoices(listener);
  };

  const speak = (request: ReaderSpeechRequest) => {
    if (!synthesis) return false;
    const voice = getMatchingVoice(request.language);
    if (!voice) return false;

    const utterance = new SpeechSynthesisUtterance(request.text);
    activeUtterance = utterance;
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = request.rate;
    utterance.onstart = request.onStart;
    utterance.onend = request.onEnd;
    utterance.onerror = (event) => {
      if (event.error === "canceled" || event.error === "interrupted") return;
      request.onError(event.error || "Speech playback failed.");
    };
    utterance.onboundary = (event) =>
      request.onBoundary({
        charIndex: event.charIndex,
        charLength: event.charLength,
        name: event.name,
      });

    try {
      synthesis.speak(utterance);
      return true;
    } catch (error) {
      activeUtterance = null;
      request.onError(
        error instanceof Error ? error.message : "speechSynthesis.speak() threw."
      );
      return false;
    }
  };

  return {
    supported,
    isVoiceDiscoveryPending: () => voiceDiscoveryStatus === "pending",
    getMatchingVoice,
    subscribeToVoices,
    speak,
    pause: () => synthesis?.pause(),
    resume: () => synthesis?.resume(),
    cancel: () => {
      if (activeUtterance) {
        activeUtterance.onstart = null;
        activeUtterance.onend = null;
        activeUtterance.onerror = null;
        activeUtterance.onboundary = null;
      }
      activeUtterance = null;
      synthesis?.cancel();
    },
  };
};
