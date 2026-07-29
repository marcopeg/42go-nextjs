/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.schema
    .withSchema("lingocafe")
    .createTable("books_completed", (table) => {
      table
        .text("user_id")
        .notNullable()
        .references("id")
        .inTable("auth.users")
        .onDelete("CASCADE");
      table
        .text("book_id")
        .notNullable()
        .references("id")
        .inTable("lingocafe.books")
        .onDelete("CASCADE");
      table.timestamp("completed_at").notNullable().defaultTo(knex.fn.now());

      table.primary(["user_id", "book_id"]);
    });

  await knex.raw(`
    CREATE INDEX idx_lingocafe_books_completed_user_completed_at
    ON lingocafe.books_completed (user_id, completed_at DESC)
  `);

  await knex.raw(`
    INSERT INTO lingocafe.books_completed (user_id, book_id, completed_at)
    SELECT user_id, book_id, completed_at
    FROM lingocafe.books_progress
    WHERE completed_at IS NOT NULL
    ON CONFLICT (user_id, book_id) DO UPDATE
    SET completed_at = EXCLUDED.completed_at
  `);

  await knex.schema
    .withSchema("lingocafe")
    .alterTable("books_progress", (table) => {
      table.dropColumn("completed_at");
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema
    .withSchema("lingocafe")
    .alterTable("books_progress", (table) => {
      table.timestamp("completed_at").nullable();
    });

  await knex.raw(`
    UPDATE lingocafe.books_progress AS progress
    SET completed_at = completed.completed_at
    FROM lingocafe.books_completed AS completed
    WHERE progress.user_id = completed.user_id
      AND progress.book_id = completed.book_id
  `);

  await knex.schema.withSchema("lingocafe").dropTable("books_completed");
};
