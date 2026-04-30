/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw("CREATE SCHEMA IF NOT EXISTS lingocafe");

  await knex.schema.withSchema("lingocafe").createTable("profiles", (table) => {
    table
      .text("user_id")
      .primary()
      .notNullable()
      .references("id")
      .inTable("auth.users")
      .onDelete("CASCADE");
    table.text("own_lang").notNullable();
    table.text("target_lang").notNullable();
    table.text("target_level").nullable();
    table.jsonb("data").notNullable().defaultTo(knex.raw(`'{}'::jsonb`));
  });

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

  await knex.raw(`
    CREATE TABLE lingocafe.events (
      created_at timestamptz NOT NULL DEFAULT now(),
      id uuid NOT NULL DEFAULT public.uuid_generate_v4(),
      user_id text NOT NULL,
      event_at timestamptz NOT NULL DEFAULT now(),
      name text NOT NULL,
      book_id text NULL,
      page_id text NULL,
      data jsonb NOT NULL DEFAULT '{}'::jsonb,
      meta jsonb NOT NULL DEFAULT '{}'::jsonb,
      PRIMARY KEY (created_at, id),
      CHECK (page_id IS NULL OR book_id IS NOT NULL)
    ) PARTITION BY RANGE (created_at)
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION lingocafe.events_prepare_partitions(
      p_months_ahead integer DEFAULT 3
    ) RETURNS void
    AS $$
    DECLARE
      v_base timestamptz := date_trunc('month', now());
      v_i integer;
      v_start timestamptz;
      v_end timestamptz;
      v_partition_name text;
    BEGIN
      IF p_months_ahead IS NULL OR p_months_ahead < 0 THEN
        RAISE EXCEPTION 'p_months_ahead must be >= 0';
      END IF;

      FOR v_i IN 0..p_months_ahead LOOP
        v_start := v_base + make_interval(months => v_i);
        v_end := v_base + make_interval(months => v_i + 1);
        v_partition_name := format('events_%s', to_char(v_start, 'YYYYMM'));

        EXECUTE format(
          'CREATE TABLE IF NOT EXISTS lingocafe.%I PARTITION OF lingocafe.events FOR VALUES FROM (%L) TO (%L)',
          v_partition_name,
          v_start,
          v_end
        );
      END LOOP;
    END;
    $$ LANGUAGE plpgsql
  `);

  await knex.raw("SELECT lingocafe.events_prepare_partitions()");
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.raw("DROP SCHEMA IF EXISTS lingocafe CASCADE");
};
