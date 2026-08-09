import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "knex/migrations/20260806220000_lingocafe_personas.js";
const seedPath = "knex/seeds/20260806221000.lingocafe.personas.js";

const readSource = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("persona prerequisite stores one aggregate row per stable identity", async () => {
  const migration = await readSource(migrationPath);

  assert.match(migration, /createTable\("personas"/);
  assert.match(migration, /table\.text\("persona_type"\)\.notNullable\(\)/);
  for (const column of [
    "id",
    "status",
    "canonical_language",
    "working_label",
    "one_line",
    "stable_profile",
    "role_compatibility",
    "visual_fingerprint",
    "presentations",
    "is_visible",
    "source_schema_version",
    "source_path",
    "source_hash",
    "metadata",
  ]) {
    assert.match(migration, new RegExp(`[.(]"${column}"`));
  }
  assert.doesNotMatch(migration, /persona_presentations/);
  assert.match(migration, /personas_status_check/);
  assert.match(migration, /personas_type_check/);
  assert.match(migration, /persona_type IN \('archetype', 'role'\)/);
  assert.match(migration, /personas_presentations_object_check/);
  assert.match(migration, /jsonb_typeof\(presentations -> 'default'\) = 'object'/);
  assert.match(migration, /personas_source_hash_check/);
  assert.doesNotMatch(migration, /avatar.*bytea|svg.*text/i);
});

test("persona publication state is a digest-versioned singleton", async () => {
  const migration = await readSource(migrationPath);

  assert.match(migration, /createTable\("persona_publication_state"/);
  assert.match(migration, /persona_publication_state_singleton_check/);
  assert.match(migration, /persona_publication_state_digest_check/);
  assert.match(migration, /id: "current"/);
  assert.match(migration, /0{64}/);
});

test("persona fixture is scoped, idempotent, and carries a runtime asset manifest", async () => {
  const seed = await readSource(seedPath);

  assert.match(seed, /id: "fixture-learner"/);
  assert.match(seed, /persona_type: "archetype"/);
  assert.match(seed, /\.onConflict\("id"\)/);
  assert.match(seed, /\.merge\(\[/);
  assert.doesNotMatch(seed, /\.del\s*\(|\.delete\s*\(|\.truncate\s*\(|\bDELETE\s+FROM\b/i);
  assert.match(seed, /presentations: \{/);
  assert.match(seed, /default: \{/);
  assert.match(seed, /avatar_asset_key:/);
  assert.match(seed, /avatar_content_hash:/);
  assert.match(seed, /avatar_media_type: "image\/svg\+xml"/);
  assert.doesNotMatch(seed, /https?:\/\//);
});
