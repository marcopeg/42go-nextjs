BEGIN;

ALTER TABLE auth.users
  ADD COLUMN IF NOT EXISTS feature_flags jsonb DEFAULT NULL;

CREATE TABLE IF NOT EXISTS lingocafe.translation_cache (
  hash text PRIMARY KEY,
  "from" text NOT NULL,
  "to" text NOT NULL,
  text text NOT NULL,
  translation text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  last_used_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lingocafe_translation_cache_langs
  ON lingocafe.translation_cache ("from", "to");

CREATE INDEX IF NOT EXISTS idx_lingocafe_translation_cache_last_used
  ON lingocafe.translation_cache (last_used_at);

COMMIT;

SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth'
  AND table_name = 'users'
  AND column_name = 'feature_flags';

SELECT to_regclass('lingocafe.translation_cache') AS translation_cache_table;
