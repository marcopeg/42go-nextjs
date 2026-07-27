BEGIN;

ALTER TABLE auth.users
  ADD COLUMN IF NOT EXISTS username text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM auth.users
    WHERE password IS NOT NULL
      AND username IS NULL
      AND name IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot backfill auth.users.username: password users with no username and no name exist.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT app_id, COALESCE(username, name) AS next_username, count(*) AS rows
      FROM auth.users
      WHERE password IS NOT NULL
      GROUP BY app_id, COALESCE(username, name)
      HAVING count(*) > 1
    ) duplicates
  ) THEN
    RAISE EXCEPTION 'Cannot backfill auth.users.username: duplicate password usernames would be created.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT
        app_id,
        COALESCE(username, CASE WHEN password IS NOT NULL THEN name END) AS next_username,
        count(*) AS rows
      FROM auth.users
      GROUP BY app_id, COALESCE(username, CASE WHEN password IS NOT NULL THEN name END)
      HAVING COALESCE(username, CASE WHEN password IS NOT NULL THEN name END) IS NOT NULL
        AND count(*) > 1
    ) duplicates
  ) THEN
    RAISE EXCEPTION 'Cannot add auth.users username uniqueness: duplicate final usernames exist.';
  END IF;
END $$;

UPDATE auth.users
SET username = name
WHERE password IS NOT NULL
  AND username IS NULL
  AND name IS NOT NULL;

ALTER TABLE auth.users
  DROP CONSTRAINT IF EXISTS users_app_id_name_unique;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_app_id_username_unique'
      AND conrelid = 'auth.users'::regclass
  ) THEN
    ALTER TABLE auth.users
      ADD CONSTRAINT users_app_id_username_unique UNIQUE (app_id, username);
  END IF;
END $$;

COMMIT;
