/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversation_category_availability", (table) => {
      table.text("category_id").notNullable();
      table.text("language").notNullable();
      table.text("level_key").notNullable();
      table.integer("conversation_count").notNullable();
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

      table.primary(["category_id", "language", "level_key"]);
      table
        .foreign("category_id")
        .references("id")
        .inTable("lingocafe.conversation_categories")
        .onDelete("CASCADE");
      table.index(
        ["language", "level_key", "category_id"],
        "idx_lc_conv_cat_availability_selection"
      );
    });

  await knex.raw(`
    ALTER TABLE lingocafe.conversation_category_availability
      ADD CONSTRAINT conversation_category_availability_language_check
        CHECK (language ~ '^[a-z]{2,3}(-[a-z0-9]+)*$'),
      ADD CONSTRAINT conversation_category_availability_level_key_check
        CHECK (level_key IN (
          'a1', 'a2', 'b1', 'b2',
          'beginner', 'intermediate', 'advanced'
        )),
      ADD CONSTRAINT conversation_category_availability_count_check
        CHECK (conversation_count >= 0)
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("conversation_category_availability");
};
