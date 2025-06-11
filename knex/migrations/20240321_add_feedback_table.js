/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('feedback', table => {
    table.text('id').primary().notNullable();
    table.text('email').notNullable();
    table.text('message').notNullable();
    table.text('ip_address');
    table.text('user_agent');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('feedback');
};
