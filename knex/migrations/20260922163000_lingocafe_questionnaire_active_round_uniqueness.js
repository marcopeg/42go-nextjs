/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema
    .withSchema("lingocafe")
    .alterTable("questionnaire_learning_item_memory", (table) => {
      table.integer("learning_steps").notNullable().defaultTo(0);
    });
  await knex.raw(`
    ALTER TABLE lingocafe.questionnaire_learning_item_memory
    ADD CONSTRAINT questionnaire_learning_item_memory_learning_steps_check
    CHECK (learning_steps >= 0)
  `);
  await knex.raw(`
    CREATE UNIQUE INDEX uq_lc_questionnaire_rounds_active_mode
    ON lingocafe.questionnaire_rounds (user_id, questionnaire_id, mode)
    WHERE status = 'in_progress'
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.raw(`
    DROP INDEX IF EXISTS lingocafe.uq_lc_questionnaire_rounds_active_mode
  `);
  await knex.schema
    .withSchema("lingocafe")
    .alterTable("questionnaire_learning_item_memory", (table) => {
      table.dropColumn("learning_steps");
    });
};
