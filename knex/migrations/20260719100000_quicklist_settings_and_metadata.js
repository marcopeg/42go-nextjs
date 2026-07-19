/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.withSchema("quicklist").alterTable("projects", (table) => {
    table
      .jsonb("settings")
      .notNullable()
      .defaultTo(knex.raw("'{}'::jsonb"));
    table
      .jsonb("metadata")
      .notNullable()
      .defaultTo(knex.raw("'{}'::jsonb"));
  });

  await knex.schema.withSchema("quicklist").alterTable("tasks", (table) => {
    table
      .jsonb("metadata")
      .notNullable()
      .defaultTo(knex.raw("'{}'::jsonb"));
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.withSchema("quicklist").alterTable("tasks", (table) => {
    table.dropColumn("metadata");
  });

  await knex.schema.withSchema("quicklist").alterTable("projects", (table) => {
    table.dropColumn("metadata");
    table.dropColumn("settings");
  });
};
