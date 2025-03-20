/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.transaction(async trx => {
    // Create auth.groups table
    await trx.schema.withSchema('auth').createTable('groups', table => {
      table.text('id').primary();
      table.text('title').notNullable().unique();
      table.text('description');
      table.timestamp('created_at').notNullable().defaultTo(trx.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(trx.fn.now());
    });

    // Add check constraint after table creation
    await trx.raw(
      "ALTER TABLE auth.groups ADD CONSTRAINT id_format CHECK (id ~ '^[a-zA-Z0-9-]+$')"
    );

    // Create auth.groups_users table
    await trx.schema.withSchema('auth').createTable('groups_users', table => {
      table.text('group_id').notNullable();
      table.text('user_id').notNullable();
      table.timestamp('created_at').notNullable().defaultTo(trx.fn.now());

      // Primary key constraint for uniqueness
      table.primary(['group_id', 'user_id']);

      // Foreign key constraints
      table.foreign('group_id').references('id').inTable('auth.groups').onDelete('CASCADE');
      table.foreign('user_id').references('id').inTable('auth.users').onDelete('CASCADE');
    });

    // Create auth.grants table
    await trx.schema.withSchema('auth').createTable('grants', table => {
      table.text('id').primary();
      table.text('title').notNullable().unique();
      table.text('description');
      table.timestamp('created_at').notNullable().defaultTo(trx.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(trx.fn.now());
    });

    // Add check constraint after table creation
    await trx.raw(
      "ALTER TABLE auth.grants ADD CONSTRAINT grants_id_format CHECK (id ~ '^[a-zA-Z0-9-]+$')"
    );

    // Create auth.groups_grants table
    await trx.schema.withSchema('auth').createTable('groups_grants', table => {
      table.text('group_id').notNullable();
      table.text('grant_id').notNullable();
      table.timestamp('created_at').notNullable().defaultTo(trx.fn.now());

      // Primary key constraint for uniqueness
      table.primary(['group_id', 'grant_id']);

      // Foreign key constraints
      table.foreign('group_id').references('id').inTable('auth.groups').onDelete('CASCADE');
      table.foreign('grant_id').references('id').inTable('auth.grants').onDelete('CASCADE');
    });
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return Promise.all([
    // Drop tables in reverse order
    knex.schema.withSchema('auth').dropTableIfExists('groups_grants'),
    knex.schema.withSchema('auth').dropTableIfExists('grants'),
    knex.schema.withSchema('auth').dropTableIfExists('groups_users'),
    knex.schema.withSchema('auth').dropTableIfExists('groups'),
  ]);
};
