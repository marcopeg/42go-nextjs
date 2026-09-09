import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/app/(app)/(lingocafe)/books/_components/BookPageReader.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

// Exercise the reader's actual state callbacks with synchronous hook storage.
// Rendering and network effects are deliberately excluded from this unit test.
const createReader = () => {
  const states = [];
  let cursor = 0;
  const exports = {};
  const react = {
    ...require("react"),
    useState: (initial) => {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (next) => {
        states[index] = typeof next === "function" ? next(states[index]) : next;
      }];
    },
    useRef: () => ({ current: null }),
    useEffect: () => {},
    useLayoutEffect: () => {},
  };
  const mocks = {
    useEventTracker: () => ({ trackEvent: () => {} }),
    getReaderFont: () => ({ family: "Georgia" }),
    getReaderFontSize: () => 21,
    getLingoCafeReaderLanguages: () => ({ own: [] }),
    filterLingoCafeTranslationTargets: () => [],
    isSameLingoCafeTranslationLanguage: (from, to) => from === to,
    splitLingoCafeSentences: (text) => [text],
  };
  runInNewContext(compiled, {
    exports,
    require: (id) => id === "react" ? react : id === "react/jsx-runtime" ? require(id) : mocks,
  });
  const render = () => {
    cursor = 0;
    const tree = exports.BookPageReader({
      bookPage: {
        translation: { from: "sv", to: "en", enabled: true },
        page: { bookId: "book", pageId: "page", title: "Hello", content: "Hello world." },
      },
      preferences: {},
      translationScope: "word",
    });
    return {
      context: tree.props.children[1].props.context,
      popover: tree.props.children[2],
    };
  };
  return { render };
};
const selection = (id, scope = "word") => ({
  id, scope, text: id, sentenceId: "sentence", sentence: "Hello world.", paragraph: "Hello world.", anchor: {},
});

test("first tap opens a scaffold before translation is allowed to load", () => {
  const reader = createReader();
  const finish = reader.render().context.onTranslationSelect(selection("hello"), true);
  assert.equal(reader.render().popover.props.state.status, "pending-gesture");
  finish();
  assert.equal(reader.render().popover.props.state.status, "loading");
});

test("double tap resolves the sentence and invalidates the pending word", () => {
  const reader = createReader();
  const finish = reader.render().context.onTranslationSelect(selection("hello"), true);
  reader.render().context.onTranslationSelect(selection("sentence", "sentence"));
  finish();
  assert.equal(reader.render().popover.props.state.scope, "sentence");
  assert.equal(reader.render().popover.props.state.status, "loading");
});

test("dismissal during the gesture window cannot reopen the popover", () => {
  const reader = createReader();
  const finish = reader.render().context.onTranslationSelect(selection("hello"), true);
  reader.render().popover.props.onDismiss();
  finish();
  assert.equal(reader.render().popover, null);
});

test("an older tap cannot resolve or cancel a newer scaffold", () => {
  const reader = createReader();
  const first = reader.render().context.onTranslationSelect(selection("hello"), true);
  const second = reader.render().context.onTranslationSelect(selection("world"), true);
  first();
  first(true);
  assert.equal(reader.render().popover.props.state.status, "pending-gesture");
  second();
  assert.equal(reader.render().popover.props.state.text, "world");
  assert.equal(reader.render().popover.props.state.status, "loading");
});

test("a cancelled second tap dismisses the pending scaffold", () => {
  const reader = createReader();
  const finish = reader.render().context.onTranslationSelect(selection("hello"), true);
  finish(true);
  assert.equal(reader.render().popover, null);
});
