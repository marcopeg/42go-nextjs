import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("conversation bands and category paths implement the refined contract", async () => {
  const source = await readSource(
    "src/app/api/(lingocafe)/lingocafe/_lib/conversations.ts"
  );
  assert.match(source, /beginner: \["a1"\]/);
  assert.match(source, /intermediate: \["a2", "b1"\]/);
  assert.match(source, /advanced: \["b2"\]/);
  assert.match(source, /requestedBand !== null && requestedBand !== undefined/);
  assert.match(source, /"Invalid conversation band\."/);
  assert.ok(
    (
      source.match(
        /explicitBand[\s\S]*?resolveConversationBand\(requestedBand, null\)[\s\S]*?loadConversationProfile/g
      ) || []
    ).length >= 2,
    "discovery and category validate an explicit band before loading the profile"
  );
  assert.match(source, /return profileBand\[targetLevel \|\| ""\] \|\| "intermediate"/);
  assert.match(source, /path\.length === 0 \|\| path\.length > 32/);
  assert.match(source, /new Set\(normalized\)\.size !== normalized\.length/);
  assert.ok(
    (source.match(/defaultBand: profile\.defaultBand/g) || []).length >= 2,
    "discovery and category DTOs both expose the profile-derived default band"
  );
});

test("conversation routes are protected and state exposes both idempotent verbs", async () => {
  const paths = [
    "src/app/api/(lingocafe)/lingocafe/conversations/route.ts",
    "src/app/api/(lingocafe)/lingocafe/conversations/categories/[...categoryPath]/route.ts",
    "src/app/api/(lingocafe)/lingocafe/conversations/[conversationId]/route.ts",
    "src/app/api/(lingocafe)/lingocafe/conversations/[conversationId]/read/route.ts",
    "src/app/api/(lingocafe)/lingocafe/conversations/[conversationId]/star/route.ts",
  ];
  const sources = await Promise.all(paths.map(readSource));
  for (const source of sources) {
    assert.match(source, /protectRoute/);
    assert.match(source, /feature: "api:lingocafe", session: true/);
  }
  for (const source of sources.slice(-2)) {
    assert.match(source, /export const PUT = protectRoute/);
    assert.match(source, /export const DELETE = protectRoute/);
  }
});

test("data access enforces visibility, materialized membership, language scope, ordering, and user isolation", async () => {
  const source = await readSource(
    "src/app/api/(lingocafe)/lingocafe/_lib/conversations.ts"
  );
  assert.match(source, /conversation_category_scenarios as membership/);
  assert.doesNotMatch(source, /match_provenance.*where|metadata.*where/);
  assert.match(source, /c\.is_visible/);
  assert.match(source, /v\.is_visible/);
  assert.match(source, /s\.is_visible/);
  assert.match(source, /eligible_round\.conversation_id = c\.id/);
  assert.match(source, /conversation_category_availability as availability/);
  assert.match(source, /availability\.language/);
  assert.match(source, /availability\.level_key/);
  assert.match(source, /availability\.conversation_count", ">", 0/);
  assert.match(source, /availableCount: Number\(row\.conversation_count\)/);
  assert.doesNotMatch(source, /withRecursive\(\s*"descendant_categories"/);
  assert.doesNotMatch(source, /eligibleRootQuery/);
  assert.doesNotMatch(source, /count\s*\(/i);
  assert.match(source, /ANY\(\?\?\.\?\?\)/);
  assert.match(source, /WHEN 'a2' THEN 2 WHEN 'b1' THEN 3/);
  assert.match(source, /Number\(round\.position\) !== index \+ 1/);
  assert.match(source, /!actorIds\.has\(String\(round\.actor_id\)\)/);
  assert.match(source, /onConflict\(\["user_id", "conversation_id"\]\)/);
  assert.match(source, /\.ignore\(\)/);
  assert.doesNotMatch(source, /clientUserId|requestedUserId/);
  assert.doesNotMatch(
    source,
    /trx\("lingocafe\.conversations"\)[\s\S]*?Conversation not found/
  );
});

test("category rows render precomputed availability without shrinking their tap target", async () => {
  const [types, sharedUi] = await Promise.all([
    readSource(
      "src/app/(app)/(lingocafe)/conversations/_components/types.ts"
    ),
    readSource(
      "src/app/(app)/(lingocafe)/conversations/_components/ConversationSharedUI.tsx"
    ),
  ]);

  assert.match(types, /availableCount: number/);
  assert.match(sharedUi, /category\.availableCount/);
  assert.match(sharedUi, /conversations?" : "conversations"} available/);
  assert.match(sharedUi, /<ChevronRight/);
  assert.match(sharedUi, /className="flex min-h-16 w-full/);
});

test("conversation browse responses support private conditional revalidation", async () => {
  const [readerSource, conversationSource, browseSource, rootRoute, categoryRoute] = await Promise.all([
    readSource("src/app/api/(lingocafe)/lingocafe/_lib/reader.ts"),
    readSource("src/app/api/(lingocafe)/lingocafe/_lib/conversations.ts"),
    readSource("src/app/api/(lingocafe)/lingocafe/_lib/conversation-browse-response.ts"),
    readSource("src/app/api/(lingocafe)/lingocafe/conversations/route.ts"),
    readSource("src/app/api/(lingocafe)/lingocafe/conversations/categories/[...categoryPath]/route.ts"),
  ]);
  assert.match(readerSource, /"Cache-Control": "no-store"/);
  assert.match(conversationSource, /schema: "conversation-browse-v3"/);
  assert.match(browseSource, /"Cache-Control": "private, no-cache"/);
  assert.match(browseSource, /matchesConversationBrowseETag/);
  assert.match(browseSource, /status: 304/);
  assert.match(browseSource, /Vary: "Cookie"/);
  assert.match(rootRoute, /conversationBrowseResponse/);
  assert.match(categoryRoute, /conversationBrowseResponse/);
  assert.ok(
    rootRoute.indexOf("if (matchesConversationBrowseETag") <
      rootRoute.lastIndexOf("await loadConversationDiscovery({"),
    "root checks the validator before loading the browse payload"
  );
  assert.ok(
    categoryRoute.indexOf("if (matchesConversationBrowseETag") <
      categoryRoute.lastIndexOf("await loadConversationCategory({"),
    "category checks the validator before loading the browse payload"
  );
});

test("conversation library caches route data and starts category transitions immediately", async () => {
  const [cacheSource, hookSource, shellSource, sharedUi] = await Promise.all([
    readSource("src/app/(app)/(lingocafe)/conversations/_components/conversation-browse-cache.ts"),
    readSource("src/app/(app)/(lingocafe)/conversations/_components/useConversationBrowseData.ts"),
    readSource("src/app/(app)/(lingocafe)/conversations/_components/ConversationLibraryShell.tsx"),
    readSource("src/app/(app)/(lingocafe)/conversations/_components/ConversationSharedUI.tsx"),
  ]);
  assert.match(cacheSource, /lingocafe\.conversations\.browse-cache\.v2/);
  assert.match(cacheSource, /cacheKey = \(userId: string, href: string\)/);
  assert.match(hookSource, /If-None-Match/);
  assert.match(hookSource, /response\.status === 304/);
  assert.match(shellSource, /navigateToCategory/);
  assert.match(shellSource, /setPendingHref\(href\)/);
  assert.match(shellSource, /<ConversationListSkeleton/);
  assert.match(sharedUi, /onNavigate\(category, href\)/);
});

test("starred conversations are a root navigation entry with a dedicated list", async () => {
  const [rootPage, starredPage, sharedUi] = await Promise.all([
    readSource("src/app/(app)/(lingocafe)/conversations/(library)/page.tsx"),
    readSource("src/app/(app)/(lingocafe)/conversations/(library)/starred/page.tsx"),
    readSource("src/app/(app)/(lingocafe)/conversations/_components/ConversationSharedUI.tsx"),
  ]);
  assert.match(rootPage, /<StarredConversationCategoryRow/);
  assert.match(rootPage, /\/conversations\/starred/);
  assert.doesNotMatch(rootPage, /data\.starred\.map/);
  assert.match(starredPage, /data\.starred\.map/);
  assert.match(starredPage, /title: "Starred"/);
  assert.match(starredPage, /<ConversationChoiceRow/);
  assert.match(sharedUi, /Your saved conversations across every level\./);
});

test("conversation reader persists scroll progress and marks read near the end", async () => {
  const [detailPage, detailRoute, dataSource, migration] = await Promise.all([
    readSource("src/app/(app)/(lingocafe)/conversations/_components/ConversationReaderPage.tsx"),
    readSource("src/app/api/(lingocafe)/lingocafe/conversations/[conversationId]/route.ts"),
    readSource("src/app/api/(lingocafe)/lingocafe/_lib/conversations.ts"),
    readSource("knex/migrations/20260806223000_lingocafe_conversations.js"),
  ]);
  assert.doesNotMatch(detailPage, /readAttemptedRef/);
  assert.doesNotMatch(detailPage, /method: "PUT"[^]*\/read/);
  assert.match(detailPage, /getReaderScrollProgressBps/);
  assert.doesNotMatch(detailPage, /createDocumentReaderScrollTarget/);
  assert.match(detailPage, /createElementReaderScrollTarget/);
  assert.match(detailPage, /READER_SCROLL_PROGRESS_IDLE_SAVE_MS = 4000/);
  assert.match(detailPage, /keepalive: true/);
  assert.match(detailPage, /h-\[2px\] bg-blue-500/);
  assert.match(detailPage, /data\.state\.progressBps/);
  assert.match(detailRoute, /progressPayloadSchema/);
  assert.match(detailRoute, /export const POST = protectRoute/);
  assert.match(dataSource, /CONVERSATION_READ_PROGRESS_THRESHOLD_BPS = 9500/);
  assert.match(dataSource, /conversation_progress/);
  assert.match(dataSource, /readChanged/);
  assert.match(migration, /createTable\("conversation_progress"/);
  assert.match(migration, /progress_bps >= 0 AND progress_bps <= 10000/);
});

test("reader sessions resolve users inside the active app before email fallback", async () => {
  const source = await readSource(
    "src/app/api/(lingocafe)/lingocafe/_lib/reader.ts"
  );
  assert.match(source, /const appId = \(await getAppID\(\)\) \|\| "default"/);
  assert.match(source, /where\(\{ id: sessionUserId, app_id: appId \}\)/);
  assert.match(source, /\.where\("app_id", appId\)/);
  assert.match(source, /\.andWhere\("email", "ilike", sessionEmail\)/);
});

test("conversation traversal stays English and only detail exposes translation controls", async () => {
  const [dataSource, discoveryPage, sharedUi, categoryPage, detailPage, translationRoute, appLayout, appLayoutTypes, libraryShell, plainList, bottomSheet] =
    await Promise.all([
      readSource("src/app/api/(lingocafe)/lingocafe/_lib/conversations.ts"),
      readSource("src/app/(app)/(lingocafe)/conversations/(library)/page.tsx"),
      readSource(
        "src/app/(app)/(lingocafe)/conversations/_components/ConversationSharedUI.tsx"
      ),
      readSource(
        "src/app/(app)/(lingocafe)/conversations/(library)/categories/[...categoryPath]/page.tsx"
      ),
      readSource(
        "src/app/(app)/(lingocafe)/conversations/_components/ConversationReaderPage.tsx"
      ),
      readSource("src/app/api/(lingocafe)/lingocafe/translate/route.ts"),
      readSource("src/42go/layouts/app/AppLayout.tsx"),
      readSource("src/42go/layouts/app/types.ts"),
      readSource(
        "src/app/(app)/(lingocafe)/conversations/_components/ConversationLibraryShell.tsx"
      ),
      readSource("src/42go/components/PlainList/PlainList.tsx"),
      readSource("src/42go/components/SwipeableBottomSheet/SwipeableBottomSheet.tsx"),
    ]);

  assert.ok(
    (dataSource.match(/function joinEnglishConversation/g) || []).length >= 2,
    "starred and category lists both join their English conversation sibling"
  );
  assert.match(dataSource, /COALESCE\(base\.title, v\.title\) as list_title/);
  assert.match(dataSource, /COALESCE\(base\.description, v\.description\) as list_description/);
  assert.match(dataSource, /title: row\.list_title/);
  assert.match(dataSource, /description: row\.list_description/);
  assert.match(dataSource, /scenarioTitle: row\.scenario_title/);
  assert.match(dataSource, /variantTitle: row\.variant_title/);
  assert.match(dataSource, /starred: starred\.map\(\(row\) =>/);
  assert.match(dataSource, /loadConversationParticipantPreviews/);
  assert.match(dataSource, /participantPreviews\.get\(getConversationVariantKey\(row\)\)/);
  assert.match(sharedUi, /<p className="font-medium text-foreground">\{choice\.title\}<\/p>/);
  assert.match(sharedUi, /hideMobileTopBorder/);
  assert.match(sharedUi, /hideMobileBottomBorder/);
  assert.match(sharedUi, /desktopVariant="contained"/);
  assert.match(plainList, /desktopVariant\?: "default" \| "contained" \| "flush"/);
  assert.match(plainList, /md:my-6 md:overflow-hidden md:rounded-xl md:border md:shadow-sm/);
  assert.doesNotMatch(sharedUi, /ConversationTranslatableText/);
  assert.match(categoryPage, /data\?\.scenarios\.flatMap\(\(scenario\)/);
  assert.match(categoryPage, /scenario\.variants[^]*\.map\(\(variant\)/);
  assert.match(categoryPage, /conversationGroups\.map\(\(group\)/);
  assert.match(categoryPage, /id: `\$\{scenario\.id\}:\$\{variant\.id\}`/);
  assert.match(categoryPage, /<ConversationChoiceGroupRow/);
  assert.doesNotMatch(sharedUi, /<ConversationBadge>\{choice\.language\}<\/ConversationBadge>/);
  assert.match(sharedUi, /Choose a level for \$\{firstChoice\.title\}/);
  assert.match(sharedUi, /<SwipeableBottomSheet/);
  assert.match(bottomSheet, /inset-x-2\.5 bottom-0/);
  assert.match(bottomSheet, /rounded-t-3xl/);
  assert.match(sharedUi, /onCloseComplete=\{\(\) => \{/);
  assert.match(sharedUi, /if \(href\) router\.push\(href\)/);
  assert.match(sharedUi, /onClick=\{openLevelPicker\}[^]*className="relative flex min-w-0 w-full/);
  assert.match(sharedUi, /onClick=\{\(event\) => event\.stopPropagation\(\)\}/);
  assert.match(sharedUi, /title="Choose reading level"/);
  assert.ok(
    (sharedUi.match(/Choose reading level/g) || []).length >= 2,
    "desktop and mobile level pickers share the same visible title"
  );
  assert.doesNotMatch(sharedUi, /Choose (?:a|the) level (?:to|you want to) read/);
  assert.match(sharedUi, /style=\{\{ left: anchorPoint\.x, top: anchorPoint\.y \}\}/);
  assert.match(sharedUi, /Read \$\{firstChoice\.title\} at level \$\{choice\.cefrLevel\.toUpperCase\(\)\}/);
  assert.match(sharedUi, /inline-flex min-h-11 min-w-11/);
  assert.ok(
    (sharedUi.match(/touch-manipulation/g) || []).length >= 3,
    "category and conversation rows expose immediate touch feedback"
  );
  assert.ok(
    (sharedUi.match(/active:bg-muted/g) || []).length >= 3,
    "category and conversation rows expose a pressed state"
  );
  assert.match(categoryPage, /trailingItems=/);
  assert.doesNotMatch(categoryPage, /Choose a conversation|practice-heading/);
  assert.doesNotMatch(categoryPage, /Explore further|subcategories-heading/);
  assert.doesNotMatch(categoryPage, /scenario\.canonicalTitle|variant\.canonicalTitle/);
  assert.doesNotMatch(categoryPage, /data\.category\.(goal|description)/);
  assert.match(categoryPage, /<CategoryList/);
  assert.match(categoryPage, /title: data\.category\.title/);
  assert.doesNotMatch(categoryPage, /<h2[^]*data\.category\.title/);
  assert.match(sharedUi, /flex min-w-0 flex-1 items-center/);
  assert.doesNotMatch(discoveryPage, /ConversationActionFab|ConversationTranslatableText/);
  assert.doesNotMatch(categoryPage, /ConversationActionFab|ConversationTranslatableText/);
  assert.doesNotMatch(discoveryPage, /<AppLayout/);
  assert.doesNotMatch(categoryPage, /<AppLayout/);
  assert.match(libraryShell, /<AppLayout/);
  assert.doesNotMatch(libraryShell, /containedMobileScroll/);
  assert.match(
    libraryShell,
    /min-h-\[calc\(100dvh\+6rem\)\] min-w-0 overflow-x-clip md:min-h-full/
  );
  assert.match(libraryShell, /pageWidth="content"/);
  assert.match(appLayoutTypes, /pageWidth\?: "full" \| "content"/);
  assert.match(appLayout, /pageWidth === "content" \? "mx-auto w-full max-w-4xl" : "w-full"/);
  assert.match(appLayout, /<div className=\{pageWidthClass\}>[^]*<Toolbar/);
  assert.match(appLayout, /className=\{`\$\{pageWidthClass\} px-6`\}/);
  assert.match(libraryShell, /component: LanguagePreferencesMenu/);
  assert.match(libraryShell, /title=\{navigation\.title\}/);
  assert.match(libraryShell, /backBtn=\{navigation\.backTo/);
  assert.match(libraryShell, /slide-in-from-right-4/);
  assert.match(libraryShell, /motion-reduce:animate-none/);
  assert.match(libraryShell, /h-\[max\(30vw,calc\(4rem\+env\(safe-area-inset-bottom\)\)\)\]/);
  assert.match(appLayout, /fixed inset-0.*overflow-hidden overscroll-none/);
  assert.match(appLayout, /md:static md:block md:min-h-screen/);
  assert.match(appLayout, /overflow-y-auto overscroll-contain/);
  assert.match(detailPage, /text=\{data\.conversation\.title\}/);
  assert.match(detailPage, /<BookReaderFloatingActionBar/);
  assert.match(detailPage, /<BookReaderPreferencesPanel/);
  assert.match(detailPage, /useReaderPreferences/);
  assert.doesNotMatch(detailPage, /data\.scenario\.canonicalTitle/);
  assert.doesNotMatch(detailPage, /data\.variant\.canonicalTitle/);
  assert.doesNotMatch(detailPage, /\{actor\?\.role \?/);
  assert.doesNotMatch(detailPage, />Turn \{round\.position\}<\/span>/);
  assert.match(detailPage, /aria-label=\{`Turn \$\{round\.position\}, \$\{displayName\}`\}/);
  assert.match(detailPage, /data\.conversation\.cefrLevel\.toUpperCase\(\)\} · \{data\.state\.isRead \? "Read" : "Unread"\}/);
  assert.doesNotMatch(detailPage, /<ConversationBadge>/);
  assert.match(detailPage, /absolute inset-x-24 min-w-0 text-center/);
  assert.doesNotMatch(detailPage, /sticky top-0 z-50/);
  assert.match(translationRoute, /scenario\.canonical_language as scenario_canonical_language/);
  assert.match(translationRoute, /variant\.canonical_language as variant_canonical_language/);
  assert.match(translationRoute, /requestedSourceLanguage: payload\.from/);
});

test("conversation detail resolves persona presentation once per actor and renders run avatars", async () => {
  const [dataSource, types, detailPage, sharedUi, avatar, assets] = await Promise.all([
    readSource("src/app/api/(lingocafe)/lingocafe/_lib/conversations.ts"),
    readSource("src/app/(app)/(lingocafe)/conversations/_components/types.ts"),
    readSource("src/app/(app)/(lingocafe)/conversations/_components/ConversationReaderPage.tsx"),
    readSource("src/app/(app)/(lingocafe)/conversations/_components/ConversationSharedUI.tsx"),
    readSource("src/app/(app)/(lingocafe)/_components/PersonaAvatar.tsx"),
    readSource("src/lib/lingocafe/assets.ts"),
  ]);

  assert.match(dataSource, /conversation_variant_cast as cast/);
  assert.match(dataSource, /persona\.presentations as persona_presentations/);
  assert.match(dataSource, /resolvePersonaPresentation/);
  assert.match(dataSource, /profile\.ownLanguage/);
  assert.match(dataSource, /\[normalizedContext, primaryContext, "default"\]/);
  assert.match(dataSource, /castIsMalformed/);
  assert.match(dataSource, /resolveLingoCafeAssetUrl/);
  assert.match(types, /source: "persona"/);
  assert.match(types, /participants: ConversationParticipant\[\]/);
  assert.match(types, /avatarContentHash: string/);
  assert.match(detailPage, /<PersonaAvatar/);
  assert.match(detailPage, /!startsActorRun && "invisible"/);
  assert.match(detailPage, /actor\?\.identity\.displayName/);
  assert.match(sharedUi, /ConversationParticipantAvatars/);
  assert.match(sharedUi, /participants\.slice\(0, 2\)/);
  assert.match(sharedUi, /size="sm"/);
  assert.match(avatar, /unoptimized/);
  assert.match(avatar, /setFailedSources/);
  assert.match(assets, /LC_ASSETS_BASE_PATH/);
  assert.doesNotMatch(assets, /LC_PERSONA_ASSETS_BASE_PATH/);
  assert.match(assets, /normalized\.split\("\/"\)\.includes\("\.\."\)/);
  assert.doesNotMatch(detailPage, /dangerouslySetInnerHTML/);
});

test("conversation translation recovers when fluent and reading languages match", async () => {
  const [translation, detailPage] = await Promise.all([
    readSource(
      "src/app/(app)/(lingocafe)/conversations/_components/ConversationTranslation.tsx"
    ),
    readSource(
      "src/app/(app)/(lingocafe)/conversations/_components/ConversationReaderPage.tsx"
    ),
  ]);

  assert.match(translation, /isSameLingoCafeTranslationLanguage/);
  assert.match(translation, /setStatus\("choose-language"\)/);
  assert.match(translation, /languageOptions=\{availableTranslationLanguages\}/);
  assert.match(translation, /fetch\("\/api\/profile"/);
  assert.match(translation, /values: \{ ownLang: language \}/);
  assert.match(translation, /await loadTranslation\(selected, language\)/);
  assert.match(detailPage, /onTargetLanguageChange=\{updateTranslationTargetLanguage\}/);
});

test("shared language preferences stage choices and save them explicitly", async () => {
  const [preferences, discoveryPage, categoryPage, booksPage, libraryShell] = await Promise.all([
    readSource(
      "src/app/(app)/(lingocafe)/_components/LanguagePreferencesMenu.tsx"
    ),
    readSource("src/app/(app)/(lingocafe)/conversations/(library)/page.tsx"),
    readSource(
      "src/app/(app)/(lingocafe)/conversations/(library)/categories/[...categoryPath]/page.tsx"
    ),
    readSource("src/app/(app)/(lingocafe)/books/page.tsx"),
    readSource(
      "src/app/(app)/(lingocafe)/conversations/_components/ConversationLibraryShell.tsx"
    ),
  ]);

  assert.match(preferences, /const hasChanges =/);
  assert.match(preferences, /method: "preferences-save"/);
  assert.match(preferences, /hasChanges \? "Save" : "Close"/);
  assert.match(preferences, /LoaderCircle[^]*animate-spin/);
  assert.match(preferences, /flex flex-nowrap gap-1 overflow-x-auto/);
  assert.match(preferences, /lingoCafeProfileOptions\.targetLang\.map\(\(option\)/);
  assert.doesNotMatch(preferences, /orderedLanguages|targetLang\.filter/);
  assert.match(preferences, /selectedLanguage === option\.code/);
  assert.match(preferences, /window\.matchMedia\("\(min-width: 768px\)"\)/);
  assert.match(preferences, /title="Language Preferences"/);
  assert.match(preferences, /hasChanges \? "Save" : "Done"/);
  assert.match(preferences, /bodyClassName="flex flex-col"/);
  assert.doesNotMatch(preferences, /void save\([^)]*"language"/);
  assert.doesNotMatch(preferences, /void save\([^)]*"level"/);
  assert.doesNotMatch(discoveryPage, /<ConversationBandFilter/);
  assert.doesNotMatch(categoryPage, /<ConversationBandFilter/);
  assert.match(preferences, /Translation selection/);
  assert.match(preferences, /writeStoredReaderTranslationScope/);
  assert.doesNotMatch(discoveryPage, /component: LanguagePreferencesMenu/);
  assert.doesNotMatch(categoryPage, /component: LanguagePreferencesMenu/);
  assert.match(libraryShell, /component: LanguagePreferencesMenu/);
  assert.match(booksPage, /component: LanguagePreferencesMenu/);
  assert.doesNotMatch(booksPage, /BooksHeaderLanguageFlag/);
});
