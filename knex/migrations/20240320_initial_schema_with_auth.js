/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return Promise.all([
    // Create the auth schema
    knex.raw('CREATE SCHEMA IF NOT EXISTS auth'),

    // Create users table in auth schema
    knex.schema.withSchema('auth').createTable('users', table => {
      table.text('id').primary().notNullable();
      table.text('name');
      table.text('email').notNullable().unique();
      table.timestamp('email_verified');
      table.text('image');
      table.text('password');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
    }),

    // Create accounts table in auth schema
    knex.schema.withSchema('auth').createTable('accounts', table => {
      table.text('user_id').notNullable();
      table.text('type').notNullable();
      table.text('provider').notNullable();
      table.text('provider_account_id').notNullable();
      table.text('refresh_token');
      table.text('access_token');
      table.integer('expires_at');
      table.text('token_type');
      table.text('scope');
      table.text('id_token');
      table.text('session_state');

      // Create primary key constraint
      table.primary(['provider', 'provider_account_id']);

      // Create foreign key constraint
      table.foreign('user_id').references('id').inTable('auth.users').onDelete('CASCADE');
    }),

    // Create sessions table in auth schema
    knex.schema.withSchema('auth').createTable('sessions', table => {
      table.text('session_token').primary().notNullable();
      table.text('user_id').notNullable();
      table.timestamp('expires').notNullable();

      // Create foreign key constraint
      table.foreign('user_id').references('id').inTable('auth.users').onDelete('CASCADE');
    }),

    // Create verification tokens table in auth schema
    knex.schema.withSchema('auth').createTable('verification_tokens', table => {
      table.text('identifier').notNullable();
      table.text('token').notNullable();
      table.timestamp('expires').notNullable();

      // Create primary key constraint
      table.primary(['identifier', 'token']);
    }),
  ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return Promise.all([
    // Drop tables in reverse order
    knex.schema.withSchema('auth').dropTableIfExists('verification_tokens'),
    knex.schema.withSchema('auth').dropTableIfExists('sessions'),
    knex.schema.withSchema('auth').dropTableIfExists('accounts'),
    knex.schema.withSchema('auth').dropTableIfExists('users'),

    // Drop the auth schema
    knex.raw('DROP SCHEMA IF EXISTS auth CASCADE'),
  ]);
};
