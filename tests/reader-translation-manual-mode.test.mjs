import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/app/(app)/(lingocafe)/books/_components/BookPageReader.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(`${source}\nexport { ReaderTranslationTarget };`, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

const createTarget = (scope) => {
  const selections = [];
  const exports = {};
  const mocks = {
    getLingoCafeReaderLanguages: () => ({ own: [] }),
    triggerInteractionHaptic: () => {},
  };
  runInNewContext(compiled, {
    exports,
    window: { getSelection: () => null },
    setTimeout: () => { throw new Error("Manual mode must not schedule a gesture"); },
    require: (id) => id === "react" ? {
      ...require("react"), useRef: (current) => ({ current }), useEffect: () => {},
    } : id === "react/jsx-runtime" ? require(id) : mocks,
  });
  const target = { closest: () => null };
  const tree = exports.ReaderTranslationTarget({
    id: "sentence:word:0", sentenceId: "sentence", text: "Hello", sentence: "Hello world.",
    context: {
      translationGestures: false, translationScope: scope, translationEnabled: true,
      onSentenceActivate: () => {}, getSentenceAnchor: () => ({}),
      onTranslationSelect: (selection) => selections.push(selection),
    },
  });
  return { handlers: tree.props, target, selections };
};

for (const scope of ["sentence", "word"]) {
  test(`manual ${scope} mode respects the button for click-only input`, () => {
    const { handlers, target, selections } = createTarget(scope);
    handlers.onClick({ detail: 1, currentTarget: target });
    handlers.onClick({ detail: 2, currentTarget: target });
    handlers.onDoubleClick({ detail: 2, currentTarget: target });
    assert.equal(selections.length, 1);
    assert.equal(selections[0].scope, scope);
    assert.equal(selections[0].text, scope === "sentence" ? "Hello world." : "Hello");
  });

  test(`manual ${scope} mode suppresses the compatibility click after a touch`, () => {
    const { handlers, target, selections } = createTarget(scope);
    const event = { button: 0, pointerType: "touch", pointerId: 1, clientX: 20, clientY: 20, timeStamp: 100, currentTarget: target };
    handlers.onPointerDown(event);
    handlers.onPointerUp(event);
    handlers.onClick({ detail: 1, currentTarget: target });
    handlers.onDoubleClick({ detail: 2, currentTarget: target });
    assert.equal(selections.length, 1);
    assert.equal(selections[0].scope, scope);
  });
}
