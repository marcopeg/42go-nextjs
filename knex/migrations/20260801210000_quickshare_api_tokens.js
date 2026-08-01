/**
 * Personal automation credentials belong to a QuickShare account. The token
 * material itself is intentionally represented only by its deterministic hash.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.withSchema("quickshare").createTable("api_tokens", (table) => {
    table
      .uuid("id")
      .primary()
      .notNullable()
      .defaultTo(knex.raw("uuid_generate_v4()"));
    table.text("app_id").notNullable();
    table.uuid("account_id").notNullable();
    table.text("user_id").notNullable();
    table.text("token_prefix").notNullable();
    table.text("token_hash").notNullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("last_used_at").nullable();

    table.unique(["app_id", "user_id"], {
      indexName: "uq_quickshare_api_tokens_app_user",
    });
    table.unique(["token_hash"], {
      indexName: "uq_quickshare_api_tokens_hash",
    });
    table.index(
      ["app_id", "token_prefix"],
      "idx_quickshare_api_tokens_app_prefix"
    );
    table
      .foreign(["app_id", "account_id"])
      .references(["app_id", "id"])
      .inTable("quickshare.accounts")
      .onDelete("CASCADE");
    table
      .foreign(["app_id", "user_id"])
      .references(["app_id", "id"])
      .inTable("auth.users")
      .onDelete("CASCADE");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.withSchema("quickshare").dropTableIfExists("api_tokens");
};
