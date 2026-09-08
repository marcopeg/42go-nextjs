export const READER_TRANSLATION_SINGLE_CLICK_DELAY_MS = 240;
export const READER_TRANSLATION_TOUCH_DOUBLE_TAP_MS = 325;
export const READER_TRANSLATION_TOUCH_MAX_TAP_MS = 350;
export const READER_TRANSLATION_TOUCH_DOUBLE_TAP_DISTANCE_PX = 48;

export const isTouchTranslationDoubleTap = (
  previous: { completedAt: number; clientX: number; clientY: number } | null,
  current: { startedAt: number; clientX: number; clientY: number }
) =>
  Boolean(
    previous &&
      current.startedAt - previous.completedAt >= 0 &&
      current.startedAt - previous.completedAt <=
        READER_TRANSLATION_TOUCH_DOUBLE_TAP_MS &&
      Math.hypot(
        current.clientX - previous.clientX,
        current.clientY - previous.clientY
      ) <= READER_TRANSLATION_TOUCH_DOUBLE_TAP_DISTANCE_PX
  );

export const getTouchTranslationGesture = ({
  tapCount,
  durationMs,
  moved,
  selectionActive,
}: {
  tapCount: number;
  durationMs: number;
  moved: boolean;
  selectionActive: boolean;
}) => {
  if (
    moved ||
    selectionActive ||
    durationMs > READER_TRANSLATION_TOUCH_MAX_TAP_MS
  ) {
    return null;
  }
  return tapCount >= 2 ? "sentence" : tapCount === 1 ? "word" : null;
};

export const getMouseTranslationGesture = (clickCount: number) =>
  clickCount >= 2 ? "sentence" : clickCount === 1 ? "word" : null;
