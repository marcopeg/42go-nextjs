export type ReaderPlaybackSentence = {
  id: string;
  text: string;
  index: number;
  paragraphIndex: number;
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
  getMatchingVoice: (language: string) => SpeechSynthesisVoice | null;
  subscribeToVoices: (listener: () => void) => () => void;
  speak: (request: ReaderSpeechRequest) => boolean;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
};

export type ReaderPlaybackController = {
  isOpen: boolean;
  canPlay: boolean;
  unavailableReason: string | null;
  status: ReaderPlaybackStatus;
  activeSentenceId: string | null;
  activeWordRange: ReaderPlaybackWordRange | null;
  progressBps: number;
  speed: number;
  registerSentences: (sentences: ReaderPlaybackSentence[]) => void;
  selectSentence: (sentenceId: string) => void;
  start: () => void;
  togglePause: () => void;
  cycleSpeed: () => void;
  seek: (progressBps: number) => void;
  close: () => void;
};
