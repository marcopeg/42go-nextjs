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

test("conversation JSON responses are explicitly non-cacheable", async () => {
  const source = await readSource(
    "src/app/api/(lingocafe)/lingocafe/_lib/reader.ts"
  );
  assert.match(source, /"Cache-Control": "no-store"/);
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
  const [dataSource, discoveryPage, sharedUi, categoryPage, detailPage, translationRoute, appLayout] =
    await Promise.all([
      readSource("src/app/api/(lingocafe)/lingocafe/_lib/conversations.ts"),
      readSource("src/app/(app)/(lingocafe)/conversations/page.tsx"),
      readSource(
        "src/app/(app)/(lingocafe)/conversations/_components/ConversationSharedUI.tsx"
      ),
      readSource(
        "src/app/(app)/(lingocafe)/conversations/categories/[...categoryPath]/page.tsx"
      ),
      readSource(
        "src/app/(app)/(lingocafe)/conversations/[conversationId]/page.tsx"
      ),
      readSource("src/app/api/(lingocafe)/lingocafe/translate/route.ts"),
      readSource("src/42go/layouts/app/AppLayout.tsx"),
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
  assert.match(dataSource, /starred: starred\.map\(mapConversationChoice\)/);
  assert.match(sharedUi, /<p className="font-medium text-foreground">\{choice\.title\}<\/p>/);
  assert.match(sharedUi, /bottomMargin = "30vw"/);
  assert.match(sharedUi, /style=\{\{ height: bottomMargin \}\}/);
  assert.match(sharedUi, /flushMobileTop=\{flushMobileTop\}/);
  assert.doesNotMatch(sharedUi, /ConversationTranslatableText/);
  assert.match(categoryPage, /data\?\.scenarios\.flatMap\(\(scenario\)/);
  assert.match(categoryPage, /scenario\.variants[^]*\.map\(\(variant\)/);
  assert.match(categoryPage, /conversationGroups\.map\(\(group\)/);
  assert.match(categoryPage, /id: `\$\{scenario\.id\}:\$\{variant\.id\}`/);
  assert.match(categoryPage, /<ConversationChoiceGroupRow/);
  assert.doesNotMatch(sharedUi, /<ConversationBadge>\{choice\.language\}<\/ConversationBadge>/);
  assert.match(sharedUi, /Choose a level for \$\{firstChoice\.title\}/);
  assert.ok(
    (sharedUi.match(/touch-manipulation/g) || []).length >= 3,
    "category and conversation rows expose immediate touch feedback"
  );
  assert.ok(
    (sharedUi.match(/active:bg-muted/g) || []).length >= 3,
    "category and conversation rows expose a pressed state"
  );
  assert.match(categoryPage, /<PlainList flushMobileTop=\{data\.children\.length === 0\}>/);
  assert.doesNotMatch(categoryPage, /Choose a conversation|practice-heading/);
  assert.doesNotMatch(categoryPage, /Explore further|subcategories-heading/);
  assert.doesNotMatch(categoryPage, /scenario\.canonicalTitle|variant\.canonicalTitle/);
  assert.doesNotMatch(categoryPage, /data\.category\.(goal|description)/);
  assert.match(categoryPage, /flushMobileTop=\{Boolean\(data\)\}/);
  assert.match(categoryPage, /<CategoryList[^]*flushMobileTop/);
  assert.match(sharedUi, /className="flex min-w-0 flex-1 items-center/);
  assert.doesNotMatch(discoveryPage, /ConversationActionFab|ConversationTranslatableText/);
  assert.doesNotMatch(categoryPage, /ConversationActionFab|ConversationTranslatableText/);
  assert.match(discoveryPage, /containedMobileScroll/);
  assert.match(categoryPage, /containedMobileScroll/);
  assert.match(appLayout, /h-\[100dvh\].*overflow-hidden/);
  assert.match(appLayout, /overflow-y-auto overscroll-contain/);
  assert.match(detailPage, /text=\{data\.conversation\.title\}/);
  assert.match(detailPage, /<BookReaderFloatingActionBar/);
  assert.match(detailPage, /<BookReaderPreferencesPanel/);
  assert.match(detailPage, /useReaderPreferences/);
  assert.doesNotMatch(detailPage, /data\.scenario\.canonicalTitle/);
  assert.doesNotMatch(detailPage, /data\.variant\.canonicalTitle/);
  assert.doesNotMatch(detailPage, /\{actor\?\.role \?/);
  assert.doesNotMatch(detailPage, />Turn \{round\.position\}<\/span>/);
  assert.match(detailPage, /aria-label=\{`Turn \$\{round\.position\}, \$\{actor\?\.name \|\| round\.actorId\}`\}/);
  assert.match(detailPage, /data\.conversation\.cefrLevel\.toUpperCase\(\)\} · \{data\.state\.isRead \? "Read" : "Unread"\}/);
  assert.doesNotMatch(detailPage, /<ConversationBadge>/);
  assert.match(detailPage, /absolute inset-x-24 min-w-0 text-center/);
  assert.doesNotMatch(detailPage, /sticky top-0 z-50/);
  assert.match(translationRoute, /scenario\.canonical_language as scenario_canonical_language/);
  assert.match(translationRoute, /variant\.canonical_language as variant_canonical_language/);
  assert.match(translationRoute, /requestedSourceLanguage: payload\.from/);
});

test("shared language preferences stage choices and save them explicitly", async () => {
  const [preferences, discoveryPage, categoryPage, booksPage] = await Promise.all([
    readSource(
      "src/app/(app)/(lingocafe)/_components/LanguagePreferencesMenu.tsx"
    ),
    readSource("src/app/(app)/(lingocafe)/conversations/page.tsx"),
    readSource(
      "src/app/(app)/(lingocafe)/conversations/categories/[...categoryPath]/page.tsx"
    ),
    readSource("src/app/(app)/(lingocafe)/books/page.tsx"),
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
  assert.match(discoveryPage, /component: LanguagePreferencesMenu/);
  assert.match(categoryPage, /component: LanguagePreferencesMenu/);
  assert.match(booksPage, /component: LanguagePreferencesMenu/);
  assert.doesNotMatch(booksPage, /BooksHeaderLanguageFlag/);
});
