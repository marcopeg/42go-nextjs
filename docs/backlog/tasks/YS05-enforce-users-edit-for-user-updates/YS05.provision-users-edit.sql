-- YS05: manually provision users:edit for existing app-scoped backoffice roles.
--
-- Run this file explicitly with the target database's PostgreSQL client.
-- It is idempotent and changes no existing role/grant mappings.
--
-- Before execution, retain the output of this query if rollback may be needed:
-- SELECT app_id
-- FROM auth.roles_grants
-- WHERE role_id = 'backoffice' AND grant_id = 'users:edit'
-- ORDER BY app_id;

BEGIN;

INSERT INTO auth.grants (
  id,
  title,
  description,
  created_at,
  updated_at
)
VALUES (
  'users:edit',
  'Edit user',
  'Let edit a user account',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

WITH backoffice_apps AS (
  SELECT app_id
  FROM auth.roles_users
  WHERE role_id = 'backoffice'

  UNION

  SELECT app_id
  FROM auth.roles_grants
  WHERE role_id = 'backoffice'
)
INSERT INTO auth.roles_grants (
  app_id,
  role_id,
  grant_id,
  created_at
)
SELECT
  app_id,
  'backoffice',
  'users:edit',
  CURRENT_TIMESTAMP
FROM backoffice_apps
ON CONFLICT (app_id, role_id, grant_id) DO NOTHING;

COMMIT;

-- Verification:
-- SELECT app_id, role_id, grant_id
-- FROM auth.roles_grants
-- WHERE role_id = 'backoffice' AND grant_id = 'users:edit'
-- ORDER BY app_id;
--
-- Rollback guidance:
-- Remove only app mappings that were absent from the retained pre-execution
-- query. Do not delete the global auth.grants row while any role still uses it.
-- Example for explicitly verified newly-added apps:
-- DELETE FROM auth.roles_grants
-- WHERE role_id = 'backoffice'
--   AND grant_id = 'users:edit'
--   AND app_id IN ('replace-with-newly-added-app-id');
