/**
 * Persist per-conversation reader progress independently from read state.
 *
 * A conversation is marked read only after its saved progress crosses the
 * reader completion threshold. Merely opening it must not create a read row.
 */
export async function up(knex) {
  await knex.schema
    .withSchema("lingocafe")
    .createTable("conversation_progress", (table) => {
      table
        .text("user_id")
        .notNullable()
        .references("id")
        .inTable("auth.users")
        .onDelete("CASCADE");
      table
        .text("conversation_id")
        .notNullable()
        .references("id")
        .inTable("lingocafe.conversations")
        .onDelete("CASCADE");
      table.integer("progress_bps").notNullable().defaultTo(0);
      table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());

      table.primary(["user_id", "conversation_id"]);
    });

  await knex.raw(`
    ALTER TABLE lingocafe.conversation_progress
    ADD CONSTRAINT conversation_progress_bps_range
    CHECK (progress_bps >= 0 AND progress_bps <= 10000)
  `);

  await knex.raw(`
    CREATE INDEX idx_lc_conversation_progress_user_time
    ON lingocafe.conversation_progress (user_id, updated_at DESC)
  `);

  await knex.raw(`
    INSERT INTO lingocafe.conversation_progress
      (user_id, conversation_id, progress_bps, updated_at)
    SELECT user_id, conversation_id, 10000, read_at
    FROM lingocafe.conversation_reads
    ON CONFLICT (user_id, conversation_id) DO NOTHING
  `);
}

export async function down(knex) {
  await knex.schema
    .withSchema("lingocafe")
    .dropTable("conversation_progress");
}
