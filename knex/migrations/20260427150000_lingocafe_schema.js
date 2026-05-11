/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw("CREATE SCHEMA IF NOT EXISTS lingocafe");

  await knex.schema.withSchema("lingocafe").createTable("books", (table) => {
    table.text("id").primary().notNullable();
    table.text("project").notNullable();
    table.text("lang").notNullable();
    table.text("level").notNullable();
    table.text("title").notNullable();
    table.text("description").notNullable();
    table.text("author").notNullable();
    table.specificType("tags", "text[]").notNullable().defaultTo("{}");
    table.jsonb("info").notNullable().defaultTo(knex.raw(`'{}'::jsonb`));
    table.timestamp("published_at").nullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.withSchema("lingocafe").createTable("books_pages", (table) => {
    table.text("book_id").notNullable();
    table.text("id").notNullable();
    table.integer("position").notNullable();
    table.text("kind").notNullable().defaultTo("chapter");
    table.text("prefix").nullable();
    table.text("title").notNullable();
    table.text("summary").nullable();
    table.text("content").nullable();

    table.primary(["book_id", "id"]);
    table.unique(["book_id", "position"]);
    table
      .foreign("book_id")
      .references("id")
      .inTable("lingocafe.books")
      .onDelete("CASCADE");
  });

  await knex.schema.withSchema("lingocafe").createTable("books_progress", (table) => {
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
    table.text("page_id").notNullable();
    table.integer("progress_bps").notNullable().defaultTo(0);
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("completed_at").nullable();

    table.unique(["user_id", "book_id"]);
  });

  await knex.raw(`
    ALTER TABLE lingocafe.books_progress
    ADD CONSTRAINT books_progress_page_fk
    FOREIGN KEY (book_id, page_id)
    REFERENCES lingocafe.books_pages (book_id, id)
    ON DELETE CASCADE
  `);

  await knex.raw(`
    ALTER TABLE lingocafe.books_progress
    ADD CONSTRAINT books_progress_bps_range
    CHECK (progress_bps >= 0 AND progress_bps <= 10000)
  `);

  await knex.raw(`
    CREATE INDEX idx_lingocafe_books_progress_user_updated_at
    ON lingocafe.books_progress (user_id, updated_at DESC)
  `);

  await knex.schema.withSchema("lingocafe").createTable("translation_cache", (table) => {
    table.text("hash").primary().notNullable();
    table.text("from").notNullable();
    table.text("to").notNullable();
    table.text("text").notNullable();
    table.text("translation").notNullable();
    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
    table.timestamp("last_used_at").notNullable().defaultTo(knex.fn.now());

    table.index(["from", "to"], "idx_lingocafe_translation_cache_langs");
    table.index(["last_used_at"], "idx_lingocafe_translation_cache_last_used");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.raw("DROP SCHEMA IF EXISTS lingocafe CASCADE");
};
