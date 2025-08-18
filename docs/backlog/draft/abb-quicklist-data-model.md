# quicklist - data model [abb]

Design and implement the PostgreSQL data model for Quicklist.

## Goals

- [ ] Define entities, relationships, and constraints
- [ ] Plan migration scripts (schema + tables + indexes)
- [ ] Document the model for developers

## Acceptance Criteria

- [ ] Data model is defined with types, FKs, and indexes
- [ ] Migration scripts plan is clear and ready to implement
- [ ] Documentation outline is ready (articles/quicklist/DATA_MODEL.md)

## Data Model (refined)

A Project (aka “list”) contains many Tasks. Projects can be shared via Invites and, upon acceptance, produce Collabs (project-user link).

Important conventions and constraints:

- Schema name: quicklist (not "quicknotes")
- UUIDs for entity IDs (DB default via uuid-ossp)
- User references must be `text` type (auth.users.id is text)
- On project deletion: cascade to tasks, invites, collabs
- Timestamps: created_at (always), updated_at when useful
- Project.updated_at and Project.updated_by must auto-update on: project title change; task add; task delete; task modify

### Schema

- Create schema: `CREATE SCHEMA IF NOT EXISTS quicklist`
- Enable extension: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`

### Tables

#### quicklist.projects

- id: uuid primary key default uuid_generate_v4()
- title: text not null default 'new list'
- created_at: timestamp not null default now()
- updated_at: timestamp not null default now()
- updated_by: text null references auth.users(id) on delete set null
- created_by: text not null references auth.users(id) on delete restrict
- owned_by: text not null references auth.users(id) on delete restrict

Indexes:

- idx_projects_owned_by (owned_by)
- idx_projects_created_by (created_by)

Notes:

- Choose to keep ownership stable (restrict delete of owners) to avoid orphan semantics.

Project update semantics:

- updated_at/updated_by should be refreshed when:
  - project title changes
  - a task is added to the project
  - a task is deleted from the project
  - any task is modified (e.g., title, position, completed_at/by)
- Mechanism: can be enforced at DB level via triggers or at app layer; initial implementation can be app-layer updates, with optional future DB triggers for robustness.

#### quicklist.tasks

- id: uuid primary key default uuid_generate_v4()
- project_id: uuid not null references quicklist.projects(id) on delete cascade
- title: text not null
- position: integer not null default 0 // ordering within project
- created_at: timestamp not null default now()
- updated_at: timestamp not null default now()
- created_by: text not null references auth.users(id) on delete restrict
- completed_at: timestamp null
- completed_by: text null references auth.users(id) on delete set null

Indexes:

- idx_tasks_project (project_id)
- idx_tasks_project_position (project_id, position)
- idx_tasks_project_completed (project_id, completed_at)

Notes:

- Use `position` instead of `order` (reserved keyword).

#### quicklist.invites

Purpose: pending invites a user (by email) can accept.

- project_id: uuid not null references quicklist.projects(id) on delete cascade
- email: text not null // collaborator email, no user record required
- created_at: timestamp not null default now()
- created_by: text not null references auth.users(id) on delete restrict
- expires_at: timestamp null // optional, for future expiry logic

Primary key / Uniqueness:

- primary key (project_id, email) // enforce one active invite per email per project

Indexes:

- idx_invites_email (email)

#### quicklist.collabs

Purpose: explicit project-user link after invite acceptance.

- project_id: uuid not null references quicklist.projects(id) on delete cascade
- user_id: text not null references auth.users(id) on delete cascade
- role: text not null default 'editor' // future-proof (e.g., viewer|editor)
- created_at: timestamp not null default now()

Primary key / Uniqueness:

- primary key (project_id, user_id)

Indexes:

- idx_collabs_user (user_id)

### Relationships (ER quick sketch)

- projects 1—\* tasks
- projects 1—\* invites
- projects 1—\* collabs
- users (auth.users) 1—\* projects(created_by/owned_by)
- users (auth.users) 1—_ tasks(created_by) and 0..1—_ tasks(completed_by)
- users (auth.users) 1—\* collabs

### Access Patterns & Rationale

- List a user’s projects: owned_by = user OR collabs.user_id = user
- Pending invites: invites where email = current_user.email (app side)
- Project items: tasks by project_id ordered by position ASC, completed_at NULLS FIRST
- Soft delete not required initially; cascade keeps data tidy. Archive could be added later.

## Migration Plan (ready to implement)

1. Ensure extension and schema
   - CREATE EXTENSION "uuid-ossp"
   - CREATE SCHEMA quicklist
2. projects
3. tasks (FK to projects)
4. invites (FK to projects)
5. collabs (FK to projects, users)

Naming suggestion:

- knex/migrations/YYYYMMDDHHMMSS_quicklist_schema_and_tables.js

Validation:

- Verify `auth.users.id` is text (already true in 20240320_auth.js)
- Add composite PKs and indexes as above

## Documentation

Create `docs/articles/quicklist/DATA_MODEL.md` with:

- Overview + ER
- Table definitions with types & constraints
- Usage examples (queries for dashboard, pending invites, list view)
- Future extensions (roles, expiry, archived_at, comments)

## Decisions

- Deletions: use hard delete with ON DELETE CASCADE (no soft delete for now)
- Invite expiry: not for now (keep `expires_at` nullable, unused)
- Collaborator roles: only `editor` for now
- Ownership transfer: not supported for now
- Invite email normalization: validate/enforce lowercase in the app layer (no DB CHECK)

## Next Steps

execute task (k3)

### projects

- id (uuid)
- title (default "new list")
- created_at (default now)
- created_by (user's id) (references auth.users)
- updated_at (default now)
- updated_by (user's id) (references auth.users)
- owned_by (user's id) (references auth.users)

### tasks

- id (uuid)
- project_id (referenced key with auto delete)
- title (text, not empty)
- created_at (default now)
- created_by (user's id) (references auth.users)
- completed_at (date, modified when the item is checked)
- completed_by (user's id) (references auth.users)
- order (integer)

### invites

used to add an invitation and to see all the invitations that a user should accept.

- project_id (uuid, referenced and auto delete)
- email (not empty, is the collaborator's email, no need to check if it exists in the database)
- created_at
- created_by (user's id)

### collabs

when an invitation is accepted, the invite gets resolved into a collab basically by resolving email->user id. the line in "invites" is deleted and the line in "collabs" is created.

- project_id
- user_id (references auth.users)
- created_at

## Documentation

In the end, create a articles/quicklist/DATA_MODEL.md with the details about the data model
