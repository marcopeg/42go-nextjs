import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import { applyReaderPlaybackFocus } from "../src/app/(app)/(lingocafe)/books/_components/reader-playback/focus-presentation.ts";

class FakeHTMLElement {
  children: FakeHTMLElement[] = [];
  dataset: Record<string, string> = {};
  hidden: boolean | "until-found" = false;
  parentElement: FakeHTMLElement | null = null;
  style = { opacity: "", visibility: "" };
  private attributes = new Map<string, string>();

  get nextElementSibling() {
    if (!this.parentElement) return null;
    const index = this.parentElement.children.indexOf(this);
    return this.parentElement.children[index + 1] ?? null;
  }

  append(...children: FakeHTMLElement[]) {
    children.forEach((child) => {
      child.parentElement = this;
      this.children.push(child);
    });
    return this;
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
    if (name === "data-reader-sentence-id") {
      this.dataset.readerSentenceId = value;
    }
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }

  matches(selector: string) {
    if (selector === "[data-reader-translation-popover]") {
      return this.attributes.has("data-reader-translation-popover");
    }
    if (
      selector ===
      '[data-reader-translation-id][aria-pressed="true"]'
    ) {
      return (
        this.attributes.has("data-reader-translation-id") &&
        this.attributes.get("aria-pressed") === "true"
      );
    }
    if (selector === "[data-reader-sentence-id]") {
      return this.attributes.has("data-reader-sentence-id");
    }
    return false;
  }

  querySelector(selector: string): FakeHTMLElement | null {
    for (const child of this.children) {
      if (child.matches(selector)) return child;
      const descendant = child.querySelector(selector);
      if (descendant) return descendant;
    }
    return null;
  }

  querySelectorAll(selector: string): FakeHTMLElement[] {
    return this.children.flatMap((child) => [
      ...(child.matches(selector) ? [child] : []),
      ...child.querySelectorAll(selector),
    ]);
  }

  closest(selector: string): FakeHTMLElement | null {
    if (this.matches(selector)) return this;
    return this.parentElement?.closest(selector) ?? null;
  }
}

const originalHTMLElement = globalThis.HTMLElement;

before(() => {
  Object.defineProperty(globalThis, "HTMLElement", {
    configurable: true,
    value: FakeHTMLElement,
  });
});

after(() => {
  Object.defineProperty(globalThis, "HTMLElement", {
    configurable: true,
    value: originalHTMLElement,
  });
});

const sentence = (id: string) => {
  const element = new FakeHTMLElement();
  element.setAttribute("data-reader-sentence-id", id);
  return element;
};

const createReaderTree = () => {
  const article = new FakeHTMLElement();
  const header = new FakeHTMLElement();
  const prefix = new FakeHTMLElement();
  const title = new FakeHTMLElement();
  const titleSentence = sentence("sentence-0");
  const divider = new FakeHTMLElement();
  const summary = new FakeHTMLElement();
  const summarySentence = sentence("sentence-1");
  const body = new FakeHTMLElement();
  const paragraph = new FakeHTMLElement();
  const bodySentence = sentence("sentence-2");
  const laterSentence = sentence("sentence-3");
  const laterParagraph = new FakeHTMLElement();
  const finalSentence = sentence("sentence-4");
  const translationPopover = new FakeHTMLElement();
  translationPopover.setAttribute("data-reader-translation-popover", "");

  title.append(titleSentence);
  summary.append(summarySentence);
  header.append(prefix, title, divider, summary);
  paragraph.append(bodySentence, laterSentence);
  laterParagraph.append(finalSentence);
  body.append(paragraph, laterParagraph);
  article.append(header, body, translationPopover);

  return {
    article,
    body,
    bodySentence,
    finalSentence,
    laterParagraph,
    laterSentence,
    summarySentence,
    titleSentence,
    translationPopover,
  };
};

describe("reader playback focus presentation", () => {
  it("dims prior sentences and visually hides later branches without collapsing them", () => {
    const tree = createReaderTree();
    const restore = applyReaderPlaybackFocus({
      article: tree.article as unknown as HTMLElement,
      activeSentenceId: "sentence-2",
      progressiveReveal: true,
      dimPreviousSentences: true,
    });

    assert.equal(tree.titleSentence.style.opacity, "0.58");
    assert.equal(tree.summarySentence.style.opacity, "0.58");
    assert.equal(tree.bodySentence.style.opacity, "");
    assert.equal(tree.laterSentence.style.visibility, "hidden");
    assert.equal(tree.laterParagraph.style.visibility, "hidden");
    assert.equal(tree.translationPopover.style.visibility, "");
    assert.equal(
      tree.finalSentence.getAttribute("data-reader-playback-state"),
      "future"
    );

    restore();

    assert.equal(tree.titleSentence.style.opacity, "");
    assert.equal(tree.summarySentence.style.opacity, "");
    assert.equal(tree.laterSentence.style.visibility, "");
    assert.equal(tree.laterParagraph.style.visibility, "");
    assert.equal(
      tree.finalSentence.getAttribute("data-reader-playback-state"),
      null
    );
  });

  it("moves the frontier backward and restores content when disabled", () => {
    const tree = createReaderTree();
    const restore = applyReaderPlaybackFocus({
      article: tree.article as unknown as HTMLElement,
      activeSentenceId: "sentence-1",
      progressiveReveal: true,
      dimPreviousSentences: false,
    });

    assert.equal(tree.titleSentence.style.visibility, "");
    assert.equal(tree.body.style.visibility, "hidden");
    assert.equal(tree.translationPopover.style.visibility, "");

    restore();

    assert.equal(tree.body.style.visibility, "");
  });

  it("keeps reveal and dimming independent", () => {
    const tree = createReaderTree();
    const restore = applyReaderPlaybackFocus({
      article: tree.article as unknown as HTMLElement,
      activeSentenceId: "sentence-2",
      progressiveReveal: false,
      dimPreviousSentences: true,
    });

    assert.equal(tree.titleSentence.style.opacity, "0.58");
    assert.equal(tree.summarySentence.style.opacity, "0.58");
    assert.equal(tree.laterSentence.style.visibility, "");
    assert.equal(tree.laterParagraph.style.visibility, "");

    restore();
  });

  it("preserves existing visibility values while hiding future content", () => {
    const tree = createReaderTree();
    tree.laterParagraph.style.visibility = "collapse";

    const restore = applyReaderPlaybackFocus({
      article: tree.article as unknown as HTMLElement,
      activeSentenceId: "sentence-2",
      progressiveReveal: true,
      dimPreviousSentences: false,
    });

    assert.equal(tree.laterParagraph.style.visibility, "hidden");

    restore();

    assert.equal(tree.laterParagraph.style.visibility, "collapse");
  });
});
