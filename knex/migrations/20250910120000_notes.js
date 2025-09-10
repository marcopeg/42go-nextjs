/**
 * Migration: notes schema, functions and helpers
 * Generated: 2025-09-10
 */

exports.up = async function (knex) {
  const sql = `
-- Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP SCHEMA IF EXISTS notes CASCADE;
CREATE SCHEMA IF NOT EXISTS notes;

-------------------------------------------------------------------------------
-- Helper: choose format string based on interval granularity
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notes.bucket_format(p_window interval)
RETURNS text AS $$
DECLARE
  secs int := extract(epoch from p_window);
BEGIN
  IF secs >= 31536000 THEN        -- ~1 year or more
    RETURN 'YYYY';
  ELSIF secs >= 2592000 THEN      -- ~1 month
    RETURN 'YYYYMM';
  ELSIF secs >= 86400 THEN        -- 1 day
    RETURN 'YYYYMMDD';
  ELSIF secs >= 3600 THEN         -- 1 hour
    RETURN 'YYYYMMDDHH24';
  ELSIF secs >= 60 THEN           -- 1 minute
    RETURN 'YYYYMMDDHH24MI';
  ELSE                            -- seconds
    RETURN 'YYYYMMDDHH24MISS';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-------------------------------------------------------------------------------
-- Internal: add a note (dynamic table creation + pruning)
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notes.note_add(
  p_title text,
  p_body text,
  p_window interval DEFAULT '1 day',
  p_retention integer DEFAULT 2
) RETURNS TABLE(bucket_id text, out_id uuid)
SECURITY DEFINER
SET search_path = notes, pg_temp
AS $$
DECLARE
  v_now timestamptz := now();
  v_epoch bigint := extract(epoch from v_now);
  v_window_secs int := extract(epoch from p_window);

  v_start timestamptz;
  v_fmt text;
  v_bucket text;
  v_drop_before timestamptz;
  v_sql text;
BEGIN
  -- validate inputs
  IF v_window_secs IS NULL OR v_window_secs <= 0 THEN
    RAISE EXCEPTION 'p_window must be > 0';
  END IF;
  IF p_retention < 1 OR p_retention > 366 THEN
    RAISE EXCEPTION 'p_retention must be between 1 and 366';
  END IF;

  -- snap to boundary
  IF v_window_secs >= 31536000 THEN
    v_start := date_trunc('year', v_now);
  ELSIF v_window_secs >= 2592000 THEN
    v_start := date_trunc('month', v_now);
  ELSIF v_window_secs >= 86400 THEN
    v_start := date_trunc('day', v_now);
  ELSE
    v_start := to_timestamp((v_epoch / v_window_secs)::bigint * v_window_secs);
  END IF;

  -- adaptive bucket name
  v_fmt := notes.bucket_format(p_window);
  v_bucket := to_char(v_start, v_fmt);

  v_drop_before := v_start - (p_window * (p_retention - 1));

  -- prevent concurrent creation
  PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket, 0));

  -- create table if missing
  v_sql := format($f$
    CREATE UNLOGGED TABLE IF NOT EXISTS %I.%I (
      note_id uuid DEFAULT public.uuid_generate_v4() PRIMARY KEY,
      title   text NOT NULL,
      body    text NOT NULL,
      created_at timestamptz DEFAULT now()
    ) WITH (autovacuum_enabled = false);
  $f$, 'notes', 'notes_'||v_bucket);
  EXECUTE v_sql;

  -- insert
  v_sql := format('INSERT INTO %I.%I (title, body) VALUES ($1,$2) RETURNING note_id;',
                  'notes','notes_'||v_bucket);
  EXECUTE v_sql USING p_title, p_body INTO out_id;

  bucket_id := v_bucket;
  RETURN NEXT;

  -- prune old buckets of same granularity
  FOR v_sql IN
    SELECT format('DROP TABLE IF EXISTS %I.%I CASCADE', n.nspname, c.relname)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'notes'
      AND c.relname ~ '^notes_[0-9]+$'
      AND c.relkind = 'r'
      AND length(substring(c.relname from '^notes_([0-9]+)$')) = length(v_bucket)
      AND (
        CASE length(substring(c.relname from '^notes_([0-9]+)$'))
          WHEN 4  THEN to_date(substring(c.relname from '^notes_([0-9]+)$'),'YYYY')::timestamptz
          WHEN 6  THEN to_date(substring(c.relname from '^notes_([0-9]+)$'),'YYYYMM')::timestamptz
          WHEN 8  THEN to_date(substring(c.relname from '^notes_([0-9]+)$'),'YYYYMMDD')::timestamptz
          WHEN 10 THEN to_timestamp(substring(c.relname from '^notes_([0-9]+)$'),'YYYYMMDDHH24')
          WHEN 12 THEN to_timestamp(substring(c.relname from '^notes_([0-9]+)$'),'YYYYMMDDHH24MI')
          WHEN 14 THEN to_timestamp(substring(c.relname from '^notes_([0-9]+)$'),'YYYYMMDDHH24MISS')
        END
      ) < v_drop_before
  LOOP
    EXECUTE v_sql;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-------------------------------------------------------------------------------
-- Parse "15m", "20s", "1d" into interval (improved version)
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notes.parse_window(p text)
RETURNS interval AS $$
DECLARE
  t text := lower(btrim(p));
  m text[];
  n int;
  u text;
BEGIN
  m := regexp_match(t, '^([0-9]+)\\s*([a-z]+)$');
  IF m IS NULL THEN
    RAISE EXCEPTION 'Invalid interval: % (use e.g. 20s, 15m, 3h, 1d, 2w, 1mo, 1y)', p;
  END IF;

  n := m[1]::int;
  u := m[2];

  IF u IN ('s','sec','secs','second','seconds') THEN RETURN make_interval(secs => n);
  ELSIF u IN ('m','min','mins','minute','minutes') THEN RETURN make_interval(mins => n);
  ELSIF u IN ('h','hr','hrs','hour','hours') THEN RETURN make_interval(hours => n);
  ELSIF u IN ('d','day','days') THEN RETURN make_interval(days => n);
  ELSIF u IN ('w','wk','wks','week','weeks') THEN RETURN make_interval(weeks => n);
  ELSIF u IN ('mo','mon','month','months') THEN RETURN make_interval(months => n);
  ELSIF u IN ('y','yr','year','years') THEN RETURN make_interval(years => n);
  ELSE
    RAISE EXCEPTION 'Invalid interval unit: % (use e.g. 20s, 15m, 3h, 1d, 2w, 1mo, 1y)', u;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-------------------------------------------------------------------------------
-- Public add
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notes.add(
  p_title text,
  p_body text,
  p_window text DEFAULT '1d',
  p_retention integer DEFAULT 2
) RETURNS TABLE(bucket_id text, out_id uuid)
SECURITY DEFINER
SET search_path = notes, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM notes.note_add(p_title, p_body, notes.parse_window(p_window), p_retention);
END;
$$ LANGUAGE plpgsql;

-------------------------------------------------------------------------------
-- Public get with expiration
-------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notes.get(
  p_bucket text,
  p_uuid uuid,
  p_expire interval DEFAULT '1 hour'
) RETURNS TABLE(title text, body text)
SECURITY DEFINER
SET search_path = notes, pg_temp
AS $$
DECLARE
  v_sql text;
BEGIN
  -- validate bucket name strictly
  IF p_bucket !~ '^[0-9]{4}(?:[0-9]{2}){0,5}$' THEN
    RAISE EXCEPTION 'Invalid bucket id %', p_bucket;
  END IF;

  BEGIN
    v_sql := format(
      'SELECT n.title, n.body
         FROM %I.%I n
        WHERE n.note_id = $1
          AND n.created_at >= now() - $2',
      'notes', 'notes_'||p_bucket
    );
    RETURN QUERY EXECUTE v_sql USING p_uuid, p_expire;
  EXCEPTION WHEN undefined_table THEN
    -- bucket already pruned: return nothing
    RETURN;
  END;
END;
$$ LANGUAGE plpgsql;
`;

  await knex.raw(sql);
};

exports.down = async function (knex) {
  await knex.raw("DROP SCHEMA IF EXISTS notes CASCADE;");
};
