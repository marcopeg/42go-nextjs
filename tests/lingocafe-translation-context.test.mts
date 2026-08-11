import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const routePath = "src/app/api/(lingocafe)/lingocafe/translate/route.ts";
const playbackPath =
  "src/app/(app)/(lingocafe)/books/_components/reader-playback/useReaderPlayback.ts";

test("translation accepts explicit content contexts and the legacy book payload", async () => {
  const route = await readSource(routePath);

  for (const kind of ["book-page", "category", "conversation"]) {
    assert.match(route, new RegExp(`z\\.literal\\(['\"]${kind}['\"]\\)`));
  }

  assert.match(route, /legacyBookTranslationPayloadSchema/);
  assert.match(route, /kind: ['"]book-page['"] as const/);
  assert.match(route, /bookId: payload\.bookId/);
  assert.match(route, /pageId: payload\.pageId/);
});

test("translation authorizes visible authoritative content before cache access", async () => {
  const route = await readSource(routePath);
  const handler = route.slice(route.indexOf("const postTranslation"));
  const authorizeAt = handler.indexOf("await authorizeTranslationContent");
  const membershipAt = handler.indexOf("containsTranslationText");
  const cacheAt = handler.indexOf("await getCachedTranslation");

  assert.ok(authorizeAt >= 0, "content authorization must run");
  assert.ok(membershipAt > authorizeAt, "text membership follows authorization");
  assert.ok(cacheAt > membershipAt, "cache access follows authorization and membership");
  assert.match(route, /conversation\.is_visible['"], true/);
  assert.match(route, /scenario\.is_visible['"], true/);
  assert.match(route, /variant\.is_visible['"], true/);
  assert.match(route, /conversation\.language['"], targetLanguage/);
  assert.match(route, /sourceLanguage: ['"]en['"]/);
});

test("translation derives source text and excludes actor labels", async () => {
  const route = await readSource(routePath);

  assert.match(route, /category\.title/);
  assert.match(route, /category\.description/);
  assert.match(route, /category\.goal/);
  assert.match(route, /conversation_rounds/);
  assert.match(route, /scenarioLocalization\?\.title/);
  assert.match(route, /variantLocalization\?\.title/);
  assert.doesNotMatch(route, /conversation_scenario_actors/);
  assert.match(route, /Source language must match the requested content language/);
  assert.match(route, /Target language must match your own language/);
});

test("reader playback supports namespaced conversation identity without changing book calls", async () => {
  const playback = await readSource(playbackPath);

  assert.match(playback, /contentType: ['"]conversation['"]/);
  assert.match(playback, /contentId: string/);
  assert.match(playback, /contentType\?: ['"]book-page['"]/);
  assert.match(playback, /bookId: string/);
  assert.match(playback, /pageId: string/);
  assert.match(playback, /conversation_id: conversationId/);
  assert.match(playback, /memoryNamespace = isConversation \? ['"]conversation['"]/);
});

test("books and conversations share the anchored reader translation popover", async () => {
  const [popover, bookReader, conversationText, conversationPage] =
    await Promise.all([
      readSource(
        "src/app/(app)/(lingocafe)/books/_components/ReaderTranslationPopover.tsx"
      ),
      readSource(
        "src/app/(app)/(lingocafe)/books/_components/BookPageReader.tsx"
      ),
      readSource(
        "src/app/(app)/(lingocafe)/conversations/_components/ConversationTranslation.tsx"
      ),
      readSource(
        "src/app/(app)/(lingocafe)/conversations/_components/ConversationReaderPage.tsx"
      ),
    ]);

  assert.match(popover, /export const getReaderTranslationAnchor/);
  assert.match(popover, /export const ReaderTranslationPopover/);
  assert.match(popover, /rounded-md border font-sans backdrop-blur/);
  assert.match(popover, /fontSize: "1rem"/);
  assert.match(popover, /fontWeight: 400/);
  assert.match(popover, /letterSpacing: "normal"/);
  assert.doesNotMatch(popover, /fontSize: "1em"/);
  assert.match(popover, /data-reader-translation-popover/);
  assert.match(popover, /popoverDesktopMinWidth = 480/);
  assert.match(popover, /popoverMaxWidth = 560/);
  assert.match(popover, /triggerViewportCenter/);
  assert.match(popover, /Start audiobook from here/);
  assert.match(bookReader, /<ReaderTranslationPopover/);
  assert.match(conversationText, /<ReaderTranslationPopover/);
  assert.match(conversationText, /onTranslationOpenChange/);
  assert.match(conversationText, /backgroundColor: selected \? "var\(--reader-fg-soft\)"/);
  assert.match(conversationText, /inset 0 0 0 9999px var\(--reader-fg-soft\)/);
  assert.match(conversationText, /var\(--reader-highlight-fg\)/);
  assert.match(conversationText, /aria-pressed=\{selected\}/);
  assert.match(conversationPage, /playSentenceFromTranslation/);
  assert.match(conversationPage, /playWordFromTranslation/);
  assert.match(conversationPage, /startAudiobookFromTranslation/);
});
