import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hasExactlyOneLingoCafeSentence,
  splitLingoCafeSentences,
} from "../src/lib/lingocafe/sentence-segmentation.ts";

const normalizeSegments = (text: string) =>
  splitLingoCafeSentences(text).map((segment) => segment.trim());

describe("LingoCafe sentence segmentation", () => {
  it("splits the reported Chapter 20 Swedish regression case", () => {
    const text =
      "Han hade ändrat åsikt om min vän. Förut var han avundsjuk, men nu hade han stor respekt.";

    assert.deepEqual(normalizeSegments(text), [
      "Han hade ändrat åsikt om min vän.",
      "Förut var han avundsjuk, men nu hade han stor respekt.",
    ]);
    assert.equal(hasExactlyOneLingoCafeSentence(text), false);
  });

  it("splits a sentence before a Swedish dialogue dash", () => {
    const text =
      "Han var spänd och glad. – Jag tror att vi arbetar med något stort.";

    assert.deepEqual(normalizeSegments(text), [
      "Han var spänd och glad.",
      "– Jag tror att vi arbetar med något stort.",
    ]);
    assert.equal(hasExactlyOneLingoCafeSentence(text), false);
  });

  it("keeps abbreviation and initial fragments with their sentence", () => {
    assert.deepEqual(normalizeSegments("Dr. Watson arrived."), [
      "Dr. Watson arrived.",
    ]);
    assert.deepEqual(normalizeSegments("A. Holmes waited."), [
      "A. Holmes waited.",
    ]);
    assert.equal(hasExactlyOneLingoCafeSentence("Dr. Watson arrived."), true);
  });

  it("handles decimal values and terminal closing punctuation", () => {
    assert.deepEqual(normalizeSegments('Värdet är 1.5. Sedan går vi.'), [
      "Värdet är 1.5.",
      "Sedan går vi.",
    ]);
    assert.deepEqual(normalizeSegments('Han sa "Gå." Sedan gick han.'), [
      'Han sa "Gå."',
      "Sedan gick han.",
    ]);
  });

  it("handles non-Latin sentence terminators and rejects deliberate multiple sentences", () => {
    assert.deepEqual(normalizeSegments("これは文です。次の文です。"), [
      "これは文です。",
      "次の文です。",
    ]);
    assert.equal(
      hasExactlyOneLingoCafeSentence("First sentence. Second sentence."),
      false
    );
  });
});
