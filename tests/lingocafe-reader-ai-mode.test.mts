import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildReaderAiModePrompt,
  getReaderAiModeUrl,
} from "../src/app/(app)/(lingocafe)/books/_components/reader-ai-mode.ts";

describe("reader AI Mode handoff", () => {
  it("builds a complete sentence-learning prompt in the reader's own language", () => {
    const prompt = buildReaderAiModePrompt({
      scope: "sentence",
      selectedText: "Jag ordnade med pengar till min Babirussa.",
      sentence: "Jag ordnade med pengar till min Babirussa.",
      sourceLanguage: "Swedish",
      responseLanguage: "English",
    });

    assert.match(prompt, /complete Swedish sentence/);
    assert.match(prompt, /Respond in English/);
    assert.match(prompt, /accurate translation/);
    assert.match(prompt, /intended meaning in context/);
    assert.match(prompt, /multi-word or composite expressions/);
    assert.match(prompt, /grammar and sentence-parsing analysis/);
  });

  it("adds the enclosing sentence when explaining a selected word", () => {
    const prompt = buildReaderAiModePrompt({
      scope: "word",
      selectedText: "ordnade",
      sentence: "Jag ordnade med pengar till min Babirussa.",
      sourceLanguage: "Swedish",
      responseLanguage: "English",
    });

    assert.match(prompt, /Swedish word “ordnade”/);
    assert.match(
      prompt,
      /complete sentence: “Jag ordnade med pengar till min Babirussa\.”/
    );
  });

  it("adds paragraph or nearby conversation context when the caller provides it", () => {
    const sentencePrompt = buildReaderAiModePrompt({
      scope: "sentence",
      selectedText: "Det var varmt.",
      sentence: "Det var varmt.",
      sourceLanguage: "Swedish",
      responseLanguage: "English",
      surroundingContext: {
        label: "paragraph context",
        text: "Solen sken. Det var varmt. Vi gick hem.",
      },
    });
    const conversationPrompt = buildReaderAiModePrompt({
      scope: "sentence",
      selectedText: "How are you?",
      sentence: "How are you?",
      sourceLanguage: "English",
      responseLanguage: "Swedish",
      surroundingContext: {
        label: "nearby conversation turns",
        text: "Ada: Hello!\nBen: How are you?\nAda: I'm well.",
      },
    });

    assert.match(sentencePrompt, /Additional paragraph context/);
    assert.match(sentencePrompt, /Solen sken\. Det var varmt\. Vi gick hem\./);
    assert.match(conversationPrompt, /Additional nearby conversation turns/);
    assert.match(conversationPrompt, /Ada: Hello!/);
    assert.match(conversationPrompt, /Ben: How are you\?/);
  });

  it("encodes the prompt in an AI Mode search URL", () => {
    const url = new URL(
      getReaderAiModeUrl({
        scope: "word",
        selectedText: "l'été",
        sentence: "L'été är varmt.",
        sourceLanguage: "Swedish",
        responseLanguage: "French",
      })
    );

    assert.equal(url.origin, "https://www.google.com");
    assert.equal(url.pathname, "/search");
    assert.equal(url.searchParams.get("udm"), "50");
    assert.match(url.searchParams.get("q") || "", /l'été/);
    assert.match(url.searchParams.get("q") || "", /L'été är varmt/);
  });
});
