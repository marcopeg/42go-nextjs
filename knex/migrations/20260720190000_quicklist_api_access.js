/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.withSchema("quicklist").alterTable("projects", (table) => {
    table.boolean("api_enabled").notNullable().defaultTo(false);
    table.index(["app_id", "api_enabled"], "idx_quicklist_projects_api_enabled");
  });

  await knex.schema.withSchema("quicklist").createTable("api_tokens", (table) => {
    table
      .uuid("id")
      .primary()
      .notNullable()
      .defaultTo(knex.raw("uuid_generate_v4()"));
    table.text("app_id").notNullable();
    table
      .text("user_id")
      .notNullable()
      .references("id")
      .inTable("auth.users")
      .onDelete("CASCADE");
    table.text("token_prefix").notNullable();
    table.text("token_hash").notNullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("last_used_at").nullable();

    table.unique(["app_id", "user_id"], {
      indexName: "uq_quicklist_api_tokens_app_user",
    });
    table.unique(["token_hash"], {
      indexName: "uq_quicklist_api_tokens_hash",
    });
    table.index(
      ["app_id", "token_prefix"],
      "idx_quicklist_api_tokens_app_prefix"
    );
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.withSchema("quicklist").dropTableIfExists("api_tokens");
  await knex.schema.withSchema("quicklist").alterTable("projects", (table) => {
    table.dropIndex(["app_id", "api_enabled"], "idx_quicklist_projects_api_enabled");
    table.dropColumn("api_enabled");
  });
};
