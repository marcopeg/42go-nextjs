/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  await knex.raw("CREATE SCHEMA IF NOT EXISTS events");

  await knex.raw(`
    CREATE TABLE events.events (
      created_at timestamptz NOT NULL DEFAULT now(),
      id uuid NOT NULL DEFAULT public.uuid_generate_v4(),
      app_id text NOT NULL,
      user_id text NOT NULL,
      event_at timestamptz NOT NULL DEFAULT now(),
      name text NOT NULL,
      data jsonb NOT NULL DEFAULT '{}'::jsonb,
      meta jsonb NOT NULL DEFAULT '{}'::jsonb,
      PRIMARY KEY (created_at, id)
    ) PARTITION BY RANGE (created_at)
  `);

  await knex.raw(`
    CREATE INDEX idx_events_events_app_created_id
    ON events.events (app_id, created_at, id)
  `);

  await knex.raw(`
    CREATE INDEX idx_events_events_app_name_created
    ON events.events (app_id, name, created_at DESC)
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION events.events_prepare_partitions(
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
          'CREATE TABLE IF NOT EXISTS events.%I PARTITION OF events.events FOR VALUES FROM (%L) TO (%L)',
          v_partition_name,
          v_start,
          v_end
        );
      END LOOP;
    END;
    $$ LANGUAGE plpgsql
  `);

  await knex.raw("SELECT events.events_prepare_partitions()");
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.raw("DROP SCHEMA IF EXISTS events CASCADE");
};
