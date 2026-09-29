import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "knex/migrations/20260922120000_lingocafe_questionnaires.js";
const activeRoundMigrationPath =
  "knex/migrations/20260922163000_lingocafe_questionnaire_active_round_uniqueness.js";
const contractPath = "docs/lingocafe/QUESTIONNAIRES_DATA_MODEL.md";

const readSource = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const tables = [
  "questionnaires",
  "questionnaire_learning_items",
  "questionnaire_learning_item_pages",
  "questionnaire_questions",
  "questionnaire_question_revisions",
  "questionnaire_question_revision_learning_items",
  "questionnaire_answer_sets",
  "questionnaire_answer_options",
  "questionnaire_publication_state",
  "questionnaire_rounds",
  "questionnaire_round_items",
  "questionnaire_answers",
  "questionnaire_answer_selections",
  "questionnaire_learning_item_reviews",
  "questionnaire_learning_item_memory",
];

test("questionnaire migration creates normalized content and learner tables", async () => {
  const migration = await readSource(migrationPath);

  for (const table of tables) {
    assert.match(migration, new RegExp(`createTable\\("${table}"`));
  }
  assert.doesNotMatch(migration, /DROP SCHEMA/i);
  assert.doesNotMatch(migration, /createTable\("books/);
  assert.doesNotMatch(migration, /\.truncate\s*\(|\bTRUNCATE\b/i);
});

test("one questionnaire belongs to one book and page links cannot cross books", async () => {
  const migration = await readSource(migrationPath);

  assert.match(
    migration,
    /text\("book_id"\)[\s\S]*?\.unique\(\)[\s\S]*?inTable\("lingocafe\.books"\)/
  );
  assert.match(migration, /uq_lc_questionnaires_id_book/);
  assert.match(migration, /uq_lc_questionnaire_learning_items_book/);
  assert.match(migration, /fk_lc_q_learning_item_pages_item/);
  assert.match(migration, /inTable\("lingocafe\.questionnaire_learning_items"\)/);
  assert.match(migration, /fk_lc_q_learning_item_pages_page/);
  assert.match(
    migration,
    /inTable\("lingocafe\.books_pages"\)[\s\S]*?onDelete\("CASCADE"\)/
  );
});

test("stable questions point to digest-addressed immutable revisions", async () => {
  const migration = await readSource(migrationPath);

  assert.match(
    migration,
    /primary\(\["questionnaire_id", "question_id", "revision_digest"\]\)/
  );
  assert.match(migration, /questionnaire_questions_current_revision_fk/);
  assert.match(migration, /DEFERRABLE INITIALLY DEFERRED/);
  assert.match(migration, /questionnaire_question_revisions_digest_check/);
  assert.match(migration, /revision_digest ~ '\^\[0-9a-f\]\{64\}\$'/);
  for (const trigger of [
    "questionnaire_question_revisions_immutable",
    "questionnaire_question_revision_learning_items_immutable",
    "questionnaire_answer_sets_immutable",
    "questionnaire_answer_options_immutable",
    "questionnaire_question_revisions_history_guard",
    "questionnaire_answer_sets_history_guard",
    "questionnaire_answer_options_history_guard",
  ]) {
    assert.match(migration, new RegExp(`CREATE TRIGGER ${trigger}`));
  }
  assert.match(
    migration,
    /BEFORE UPDATE ON lingocafe\.questionnaire_question_revisions/
  );
});

test("rounds preserve exact rendered revisions while keeping modes open", async () => {
  const migration = await readSource(migrationPath);

  assert.match(
    migration,
    /integer\("requested_question_count"\)\.notNullable\(\)\.defaultTo\(10\)/
  );
  assert.match(migration, /requested_question_count > 0/);
  assert.doesNotMatch(migration, /requested_question_count\s*<=\s*10/);
  assert.match(migration, /text\("mode"\)\.notNullable\(\)\.defaultTo\("standard"\)/);
  assert.match(migration, /text\("selection_policy"\)\.notNullable\(\)/);
  assert.match(migration, /text\("selection_policy_version"\)\.notNullable\(\)/);
  assert.match(migration, /uq_lc_questionnaire_round_items_rendered/);
  assert.match(
    migration,
    /inTable\("lingocafe\.questionnaire_answer_sets"\)[\s\S]*?onDelete\("RESTRICT"\)/
  );
  assert.match(migration, /questionnaire_rounds_completed_score_check/);
});

test("only one active round exists per learner, questionnaire, and mode", async () => {
  const migration = await readSource(activeRoundMigrationPath);

  assert.match(
    migration,
    /CREATE UNIQUE INDEX uq_lc_questionnaire_rounds_active_mode/
  );
  assert.match(
    migration,
    /\(user_id, questionnaire_id, mode\)[\s\S]*?WHERE status = 'in_progress'/
  );
  assert.match(
    migration,
    /DROP INDEX IF EXISTS lingocafe\.uq_lc_questionnaire_rounds_active_mode/
  );
  assert.match(migration, /integer\("learning_steps"\).*?defaultTo\(0\)/);
  assert.match(
    migration,
    /questionnaire_learning_item_memory_learning_steps_check/
  );
});

test("answers and selections are exact append-only history", async () => {
  const migration = await readSource(migrationPath);

  assert.match(migration, /questionnaire_answers_rating_check/);
  assert.match(migration, /applied_rating BETWEEN 1 AND 4/);
  assert.match(
    migration,
    /foreign\(\[[\s\S]*?"option_id"[\s\S]*?inTable\("lingocafe\.questionnaire_answer_options"\)[\s\S]*?onDelete\("RESTRICT"\)/
  );
  for (const trigger of [
    "questionnaire_answers_append_only",
    "questionnaire_answer_selections_append_only",
    "questionnaire_learning_item_reviews_append_only",
  ]) {
    assert.match(migration, new RegExp(`CREATE TRIGGER ${trigger}`));
  }
});

test("FSRS state is scoped to learning items with versioned parameters", async () => {
  const migration = await readSource(migrationPath);

  assert.match(
    migration,
    /primary\(\["user_id", "questionnaire_id", "learning_item_id"\]\)/
  );
  assert.match(migration, /defaultTo\("fsrs"\)/);
  assert.match(migration, /defaultTo\("6"\)/);
  assert.match(migration, /decimal\("desired_retention", 4, 3\)[\s\S]*?defaultTo\(0\.9\)/);
  assert.match(migration, /questionnaire_learning_item_memory_retention_check/);
  assert.match(migration, /difficulty >= 1 AND difficulty <= 10/);
  assert.match(migration, /stability IS NULL OR stability > 0/);
  assert.match(migration, /idx_lc_questionnaire_memory_due/);
  assert.match(migration, /idx_lc_questionnaire_learning_item_reviews_user_time/);
  assert.match(migration, /fk_lc_q_learning_item_memory_last_review/);
  assert.match(
    migration,
    /fk_lc_q_learning_item_memory_last_review[\s\S]*?DEFERRABLE INITIALLY DEFERRED/
  );
  assert.doesNotMatch(migration, /retrievability"/);
});

test("rollback drops only questionnaire tables in dependency-safe order", async () => {
  const migration = await readSource(migrationPath);
  const down = migration.slice(migration.indexOf("exports.down"));
  const position = Object.fromEntries(
    tables.map((table) => [table, down.indexOf(`dropTable("${table}")`)])
  );

  for (const [table, offset] of Object.entries(position)) {
    assert.ok(offset >= 0, `${table} must be dropped by down()`);
  }
  assert.ok(position.questionnaire_learning_item_memory < position.questionnaire_learning_item_reviews);
  assert.ok(position.questionnaire_learning_item_reviews < position.questionnaire_answers);
  assert.ok(position.questionnaire_answer_selections < position.questionnaire_answers);
  assert.ok(position.questionnaire_answers < position.questionnaire_round_items);
  assert.ok(position.questionnaire_round_items < position.questionnaire_rounds);
  assert.ok(position.questionnaire_rounds < position.questionnaires);
  assert.ok(position.questionnaire_answer_options < position.questionnaire_answer_sets);
  assert.ok(position.questionnaire_answer_sets < position.questionnaire_question_revisions);
  assert.ok(position.questionnaire_learning_item_pages < position.questionnaire_learning_items);
});

test("standalone contract documents safe import, withdrawal, FSRS, and erasure", async () => {
  const contract = await readSource(contractPath);

  for (const phrase of [
    "## Ownership Boundaries",
    "## Safe Publication Algorithm",
    "## Withdrawal and Retention",
    "## Transactional Runtime Write",
    "## Account Erasure",
    "wrong answer to `Again` (1)",
    "FSRS version 6",
    "defaults to 10",
  ]) {
    assert.ok(contract.includes(phrase), `contract must include: ${phrase}`);
  }
  assert.match(contract, /a correct\s+answer to `Good` \(3\)/);
});
