"use strict";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createHash } = require("node:crypto");

const QUESTIONNAIRE_ID = "sverige-tillsammans-sv-b2-comprehension";
const EXPECTED_QUESTION_COUNT = 618;
const BROKEN_PROMPTS_HASH =
  "fd6ce9c007e1ec6186ae3889c6d7ae35a468f41e8bf8775b3d72a368ca951499";
const CORRECT_PROMPTS_HASH =
  "ac40ec7721406f6209db6627d0af29bb3dd0444708ebe05aab3fc82584b49f07";

const promptsHash = (rows) =>
  createHash("sha256")
    .update(
      rows
        .sort((a, b) => a.question_id.localeCompare(b.question_id))
        .map(({ question_id, prompt }) => `${question_id}\t${prompt}`)
        .join("\n"),
    )
    .digest("hex");

exports.up = async function up(knex) {
  await knex.transaction(async (trx) => {
    const revisions = () =>
      trx
        .withSchema("lingocafe")
        .table("questionnaire_question_revisions")
        .where("questionnaire_id", QUESTIONNAIRE_ID)
        .select("question_id", "prompt");

    const before = await revisions();
    if (before.length === 0) return; // A fresh database is seeded after migration.
    if (before.length !== EXPECTED_QUESTION_COUNT) {
      throw new Error("Unexpected Sverige tillsammans questionnaire revision count");
    }

    const beforeHash = promptsHash(before);
    if (beforeHash === CORRECT_PROMPTS_HASH) return;
    if (beforeHash !== BROKEN_PROMPTS_HASH) {
      throw new Error("Sverige tillsammans prompts do not match the known seed corruption");
    }

    // The original seed stored Knex's $N bind markers inside prompt text while
    // retaining digests of the correct source. Restore those exact prompts in
    // place so existing round references and revision digests remain valid.
    await trx.raw(
      "ALTER TABLE lingocafe.questionnaire_question_revisions DISABLE TRIGGER questionnaire_question_revisions_immutable",
    );
    const updated = await trx.raw(
      `UPDATE lingocafe.questionnaire_question_revisions
       SET prompt = regexp_replace(prompt, '[$][0-9]+$', ?)
       WHERE questionnaire_id = ? AND prompt ~ '[$][0-9]+$'
       RETURNING question_id`,
      ["?", QUESTIONNAIRE_ID],
    );
    if (updated.rows.length !== EXPECTED_QUESTION_COUNT) {
      throw new Error("Sverige tillsammans prompt repair changed an unexpected row count");
    }
    await trx.raw(
      "ALTER TABLE lingocafe.questionnaire_question_revisions ENABLE TRIGGER questionnaire_question_revisions_immutable",
    );

    if (promptsHash(await revisions()) !== CORRECT_PROMPTS_HASH) {
      throw new Error("Sverige tillsammans prompts did not match the canonical source after repair");
    }
  });
};

exports.down = async function down() {
  throw new Error("The Sverige tillsammans prompt repair is intentionally irreversible");
};
