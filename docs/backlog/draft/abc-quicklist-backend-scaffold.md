# quicklist - backend scaffold [abc]

Backend scaffold for the QuickList feature: secured API routes, wired to the new `quicklist` schema (projects, tasks, invites, collabs) and aligned with unified feature/policy guards.

## Context

Data model (see migration `20250815120000_quicklist_schema_and_tables.js`):

- quicklist.projects: id (uuid), title, created_by, updated_by, owned_by, created_at, updated_at
- quicklist.tasks: id, project_id, title, position, created_by, completed_at, completed_by, created_at, updated_at
- quicklist.invites: project_id + email, created_by, created_at, expires_at
- quicklist.collabs: project_id + user_id, role, created_at

Policies/flags: use unified guards with `feature: "api:quicklists"`, `auth: true`.

## Goals

- [ ] Add protected API routes under `/api/quicklists` (App Router)
- [ ] Implement CRUD for projects and tasks (minimal viable set below)
- [ ] Return pending invites with project listing
      This task has been exploded into per-endpoint stories:

- [abw] quicklist - API: list projects and invites
- [aby] quicklist - API: create project with initial task
- [acc] quicklist - API: get project with tasks (conditional)
- [acg] quicklist - API: update task (title/position/completed)
- [ack] quicklist - API: delete task
- [acr] quicklist - API: delete project

Refer to those tasks. This file is deprecated and will be removed.
