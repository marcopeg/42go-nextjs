import assert from "node:assert/strict";
import test from "node:test";

import {
  READER_TRANSLATION_TOUCH_MAX_TAP_MS,
  getMouseTranslationGesture,
  getTouchTranslationGesture,
  isTouchTranslationDoubleTap,
} from "../src/app/(app)/(lingocafe)/books/_components/reader-translation-gesture.ts";

test("touch translation gestures preserve selection and scrolling", () => {
  assert.equal(getTouchTranslationGesture({ tapCount: 1, durationMs: 100, moved: false, selectionActive: false }), "word");
  assert.equal(getTouchTranslationGesture({ tapCount: 2, durationMs: 100, moved: false, selectionActive: false }), "sentence");
  assert.equal(getTouchTranslationGesture({ tapCount: 1, durationMs: 100, moved: true, selectionActive: false }), null);
  assert.equal(getTouchTranslationGesture({ tapCount: 1, durationMs: READER_TRANSLATION_TOUCH_MAX_TAP_MS + 1, moved: false, selectionActive: false }), null);
  assert.equal(getTouchTranslationGesture({ tapCount: 2, durationMs: 100, moved: false, selectionActive: true }), null);
});

test("touch sentence gestures require two nearby taps in the same cadence", () => {
  const previous = { completedAt: 1000, clientX: 100, clientY: 200 };
  assert.equal(isTouchTranslationDoubleTap(previous, { startedAt: 1250, clientX: 110, clientY: 205 }), true);
  assert.equal(isTouchTranslationDoubleTap(previous, { startedAt: 1400, clientX: 110, clientY: 205 }), false);
  assert.equal(isTouchTranslationDoubleTap(previous, { startedAt: 1250, clientX: 180, clientY: 205 }), false);
  assert.equal(isTouchTranslationDoubleTap(null, { startedAt: 1250, clientX: 110, clientY: 205 }), false);
});

test("mouse translation gestures distinguish click from double click", () => {
  assert.equal(getMouseTranslationGesture(1), "word");
  assert.equal(getMouseTranslationGesture(2), "sentence");
});
