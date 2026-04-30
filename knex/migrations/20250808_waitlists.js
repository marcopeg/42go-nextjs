/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Enable uuid-ossp extension if not already enabled
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  return knex.schema.createTable("waitlists", (table) => {
    // App scope for multi-tenant tracking
    table.text("app_id").notNullable().defaultTo("default");
    table.string("email").notNullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.string("ip_address");
    table.string("user_agent");
    // Primary key: ensure uniqueness per app
    table.primary(["app_id", "email"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  return knex.schema.dropTableIfExists("waitlists");
};
