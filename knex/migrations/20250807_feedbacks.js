/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("feedbacks", (table) => {
    table.uuid("id").primary().notNullable();
    // App scope for multi-tenant tracking
    table.text("app_id").notNullable().defaultTo("default");
    table.text("email").notNullable();
    table.text("message").notNullable();
    table.boolean("newsletter_subscription").defaultTo(false);
    table.text("ip_address");
    table.text("user_agent");
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists("feedbacks");
};
