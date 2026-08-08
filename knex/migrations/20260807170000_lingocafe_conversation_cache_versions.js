/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversation_publication_state", (table) => {
      table.text("id").primary();
      table.text("source_digest").notNullable();
      table.timestamp("published_at").notNullable().defaultTo(knex.fn.now());
    });

  await knex.raw(`
    ALTER TABLE lingocafe.conversation_publication_state
      ADD CONSTRAINT conversation_publication_state_singleton_check
        CHECK (id = 'current'),
      ADD CONSTRAINT conversation_publication_state_digest_check
        CHECK (source_digest ~ '^[a-f0-9]{64}$')
  `);

  await knex("lingocafe.conversation_publication_state").insert({
    id: "current",
    source_digest: "0000000000000000000000000000000000000000000000000000000000000000",
  });

  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversation_user_state_versions", (table) => {
      table.text("user_id").primary();
      table.bigInteger("version").notNullable().defaultTo(0);
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

      table
        .foreign("user_id")
        .references("id")
        .inTable("auth.users")
        .onDelete("CASCADE");
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("conversation_user_state_versions");
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("conversation_publication_state");
};
