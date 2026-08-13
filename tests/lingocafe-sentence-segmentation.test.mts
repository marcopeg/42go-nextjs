import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hasExactlyOneLingoCafeSentence,
  splitLingoCafeSentenceDisplaySegments,
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

  it("preserves source sentence spacing for separately rendered translation targets", () => {
    assert.deepEqual(
      splitLingoCafeSentenceDisplaySegments(
        "Vanligtvis till klassrummet. I dag till biblioteket."
      ),
      [
        {
          source: "Vanligtvis till klassrummet.",
          text: "Vanligtvis till klassrummet.",
          separatorBefore: "",
        },
        {
          source: "I dag till biblioteket.",
          text: "I dag till biblioteket.",
          separatorBefore: " ",
        },
      ]
    );
    assert.deepEqual(
      splitLingoCafeSentenceDisplaySegments("これは文です。次の文です。"),
      [
        { source: "これは文です。", text: "これは文です。", separatorBefore: "" },
        { source: "次の文です。", text: "次の文です。", separatorBefore: "" },
      ]
    );
  });

  it("keeps inline Markdown inside its sentence while exposing plain translation text", () => {
    assert.deepEqual(
      splitLingoCafeSentenceDisplaySegments(
        "Skeppet *Etna* krockade med saken. **Det** blev sent."
      ),
      [
        {
          source: "Skeppet *Etna* krockade med saken.",
          text: "Skeppet Etna krockade med saken.",
          separatorBefore: "",
        },
        {
          source: "**Det** blev sent.",
          text: "Det blev sent.",
          separatorBefore: " ",
        },
      ]
    );
  });

  it("keeps closing emphasis with the sentence that contains it", () => {
    assert.deepEqual(
      splitLingoCafeSentenceDisplaySegments("Det var *klart.* Nästa steg."),
      [
        {
          source: "Det var *klart.*",
          text: "Det var klart.",
          separatorBefore: "",
        },
        {
          source: "Nästa steg.",
          text: "Nästa steg.",
          separatorBefore: " ",
        },
      ]
    );
  });

  it("does not let Markdown link destinations create sentence boundaries", () => {
    assert.deepEqual(
      splitLingoCafeSentenceDisplaySegments(
        "Läs [det här](https://example.test/one.two). Sedan går vi."
      ),
      [
        {
          source: "Läs [det här](https://example.test/one.two).",
          text: "Läs det här.",
          separatorBefore: "",
        },
        {
          source: "Sedan går vi.",
          text: "Sedan går vi.",
          separatorBefore: " ",
        },
      ]
    );
  });
});
