import type {
  ReaderSpeechProvider,
  ReaderSpeechRequest,
} from "@/app/(app)/(lingocafe)/books/_components/reader-playback/types";

const normalizePrimaryLanguage = (language: string) =>
  language.trim().toLowerCase().split(/[-_]/)[0] || "";

export const createDeviceSpeechProvider = (): ReaderSpeechProvider => {
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
    synthesis.addEventListener("voiceschanged", listener);
    return () => synthesis.removeEventListener("voiceschanged", listener);
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
