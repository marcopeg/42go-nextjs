import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("shared reader preferences own storage, theme profiles, and panel coordination", async () => {
  const source = await readSource(
    "src/app/(app)/(lingocafe)/books/_components/useReaderPreferences.ts"
  );

  assert.match(source, /readStoredReaderPreferencesStore/);
  assert.match(source, /READER_PREFERENCES_STORAGE_KEY/);
  assert.match(source, /sharedFontSizeIndex/);
  assert.match(source, /theme === "light" \|\| theme === "dark"/);
  assert.match(source, /setSettingsSurfaceOpen\("preferences", next\)/);
  assert.match(source, /getReaderThemeStyle\(preferences, themeMode\)/);
  assert.match(source, /translationScope: sanitizeReaderTranslationScope\(next\)/);
  assert.match(source, /delete next\[themeProfile\]/);
});

test("book reader consumes the shared preference controller", async () => {
  const source = await readSource(
    "src/app/(app)/(lingocafe)/books/[bookId]/[pageId]/page.tsx"
  );

  assert.match(source, /useReaderPreferences\(\{/);
  assert.match(source, /setSettingsSurfaceOpen: playback\.setSettingsSurfaceOpen/);
  assert.match(source, /onOpenChange=\{handlePreferencesOpenChange\}/);
  assert.match(source, /onPreferencesChange=\{updateReaderPreferences\}/);
  assert.match(source, /onTranslationScopeChange=\{updateReaderTranslationScope\}/);
  assert.doesNotMatch(source, /localStorage\.setItem\(/);
  assert.doesNotMatch(source, /useState<ReaderPreferencesStore>/);
});
