import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getTranslationPronunciationAccessibleLabel,
  getTranslationPronunciationIntent,
  getTranslationPronunciationVisibleLabel,
} from "../src/app/(app)/(lingocafe)/books/_components/reader-playback/translation-pronunciation.ts";

describe("reader translation pronunciation", () => {
  it("starts the requested sentence or word while idle", () => {
    assert.deepEqual(getTranslationPronunciationIntent(false, "sentence"), {
      action: "start",
      type: "sentence",
    });
    assert.deepEqual(getTranslationPronunciationIntent(false, "word"), {
      action: "start",
      type: "word",
    });
  });

  it("stops active pronunciation instead of starting another utterance", () => {
    assert.deepEqual(getTranslationPronunciationIntent(true, "sentence"), {
      action: "stop",
    });
    assert.deepEqual(getTranslationPronunciationIntent(true, "word"), {
      action: "stop",
    });
  });

  it("returns to start intent after active state is cleared", () => {
    const stopped = getTranslationPronunciationIntent(true, "sentence");
    assert.equal(stopped.action, "stop");
    assert.deepEqual(getTranslationPronunciationIntent(false, "sentence"), {
      action: "start",
      type: "sentence",
    });
  });

  it("keeps visible labels stable while exposing play and stop names", () => {
    assert.equal(
      getTranslationPronunciationVisibleLabel("sentence"),
      "Play sentence"
    );
    assert.equal(
      getTranslationPronunciationVisibleLabel("word"),
      "Play word"
    );
    assert.equal(
      getTranslationPronunciationAccessibleLabel("sentence", false),
      "Play sentence"
    );
    assert.equal(
      getTranslationPronunciationAccessibleLabel("sentence", true),
      "Stop sentence"
    );
    assert.equal(
      getTranslationPronunciationAccessibleLabel("word", false),
      "Play word"
    );
    assert.equal(
      getTranslationPronunciationAccessibleLabel("word", true),
      "Stop word"
    );
  });
});
