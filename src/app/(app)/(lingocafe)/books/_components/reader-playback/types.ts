import type { ReaderPlaybackSpeed } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/model";
import type { ReaderPlaybackPreferences } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/playback-preferences";

export type ReaderPlaybackSentence = {
  id: string;
  text: string;
  index: number;
  paragraphIndex: number;
  isSummary?: boolean;
};

export type ReaderPlaybackWordRange = {
  start: number;
  end: number;
};

export type ReaderPlaybackStatus =
  | "idle"
  | "playing"
  | "paused"
  | "delay"
  | "completed"
  | "error";

export type ReaderTranslationPronunciationType = "sentence" | "word";

export type ReaderSpeechBoundary = {
  charIndex: number;
  charLength: number;
  name: string;
};

export type ReaderSpeechRequest = {
  text: string;
  language: string;
  rate: number;
  onStart: () => void;
  onEnd: () => void;
  onError: (message: string) => void;
  onBoundary: (boundary: ReaderSpeechBoundary) => void;
};

export type ReaderSpeechProvider = {
  supported: boolean;
  isVoiceDiscoveryPending: () => boolean;
  getMatchingVoice: (language: string) => SpeechSynthesisVoice | null;
  subscribeToVoices: (listener: () => void) => () => void;
  speak: (request: ReaderSpeechRequest) => boolean;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
};

export type ReaderPlaybackSettingsSurface =
  | "playback"
  | "preferences"
  | "contents";

export type ReaderPlaybackController = {
  isOpen: boolean;
  canPlay: boolean;
  capabilityPending: boolean;
  unavailableReason: string | null;
  status: ReaderPlaybackStatus;
  translationPronunciationType: ReaderTranslationPronunciationType | null;
  activeSentenceId: string | null;
  activeWordRange: ReaderPlaybackWordRange | null;
  progressBps: number;
  speed: ReaderPlaybackSpeed;
  settingsOpen: boolean;
  preferences: ReaderPlaybackPreferences;
  registerSentences: (sentences: ReaderPlaybackSentence[]) => void;
  selectSentence: (sentenceId: string) => void;
  start: (fromBeginning?: boolean) => void;
  startAudiobookFromTranslation: (sentenceId: string) => void;
  playSentenceFromTranslation: (sentence: string) => void;
  playWordFromTranslation: (word: string) => void;
  togglePause: () => void;
  setTranslationPaused: (isOpen: boolean) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  setSettingsSurfaceOpen: (
    surface: ReaderPlaybackSettingsSurface,
    isOpen: boolean
  ) => void;
  setSpeed: (speed: ReaderPlaybackSpeed) => void;
  setWordHighlighting: (enabled: boolean) => void;
  setSentenceHighlighting: (enabled: boolean) => void;
  setProgressiveReveal: (enabled: boolean) => void;
  setDimPreviousSentences: (enabled: boolean) => void;
  setAutoPauseOnTranslation: (enabled: boolean) => void;
  setAutoPauseOnSettings: (enabled: boolean) => void;
  previewSeek: (progressBps: number | null) => void;
  seek: (progressBps: number) => void;
  close: () => void;
};
