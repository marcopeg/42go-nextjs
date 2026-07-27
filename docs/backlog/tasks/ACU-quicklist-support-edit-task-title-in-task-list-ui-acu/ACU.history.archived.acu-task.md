# quicklist - isolate data by app-id [acu]

Make QuickList truly multi-tenant. Isolate all data by AppID, so the same user sees different projects/tasks across different apps.

## Goals

- [x] Add `app_id` to `quicklist.projects` (NOT NULL, no DB default)
- [x] Modify existing migration; DB will be recreated (no backfill needed)
- [x] Ensure all reads/writes filter by current `app_id` (via `getAppID()` / header)
- [x] Create respects `app_id`; cross-app access returns 404
- [x] Update seed to set `app_id = "default"`

## Acceptance Criteria

- [x] GET `/api/quicklists` returns only projects for current `app_id`
- [x] POST `/api/quicklists` creates a project with the current `app_id`
- [x] GET `/api/quicklists/:projectId` only works if the project belongs to current `app_id`; otherwise 404
- [x] Task endpoints under `/api/quicklists/:projectId/:taskId` are scoped by `app_id` and return 404 on cross-app ids
- [x] Migration works with recreated DB; `npm run qa` passes
- [x] Seed script populates demo data with `app_id = "default"`

## Development Plan

1. Database migration (modify existing)

- Edit `knex/migrations/20250815120000_quicklist_schema_and_tables.js`:
  - In the `projects` table definition, add:
    - `table.text("app_id").notNullable();`
  - Do NOT set a default. App code must always provide the `app_id`.
- Since we can destroy/recreate the DB, no backfill or new migration is needed.

2. Seed update

- Edit `knex/seeds/20250815_init_quicklist_data.js` and include `app_id: "default"` when inserting into `quicklist.projects`

3. API updates (scope by app)

- Source: `src/app/api/quicklists/route.ts`
  - Read `const appId = (await getAppID()) || "default"`
  - GET: add `WHERE p.app_id = appId` to all project queries (owned/collabs/invites)
  - POST: include `app_id: appId` in the insert for `quicklist.projects`
- Source: `src/app/api/quicklists/[projectId]/route.ts`
  - GET: join/filter with `p.app_id = appId`
  - PATCH: validate target project with `p.app_id = appId` before updates; all subqueries honor `app_id`
- Source: `src/app/api/quicklists/[projectId]/[taskId]/route.ts`
  - Ensure updates/checks join `tasks -> projects` and verify `projects.app_id = appId`

4. Verification

- Manual: Recreate DB, then using two apps (e.g., `default` and another configured app), create lists with the same user; ensure they do not cross-pollinate
- API smoke: list, create, get project, update task across both apps; expect 404 when crossing app boundaries

## Issues Encountered

- Task ID collision: `[acu]` is also used by a completed task ("quicklist - support edit task title in task list UI"). This should be cleaned up in the backlog by reassigning one ID. Deferring to a backlog maintenance pass.

## Progress

- Edited existing migration to add `projects.app_id` (no default) + index
- Updated seed to write `app_id: "default"`
- Scoped QuickList APIs by `app_id` using `getAppID()`
- Recreated DB (migrations rolled back + latest) and reseeded
- Ran QA (lint + build): PASS

## Next Steps

complete task (k4)
