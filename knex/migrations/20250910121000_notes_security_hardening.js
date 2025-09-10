/**
 * Migration: Harden notes schema against SQL injection
 * Generated: 2025-09-10
 */

exports.up = async function (knex) {
  const sql = `
-- Replace existing notes.get function with hardened version
CREATE OR REPLACE FUNCTION notes.get(
  p_bucket text,
  p_uuid uuid,
  p_expire interval DEFAULT '1 hour'
) RETURNS TABLE(title text, body text, created_at timestamptz, time_left_seconds bigint)
SECURITY DEFINER
SET search_path = notes, pg_temp
AS $$
DECLARE
  v_sql text;
  v_table_name text;
BEGIN
  -- Strict validation of bucket id - only allow digits, specific lengths
  p_bucket := btrim(p_bucket);
  
  -- More restrictive validation
  IF p_bucket IS NULL OR p_bucket = '' THEN
    RAISE EXCEPTION 'Bucket ID cannot be empty' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  
  IF length(p_bucket) NOT IN (4,6,8,10,12,14) THEN
    RAISE EXCEPTION 'Invalid bucket ID length' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  
  IF p_bucket !~ '^[0-9]+$' THEN
    RAISE EXCEPTION 'Invalid bucket ID format' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  
  -- Additional validation: check for common SQL injection patterns
  IF p_bucket ~* '(union|select|insert|update|delete|drop|create|alter|exec|script)' THEN
    RAISE EXCEPTION 'Invalid bucket ID content' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  
  -- Validate UUID parameter
  IF p_uuid IS NULL THEN
    RAISE EXCEPTION 'UUID cannot be null' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  
  -- Validate expiration interval
  IF p_expire IS NULL OR extract(epoch from p_expire) <= 0 THEN
    RAISE EXCEPTION 'Invalid expiration interval' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  
  -- Construct table name safely using only validated bucket
  v_table_name := 'notes_' || p_bucket;
  
  -- Check if table exists before querying (prevents information disclosure)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'notes' 
    AND table_name = v_table_name
  ) THEN
    -- Return empty result instead of error to prevent enumeration
    RETURN;
  END IF;

  BEGIN
    -- Use format with %I for safe identifier substitution
    v_sql := format(
      'SELECT n.title, n.body, n.created_at,
              GREATEST(0, floor(EXTRACT(epoch FROM (n.created_at + $2) - now())))::bigint AS time_left_seconds
         FROM %I.%I n
        WHERE n.note_id = $1
          AND n.created_at >= now() - $2',
      'notes', v_table_name
    );
    RETURN QUERY EXECUTE v_sql USING p_uuid, p_expire;
  EXCEPTION 
    WHEN undefined_table THEN
      -- Table was dropped between check and query - return empty
      RETURN;
    WHEN OTHERS THEN
      -- Log the actual error but return generic message
      RAISE LOG 'notes.get error for bucket % uuid %: %', p_bucket, p_uuid, SQLERRM;
      RAISE EXCEPTION 'Data access error' USING ERRCODE = 'data_exception';
  END;
END;
$$ LANGUAGE plpgsql;

-- Replace existing notes.note_add function with hardened version  
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
  v_table_name text;
BEGIN
  -- Validate all inputs strictly
  IF p_title IS NULL OR length(btrim(p_title)) = 0 THEN
    RAISE EXCEPTION 'Title cannot be empty' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  
  IF p_body IS NULL OR length(btrim(p_body)) = 0 THEN
    RAISE EXCEPTION 'Body cannot be empty' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  
  -- Validate title and body length to prevent DoS
  IF length(p_title) > 255 THEN
    RAISE EXCEPTION 'Title too long (max 255 chars)' USING ERRCODE = 'string_data_length_mismatch';
  END IF;
  
  IF length(p_body) > 100000 THEN
    RAISE EXCEPTION 'Body too long (max 100KB)' USING ERRCODE = 'string_data_length_mismatch';
  END IF;

  -- validate inputs
  IF v_window_secs IS NULL OR v_window_secs <= 0 THEN
    RAISE EXCEPTION 'p_window must be > 0' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF p_retention < 1 OR p_retention > 366 THEN
    RAISE EXCEPTION 'p_retention must be between 1 and 366' USING ERRCODE = 'invalid_parameter_value';
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
  
  -- Additional validation of generated bucket name
  IF v_bucket !~ '^[0-9]+$' OR length(v_bucket) NOT IN (4,6,8,10,12,14) THEN
    RAISE EXCEPTION 'Generated invalid bucket name' USING ERRCODE = 'data_exception';
  END IF;

  v_drop_before := v_start - (p_window * (p_retention - 1));
  v_table_name := 'notes_' || v_bucket;

  -- prevent concurrent creation
  PERFORM pg_advisory_xact_lock(hashtextextended(v_bucket, 0));

  -- create table if missing - use validated table name
  v_sql := format($f$
    CREATE UNLOGGED TABLE IF NOT EXISTS %I.%I (
      note_id uuid DEFAULT public.uuid_generate_v4() PRIMARY KEY,
      title   text NOT NULL CHECK (length(title) <= 255),
      body    text NOT NULL CHECK (length(body) <= 100000),
      created_at timestamptz DEFAULT now()
    ) WITH (autovacuum_enabled = false);
  $f$, 'notes', v_table_name);
  
  BEGIN
    EXECUTE v_sql;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'notes.note_add table creation error for bucket %: %', v_bucket, SQLERRM;
    RAISE EXCEPTION 'Storage error' USING ERRCODE = 'system_error';
  END;

  -- insert with validated table name
  v_sql := format('INSERT INTO %I.%I (title, body) VALUES ($1,$2) RETURNING note_id;',
                  'notes', v_table_name);
  
  BEGIN
    EXECUTE v_sql USING btrim(p_title), p_body INTO out_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'notes.note_add insert error for bucket %: %', v_bucket, SQLERRM;
    RAISE EXCEPTION 'Storage error' USING ERRCODE = 'system_error';
  END;

  bucket_id := v_bucket;
  RETURN NEXT;

  -- prune old buckets of same granularity (keep existing logic but add error handling)
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    -- Log pruning errors but don't fail the insert
    RAISE LOG 'notes.note_add pruning error: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql;

-- Update parse_window function with better input validation
CREATE OR REPLACE FUNCTION notes.parse_window(p text)
RETURNS interval AS $$
DECLARE
  t text := lower(btrim(p));
  m text[];
  n int;
  u text;
BEGIN
  -- Validate input
  IF p IS NULL OR length(btrim(p)) = 0 THEN
    RAISE EXCEPTION 'Interval cannot be empty' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  
  -- Prevent excessively long inputs
  IF length(p) > 20 THEN
    RAISE EXCEPTION 'Interval string too long' USING ERRCODE = 'string_data_length_mismatch';
  END IF;
  
  -- Check for suspicious patterns
  IF t ~* '(select|union|insert|update|delete|drop|create|alter|exec|script|--|/\\*|\\*/|;)' THEN
    RAISE EXCEPTION 'Invalid interval format' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  
  m := regexp_match(t, '^([0-9]+)\\s*([a-z]+)$');
  IF m IS NULL THEN
    RAISE EXCEPTION 'Invalid interval: % (use e.g. 20s, 15m, 3h, 1d, 2w, 1mo, 1y)', p;
  END IF;

  n := m[1]::int;
  u := m[2];
  
  -- Validate range to prevent DoS
  IF n <= 0 OR n > 9999 THEN
    RAISE EXCEPTION 'Invalid interval number: % (must be 1-9999)', n;
  END IF;

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
`;

  await knex.raw(sql);
};

exports.down = async function (knex) {
  // Revert to previous versions - this would be the original migration content
  await knex.raw("SELECT 1; -- Revert would restore original functions");
};
