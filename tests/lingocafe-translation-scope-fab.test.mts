import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the shared translation-scope FAB is a direct one-tap circular toggle", async () => {
  const source = await readSource("src/components/ui/translation-scope-fab.tsx");

  assert.match(source, /export const TranslationScopeFab/);
  assert.match(source, /scope === "sentence" \? "word" : "sentence"/);
  assert.match(source, /onClick=\{\(\) => onScopeChange\(nextScope\)\}/);
  assert.match(source, /Translation mode: \$\{scope\}/);
  assert.match(source, /aria-pressed=\{scope === "word"\}/);
  assert.match(source, /<Languages aria-hidden/);
  assert.match(source, /const scopeBadge = scope === "word" \? "W" : "S"/);
  assert.match(source, /\{scopeBadge\}/);
  assert.match(source, /key=\{scope\}/);
  assert.match(source, /relative size-14 touch-manipulation rounded-full p-0/);
  assert.match(source, /rounded-full/);
});

test("the translation-scope FAB rolls its label and explains the desktop target mode", async () => {
  const [component, styles] = await Promise.all([
    readSource("src/components/ui/translation-scope-fab.tsx"),
    readSource("src/app/tailwind.css"),
  ]);

  assert.match(component, /translation-scope-label-roll-up/);
  assert.match(component, /motion-reduce:animate-none/);
  assert.match(component, /Click here to switch translation mode to \$\{nextScope\}/);
  assert.match(component, /group-hover:opacity-100/);
  assert.match(component, /group-focus-within:opacity-100/);
  assert.match(styles, /@keyframes translation-scope-label-roll-up/);
});

test("Conversations and Book Reader share the one-tap translation-scope FAB", async () => {
  const [conversation, bookReader] = await Promise.all([
    readSource(
      "src/app/(app)/(lingocafe)/conversations/_components/ConversationTranslation.tsx"
    ),
    readSource(
      "src/app/(app)/(lingocafe)/books/_components/BookReaderFloatingActionBar.tsx"
    ),
  ]);

  for (const source of [conversation, bookReader]) {
    assert.match(source, /import \{ TranslationScopeFab \}/);
    assert.match(source, /<TranslationScopeFab/);
    assert.doesNotMatch(source, /selectedActionId=\{(?:scope|translationScope)\}/);
    assert.doesNotMatch(source, /Translate sentence/);
    assert.doesNotMatch(source, /Translate word/);
  }
  assert.match(conversation, /scope=\{scope\} onScopeChange=\{onScopeChange\}/);
  assert.match(bookReader, /scope=\{translationScope\}/);
  assert.match(bookReader, /onScopeChange=\{onTranslationScopeChange\}/);
});

test("conversation reader reserves room for its fixed floating actions", async () => {
  const source = await readSource(
    "src/app/(app)/(lingocafe)/conversations/_components/ConversationReaderPage.tsx"
  );

  assert.match(source, /pb-\[calc\(7\.5rem\+env\(safe-area-inset-bottom\)\)\]/);
});
