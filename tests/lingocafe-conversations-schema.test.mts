import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "knex/migrations/20260806223000_lingocafe_conversations.js";
const seedPath = "knex/seeds/20260806224000.lingocafe.conversations.js";
const seedDataPath = "knex/seeds/data/lingocafe.conversations.json";

const readSource = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const foundationContentTables = [
  "conversation_categories",
  "conversation_category_parents",
  "conversation_scenarios",
  "conversation_scenario_localizations",
  "conversation_category_scenarios",
  "conversation_scenario_actors",
  "conversation_variants",
  "conversation_variant_localizations",
  "conversation_variant_cast",
  "conversations",
  "conversation_rounds",
  "conversation_category_availability",
];

test("conversation baseline creates the complete normalized model", async () => {
  const migration = await readSource(migrationPath);

  for (const table of [
    ...foundationContentTables,
    "conversation_reads",
    "conversation_progress",
    "conversation_stars",
    "conversation_publication_state",
    "conversation_user_state_versions",
  ]) {
    assert.match(migration, new RegExp(`createTable\\("${table}"`));
  }

  assert.doesNotMatch(migration, /DROP SCHEMA/i);
  assert.doesNotMatch(migration, /createTable\("books/);
  assert.match(migration, /conversation_categories_status_check/);
  assert.match(migration, /conversation_categories_language_scope_check/);
  assert.match(migration, /conversation_categories_visibility_status_check/);
  assert.match(migration, /conversation_scenarios_status_check/);
  assert.match(migration, /conversation_scenarios_visibility_status_check/);
  assert.match(migration, /conversation_variants_status_check/);
  assert.match(migration, /conversation_variants_visibility_status_check/);
  assert.match(migration, /conversations_status_check/);
  assert.match(migration, /conversations_visibility_status_check/);
  assert.match(migration, /conversations_cefr_check/);
  assert.match(migration, /conversation_rounds_position_check/);
  assert.match(migration, /conversation_rounds_text_check/);
  assert.match(migration, /conversation_progress_bps_range/);
  assert.match(migration, /conversation_publication_state_digest_check/);
});

test("conversation baseline stores exact-level and band category availability", async () => {
  const migration = await readSource(migrationPath);

  assert.match(migration, /createTable\("conversation_category_availability"/);
  assert.match(
    migration,
    /table\.primary\(\["category_id", "language", "level_key"\]\)/
  );
  assert.match(migration, /conversation_category_availability_level_key_check/);
  for (const levelKey of [
    "a1",
    "a2",
    "b1",
    "b2",
    "beginner",
    "intermediate",
    "advanced",
  ]) {
    assert.match(migration, new RegExp(`'${levelKey}'`));
  }
  assert.match(migration, /conversation_category_availability_count_check/);
  assert.match(migration, /CHECK \(conversation_count >= 0\)/);
  assert.match(migration, /idx_lc_conv_cat_availability_selection/);
  assert.doesNotMatch(migration, /DROP SCHEMA/i);
  assert.match(
    migration.slice(migration.indexOf("exports.down")),
    /dropTable\("conversation_category_availability"\)/
  );
});

test("variant cast explicitly resolves every actor to a persona or scenario identity", async () => {
  const migration = await readSource(migrationPath);

  assert.match(migration, /createTable\("conversation_variant_cast"/);
  assert.match(
    migration,
    /table\.primary\(\["scenario_id", "variant_id", "actor_id"\]\)/
  );
  assert.match(
    migration,
    /foreign\(\["scenario_id", "variant_id"\]\)[\s\S]*?inTable\("lingocafe\.conversation_variants"\)[\s\S]*?onDelete\("CASCADE"\)/
  );
  assert.match(
    migration,
    /foreign\(\["scenario_id", "actor_id"\]\)[\s\S]*?inTable\("lingocafe\.conversation_scenario_actors"\)[\s\S]*?onDelete\("RESTRICT"\)/
  );
  assert.match(
    migration,
    /foreign\("persona_id"\)[\s\S]*?inTable\("lingocafe\.personas"\)[\s\S]*?onDelete\("RESTRICT"\)/
  );
  assert.match(migration, /idx_lc_conversation_variant_cast_persona/);
});

test("migration enforces scenario-scoped variants, actors, and ordered rounds", async () => {
  const migration = await readSource(migrationPath);

  assert.match(
    migration,
    /table\.primary\(\["scenario_id", "id"\]\)/
  );
  assert.match(
    migration,
    /table\.unique\(\s*\["scenario_id", "variant_id", "language", "cefr_level"\]/
  );
  assert.match(
    migration,
    /foreign\(\["conversation_id", "scenario_id"\]\)[\s\S]*?references\(\["id", "scenario_id"\]\)[\s\S]*?inTable\("lingocafe\.conversations"\)/
  );
  assert.match(
    migration,
    /foreign\(\["scenario_id", "actor_id"\]\)[\s\S]*?references\(\["scenario_id", "id"\]\)[\s\S]*?inTable\("lingocafe\.conversation_scenario_actors"\)[\s\S]*?onDelete\("RESTRICT"\)/
  );
  assert.match(
    migration,
    /table\.primary\(\["conversation_id", "position"\]\)/
  );
  assert.match(migration, /CHECK \(position >= 1\)/);
  assert.match(migration, /CHECK \(btrim\(text\) <> ''\)/);
});

test("migration isolates user state with cascading composite keys and time indexes", async () => {
  const migration = await readSource(migrationPath);

  for (const timestamp of ["read_at", "starred_at"]) {
    assert.match(
      migration,
      new RegExp(`timestamp\\("${timestamp}"\\)\\.notNullable\\(\\)\\.defaultTo`)
    );
  }

  const userStateSection = migration.slice(
    migration.indexOf('createTable("conversation_reads"'),
    migration.indexOf("await knex.raw(`\n    ALTER TABLE")
  );
  assert.equal(
    (userStateSection.match(/table\.primary\(\["user_id", "conversation_id"\]\)/g) || [])
      .length,
    3
  );
  assert.equal(
    (userStateSection.match(/\.onDelete\("CASCADE"\)/g) || []).length,
    7
  );
  assert.match(
    migration,
    /idx_lc_conversation_reads_user_time[\s\S]*?\(user_id, read_at DESC\)/
  );
  assert.match(
    migration,
    /idx_lc_conversation_stars_user_time[\s\S]*?\(user_id, starred_at DESC\)/
  );
  assert.match(
    migration,
    /idx_lc_conversation_progress_user_time[\s\S]*?\(user_id, updated_at DESC\)/
  );
});

test("migration rollback drops only conversation tables in dependency-safe order", async () => {
  const migration = await readSource(migrationPath);
  const down = migration.slice(migration.indexOf("exports.down"));
  const positions = Object.fromEntries(
    [...foundationContentTables, "conversation_reads", "conversation_stars"].map(
      (table) => [table, down.indexOf(`dropTable("${table}")`)]
    )
  );

  for (const [table, position] of Object.entries(positions)) {
    assert.ok(position >= 0, `${table} must be dropped by down()`);
  }

  assert.ok(positions.conversation_stars < positions.conversations);
  assert.ok(positions.conversation_reads < positions.conversations);
  assert.ok(positions.conversation_rounds < positions.conversations);
  assert.ok(positions.conversation_variant_cast < positions.conversation_variants);
  assert.ok(positions.conversation_variant_cast < positions.conversation_scenario_actors);
  assert.ok(positions.conversations < positions.conversation_variants);
  assert.ok(
    positions.conversation_variant_localizations <
      positions.conversation_variants
  );
  assert.ok(
    positions.conversation_scenario_actors < positions.conversation_scenarios
  );
  assert.ok(
    positions.conversation_category_scenarios <
      positions.conversation_categories
  );
  assert.ok(
    positions.conversation_category_parents <
      positions.conversation_categories
  );
});

test("development seed uses scoped Knex replacement without live-publisher machinery", async () => {
  const seedSource = await readSource(seedPath);

  assert.match(seedSource, /lingocafe\.conversations\.json/);
  assert.match(seedSource, /\.onConflict\(conflict\)[\s\S]*?\.merge/);
  assert.match(seedSource, /replaceSingleScope/);
  assert.match(seedSource, /replaceVariantScope/);
  assert.match(seedSource, /increment\("position", 1000000\)/);
  assert.doesNotMatch(seedSource, /pg_advisory|CREATE TEMP|knex_migrations/);
  assert.doesNotMatch(seedSource, /\.truncate\s*\(|\bTRUNCATE\b/i);
  assert.doesNotMatch(
    seedSource,
    /conversation_reads|conversation_stars|conversation_progress|books_progress|books_completed|translation_cache|auth\.users/
  );
});

test("development seed payload is the complete deterministic corpus", async () => {
  const payload = JSON.parse(await readSource(seedDataPath));

  assert.equal(payload.seed_format, "lingocafe-conversations-seed-v1");
  assert.match(payload.source_digest, /^[a-f0-9]{64}$/);
  assert.equal(payload.visibility_policy, "all-active");
  assert.equal(payload.categories.length, 79);
  assert.equal(payload.parents.length, 71);
  assert.equal(payload.scenarios.length, 61);
  assert.equal(payload.scenario_localizations.length, 708);
  assert.equal(payload.memberships.length, 66);
  assert.equal(payload.actors.length, 122);
  assert.equal(payload.variants.length, 67);
  assert.equal(payload.variant_cast.length, 134);
  assert.equal(payload.variant_localizations.length, 708);
  assert.equal(payload.conversations.length, 724);
  assert.equal(payload.rounds.length, 7317);
  assert.equal(payload.availability.length, 1659);
  assert.ok(payload.variant_cast.some((row: { persona_id: string | null }) => row.persona_id));
  assert.ok(payload.variant_cast.some((row: { persona_id: string | null }) => row.persona_id === null));
  assert.ok(payload.categories.every((row: { source_path: string }) => !row.source_path.startsWith("fixture://")));
});
