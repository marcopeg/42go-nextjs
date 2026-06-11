/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_auth_accounts_app_user_provider
    ON auth.accounts (app_id, user_id, provider)
  `);

  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_events_events_app_user_event_created_id
    ON events.events (app_id, user_id, event_at DESC, created_at DESC, id DESC)
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.raw("DROP INDEX IF EXISTS events.idx_events_events_app_user_event_created_id");
  await knex.raw("DROP INDEX IF EXISTS auth.idx_auth_accounts_app_user_provider");
};
