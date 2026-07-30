import type { ReaderTranslationPronunciationType } from "@/app/(app)/(lingocafe)/books/_components/reader-playback/types";

export type ReaderTranslationPronunciationIntent =
  | { action: "start"; type: ReaderTranslationPronunciationType }
  | { action: "stop" };

export const getTranslationPronunciationIntent = (
  isActive: boolean,
  requestedType: ReaderTranslationPronunciationType
): ReaderTranslationPronunciationIntent =>
  isActive ? { action: "stop" } : { action: "start", type: requestedType };

export const getTranslationPronunciationVisibleLabel = (
  type: ReaderTranslationPronunciationType
) => (type === "word" ? "Play word" : "Play sentence");

export const getTranslationPronunciationAccessibleLabel = (
  type: ReaderTranslationPronunciationType,
  isActive: boolean
) =>
  `${isActive ? "Stop" : "Play"} ${
    type === "word" ? "word" : "sentence"
  }`;
