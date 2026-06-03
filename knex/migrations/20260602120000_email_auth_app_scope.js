/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema.withSchema("auth").alterTable("verification_tokens", (table) => {
    table.text("app_id").notNullable().defaultTo("default");
  });

  await knex.raw(`
    ALTER TABLE auth.verification_tokens
    DROP CONSTRAINT IF EXISTS verification_tokens_pkey
  `);

  await knex.raw(`
    ALTER TABLE auth.verification_tokens
    ADD CONSTRAINT verification_tokens_pkey
    PRIMARY KEY (app_id, identifier, token)
  `);

  await knex.schema.withSchema("auth").alterTable("verification_tokens", (table) => {
    table.dropNullable("app_id");
  });

  await knex.schema.withSchema("auth").createTable("email_auth_throttle", (table) => {
    table.text("app_id").notNullable();
    table.text("identifier").notNullable();
    table.integer("attempt_count").notNullable().defaultTo(0);
    table.timestamp("last_attempt_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("next_allowed_at").notNullable().defaultTo(knex.fn.now());
    table.jsonb("meta").notNullable().defaultTo("{}");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

    table.primary(["app_id", "identifier"]);
  });

  await knex.schema.withSchema("auth").alterTable("verification_tokens", (table) => {
    table.index(["app_id", "identifier", "expires"], "verification_tokens_app_identifier_expires_idx");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.withSchema("auth").dropTableIfExists("email_auth_throttle");

  await knex.schema.withSchema("auth").alterTable("verification_tokens", (table) => {
    table.dropIndex(["app_id", "identifier", "expires"], "verification_tokens_app_identifier_expires_idx");
  });

  await knex.raw(`
    ALTER TABLE auth.verification_tokens
    DROP CONSTRAINT IF EXISTS verification_tokens_pkey
  `);

  await knex.raw(`
    ALTER TABLE auth.verification_tokens
    ADD CONSTRAINT verification_tokens_pkey
    PRIMARY KEY (identifier, token)
  `);

  await knex.schema.withSchema("auth").alterTable("verification_tokens", (table) => {
    table.dropColumn("app_id");
  });
};
