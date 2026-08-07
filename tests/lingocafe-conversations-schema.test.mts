import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";

const require = createRequire(import.meta.url);
const migrationPath =
  "knex/migrations/20260806223000_lingocafe_conversations.js";
const availabilityMigrationPath =
  "knex/migrations/20260807120000_lingocafe_conversation_category_availability.js";
const seedPath = "knex/seeds/20260806224000.lingocafe.conversations.js";

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
  "conversations",
  "conversation_rounds",
];
const contentTables = [
  ...foundationContentTables,
  "conversation_category_availability",
];

test("conversation migration creates the normalized model additively", async () => {
  const migration = await readSource(migrationPath);

  for (const table of [
    ...foundationContentTables,
    "conversation_reads",
    "conversation_stars",
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
});

test("additive migration stores exact-level and band category availability", async () => {
  const migration = await readSource(availabilityMigrationPath);

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
    2
  );
  assert.equal(
    (userStateSection.match(/\.onDelete\("CASCADE"\)/g) || []).length,
    4
  );
  assert.match(
    migration,
    /idx_lc_conversation_reads_user_time[\s\S]*?\(user_id, read_at DESC\)/
  );
  assert.match(
    migration,
    /idx_lc_conversation_stars_user_time[\s\S]*?\(user_id, starred_at DESC\)/
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

type SeedOperation = {
  table: string;
  rows: Array<Record<string, unknown>>;
  conflictTarget: string | string[] | null;
  merged: boolean;
  ignored: boolean;
  mergeColumns: string[] | null;
};

const captureSeedOperations = async () => {
  const operations: SeedOperation[] = [];
  const trx = (table: string) => ({
    insert: (rows: Array<Record<string, unknown>>) => {
      const operation: SeedOperation = {
        table,
        rows,
        conflictTarget: null,
        merged: false,
        ignored: false,
        mergeColumns: null,
      };
      operations.push(operation);

      return {
        onConflict: (conflictTarget: string | string[]) => {
          operation.conflictTarget = conflictTarget;
          return {
            merge: async (columns: string[]) => {
              operation.merged = true;
              operation.mergeColumns = columns;
            },
            ignore: async () => {
              operation.ignored = true;
            },
          };
        },
      };
    },
  });
  const knex = {
    transaction: async (callback: (transaction: typeof trx) => Promise<void>) =>
      callback(trx),
  };
  const { seed } = require(`../${seedPath}`) as {
    seed: (database: typeof knex) => Promise<void>;
  };

  await seed(knex);
  return operations;
};

test("development fixture performs only scoped content upserts", async () => {
  const [seedSource, operations] = await Promise.all([
    readSource(seedPath),
    captureSeedOperations(),
  ]);

  assert.deepEqual(
    operations.map(({ table }) => table),
    contentTables.map((table) => `lingocafe.${table}`)
  );
  assert.ok(operations.every(({ merged, ignored }) => merged || ignored));
  assert.ok(operations.every(({ conflictTarget }) => conflictTarget !== null));
  assert.ok(
    operations.every(
      ({ mergeColumns, ignored }) =>
        ignored ||
        (Array.isArray(mergeColumns) && !mergeColumns.includes("created_at"))
    )
  );
  assert.doesNotMatch(seedSource, /\.del\s*\(|\.delete\s*\(|\.truncate\s*\(|\bDELETE\s+FROM\b/i);
  assert.doesNotMatch(
    seedSource,
    /conversation_reads|conversation_stars|books_progress|books_completed|translation_cache|auth\.users/
  );
});

test("development fixture is fixed, complete, and exercises plural category paths", async () => {
  const operations = await captureSeedOperations();
  const byTable = new Map(operations.map((operation) => [operation.table, operation]));
  const rows = operations.flatMap((operation) => operation.rows);
  const serialized = JSON.stringify(rows);

  assert.match(serialized, /fixture-ordering-coffee/);
  assert.match(serialized, /fixture-ordering-filter-coffee/);
  assert.match(serialized, /sv-a1/);
  for (const table of [
    "conversation_categories",
    "conversation_scenarios",
    "conversation_variants",
    "conversations",
  ]) {
    assert.ok(
      byTable
        .get(`lingocafe.${table}`)
        ?.rows.every((row) => String(row.id).startsWith("fixture-"))
    );
  }

  const parentEdges = byTable.get(
    "lingocafe.conversation_category_parents"
  )?.rows;
  assert.equal(parentEdges?.length, 2);
  assert.deepEqual(
    new Set(parentEdges?.map((row) => row.category_id)),
    new Set(["fixture-cafe-visits"])
  );

  const actorPositions = byTable
    .get("lingocafe.conversation_scenario_actors")
    ?.rows.map((row) => row.position);
  const roundPositions = byTable
    .get("lingocafe.conversation_rounds")
    ?.rows.map((row) => row.position);
  assert.deepEqual(actorPositions, [1, 2]);
  assert.deepEqual(roundPositions, [1, 2, 3, 4]);

  const availability = byTable.get(
    "lingocafe.conversation_category_availability"
  )?.rows;
  assert.equal(availability?.length, 105);
  assert.deepEqual(
    new Set(availability?.map((row) => row.language)),
    new Set(["en", "es", "it", "de", "sv"])
  );
  assert.ok(
    availability?.every(
      (row) =>
        row.conversation_count ===
        (row.language === "sv" &&
        (row.level_key === "a1" || row.level_key === "beginner")
          ? 1
          : 0)
    )
  );

  for (const table of [
    "conversation_categories",
    "conversation_scenarios",
    "conversation_variants",
    "conversations",
  ]) {
    for (const row of byTable.get(`lingocafe.${table}`)?.rows || []) {
      assert.equal(row.source_schema_version, "poc-v0");
      assert.match(String(row.source_path), /^fixture:\/\//);
      assert.match(String(row.source_hash), /^[a-f0-9]{64}$/);
      assert.equal(row.created_at, "2026-08-06T20:30:00.000Z");
      assert.equal(row.updated_at, "2026-08-06T20:30:00.000Z");
    }
  }
});
