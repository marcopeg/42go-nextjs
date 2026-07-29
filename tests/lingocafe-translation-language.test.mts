import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  filterLingoCafeTranslationTargets,
  isSameLingoCafeTranslationLanguage,
  normalizeLingoCafeTranslationLanguage,
} from "../src/lib/lingocafe/translation-language.ts";

describe("LingoCafe translation languages", () => {
  it("normalizes language values consistently", () => {
    assert.equal(normalizeLingoCafeTranslationLanguage(" SV "), "sv");
    assert.equal(normalizeLingoCafeTranslationLanguage(null), "");
  });

  it("detects normalized same-language translation directions", () => {
    assert.equal(isSameLingoCafeTranslationLanguage("SV", " sv "), true);
    assert.equal(isSameLingoCafeTranslationLanguage("sv", "en"), false);
  });

  it("removes the reading language from fluent-language choices", () => {
    const options = [
      { code: "en", label: "English" },
      { code: "sv", label: "Swedish" },
      { code: "it", label: "Italian" },
    ];

    assert.deepEqual(filterLingoCafeTranslationTargets(options, " SV "), [
      { code: "en", label: "English" },
      { code: "it", label: "Italian" },
    ]);
  });
});
