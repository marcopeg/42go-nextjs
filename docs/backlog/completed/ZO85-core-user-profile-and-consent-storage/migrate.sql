BEGIN;

ALTER TABLE auth.users
  ADD COLUMN profile jsonb DEFAULT NULL,
  ADD COLUMN consent jsonb DEFAULT NULL;

DROP TABLE lingocafe.profiles;

COMMIT;

SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'auth'
  AND table_name = 'users'
  AND column_name IN ('profile', 'consent')
ORDER BY column_name;

SELECT to_regclass('lingocafe.profiles') AS lingocafe_profiles;
