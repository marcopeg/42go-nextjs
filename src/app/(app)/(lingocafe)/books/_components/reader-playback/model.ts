import type { ReaderPlaybackSentence } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/types";

export const READER_PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25] as const;
export const READER_PARAGRAPH_PAUSE_MS = 2000;

export const clampPlaybackBps = (value: number) =>
  Math.min(10000, Math.max(0, Math.round(value)));

export const sentenceIndexToPlaybackBps = (
  index: number,
  sentenceCount: number
) => {
  if (sentenceCount <= 1) return 0;
  return clampPlaybackBps((index / (sentenceCount - 1)) * 10000);
};

export const playbackBpsToSentenceIndex = (
  progressBps: number,
  sentenceCount: number
) => {
  if (sentenceCount <= 1) return 0;
  return Math.min(
    sentenceCount - 1,
    Math.max(
      0,
      Math.round((clampPlaybackBps(progressBps) / 10000) * (sentenceCount - 1))
    )
  );
};

export const areSentenceCatalogsEqual = (
  left: ReaderPlaybackSentence[],
  right: ReaderPlaybackSentence[]
) =>
  left.length === right.length &&
  left.every(
    (sentence, index) =>
      sentence.id === right[index]?.id &&
      sentence.text === right[index]?.text &&
      sentence.paragraphIndex === right[index]?.paragraphIndex
  );

export const getNextPlaybackSpeed = (current: number) => {
  const index = READER_PLAYBACK_SPEEDS.findIndex((speed) => speed === current);
  return READER_PLAYBACK_SPEEDS[(index + 1) % READER_PLAYBACK_SPEEDS.length];
};

export const getReaderSentenceSelector = (sentenceId: string) => {
  const escaped =
    typeof CSS !== "undefined" && CSS.escape
      ? CSS.escape(sentenceId)
      : sentenceId.replace(/["\\]/g, "\\$&");
  return `[data-reader-sentence-id="${escaped}"]`;
};
