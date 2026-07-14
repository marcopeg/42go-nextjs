import {
  READER_PLAYBACK_SPEEDS,
  type ReaderPlaybackSpeed,
} from "@/app/(app)/(lingocafe)/books/_components/reader-playback/model";

export const READER_PLAYBACK_PREFERENCES_STORAGE_KEY =
  "lingocafe.reader.playback-preferences.v1";

export type ReaderPlaybackPreferences = {
  speed: ReaderPlaybackSpeed;
  wordHighlighting: boolean;
  sentenceHighlighting: boolean;
  autoPauseOnTranslation: boolean;
  autoPauseOnSettings: boolean;
};

export const DEFAULT_READER_PLAYBACK_PREFERENCES: ReaderPlaybackPreferences = {
  speed: 1,
  wordHighlighting: true,
  sentenceHighlighting: true,
  autoPauseOnTranslation: true,
  autoPauseOnSettings: true,
};

const isPlaybackSpeed = (value: unknown): value is ReaderPlaybackSpeed =>
  typeof value === "number" &&
  READER_PLAYBACK_SPEEDS.some((speed) => speed === value);

const getBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

export const sanitizeReaderPlaybackPreferences = (
  input: unknown
): ReaderPlaybackPreferences => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ...DEFAULT_READER_PLAYBACK_PREFERENCES };
  }

  const raw = input as Record<string, unknown>;
  return {
    speed: isPlaybackSpeed(raw.speed)
      ? raw.speed
      : DEFAULT_READER_PLAYBACK_PREFERENCES.speed,
    wordHighlighting: getBoolean(
      raw.wordHighlighting,
      DEFAULT_READER_PLAYBACK_PREFERENCES.wordHighlighting
    ),
    sentenceHighlighting: getBoolean(
      raw.sentenceHighlighting,
      DEFAULT_READER_PLAYBACK_PREFERENCES.sentenceHighlighting
    ),
    autoPauseOnTranslation: getBoolean(
      raw.autoPauseOnTranslation,
      DEFAULT_READER_PLAYBACK_PREFERENCES.autoPauseOnTranslation
    ),
    autoPauseOnSettings: getBoolean(
      raw.autoPauseOnSettings,
      DEFAULT_READER_PLAYBACK_PREFERENCES.autoPauseOnSettings
    ),
  };
};

export const readReaderPlaybackPreferences = (): ReaderPlaybackPreferences => {
  if (typeof window === "undefined") {
    return { ...DEFAULT_READER_PLAYBACK_PREFERENCES };
  }

  try {
    const raw = window.localStorage.getItem(
      READER_PLAYBACK_PREFERENCES_STORAGE_KEY
    );
    return raw
      ? sanitizeReaderPlaybackPreferences(JSON.parse(raw))
      : { ...DEFAULT_READER_PLAYBACK_PREFERENCES };
  } catch {
    return { ...DEFAULT_READER_PLAYBACK_PREFERENCES };
  }
};

export const storeReaderPlaybackPreferences = (
  preferences: ReaderPlaybackPreferences
) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      READER_PLAYBACK_PREFERENCES_STORAGE_KEY,
      JSON.stringify(sanitizeReaderPlaybackPreferences(preferences))
    );
  } catch (error) {
    console.warn("Could not save reader playback preferences.", error);
  }
};
