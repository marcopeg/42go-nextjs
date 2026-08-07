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
  assert.match(source, /withRecursive\(\s*"descendant_categories"/);
  assert.match(source, /rootsQuery\.whereExists\(eligibleRootQuery\)/);
  assert.match(
    source,
    /applyEligibleConversation\(\s*eligibleRootQuery,\s*profile\.targetLanguage,\s*levels/
  );
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

test("conversation UI preserves localization provenance for every translatable content field", async () => {
  const [dataSource, sharedUi, categoryPage, detailPage, translationRoute] =
    await Promise.all([
      readSource("src/app/api/(lingocafe)/lingocafe/_lib/conversations.ts"),
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
    ]);

  assert.match(dataSource, /scenarioLocalization: mapLocalization\(/);
  assert.match(dataSource, /variantLocalization: mapLocalization\(/);
  assert.match(dataSource, /starred: starred\.map\(mapConversationChoice\)/);
  assert.match(sharedUi, /text=\{choice\.title\}/);
  assert.match(sharedUi, /text=\{choice\.description\}/);
  assert.match(sharedUi, /choice\.scenarioLocalization\?\.language/);
  assert.match(sharedUi, /choice\.scenarioCanonicalLanguage \?\? "en"/);
  assert.match(categoryPage, /firstChoice\?\.scenarioLocalization\?\.language/);
  assert.match(categoryPage, /variant\.choices\[0\]\?\.variantLocalization\?\.language/);
  assert.match(detailPage, /text=\{data\.conversation\.title\}/);
  assert.match(detailPage, /data\.scenario\.localization\?\.language \?\? data\.scenario\.canonicalLanguage/);
  assert.match(detailPage, /data\.variant\.localization\?\.language \?\? data\.variant\.canonicalLanguage/);
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
  assert.match(preferences, /option\.code === selectedLanguage/);
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
