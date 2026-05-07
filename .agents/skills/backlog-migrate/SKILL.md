---
name: backlog-migrate
description: Migrates current active backlog tasks to the draft/refined task filename structure.
---

# Migrate Backlog

Use `backlog-migrate` when a project already has folder-based backlog tasks but still stores active task definitions as `<taskid>.task.md`.

This skill is for the structural migration to the draft/refined refinement workflow.

Script support:

- use the dedicated migration runner:
  - `python3 scripts/migrate_backlog.py`
- useful flags:
  - `--backlog-root <path>` defaults to `docs/backlog`
  - `--states draft ready blocked` controls which active states are migrated
  - `--dry-run` prints intended actions without writing
  - `--migration-timestamp <iso-timestamp>` makes the run deterministic

## Target Model

Backlog root:

- `docs/backlog`

Active lifecycle folders:

- drafts: `docs/backlog/drafts/<taskid>-<task-slug>/`
- ready: `docs/backlog/ready/<taskid>-<task-slug>/`
- blocked: `docs/backlog/blocked/<taskid>-<task-slug>/`

Task definition files:

- draft task file: `<taskid>.task.draft.md`
- refined task file: `<taskid>.task.refined.md`
- legacy task file, migrated away from active states: `<taskid>.task.md`

Mapping rules (mandatory):

- draft tasks with only `<taskid>.task.md` become `<taskid>.task.draft.md`
- ready tasks with `<taskid>.task.md` become `<taskid>.task.refined.md`
- blocked tasks with `<taskid>.task.md` become `<taskid>.task.refined.md`
- ready or blocked tasks that already have `<taskid>.task.draft.md` but no refined file are promoted to `<taskid>.task.refined.md`
- when a draft task already has `<taskid>.task.refined.md`, leave it as the active task file and preserve any draft file as historical input
- keep plan files as `<taskid>.plan.md`
- keep notes files as `<taskid>.notes.md`
- keep question round files as `<taskid>.question.vN.md`
- keep unrelated sidecar artifacts in the task folder

Out-of-scope states (mandatory):

- do not migrate completed tasks in this skill
- do not migrate archived tasks in this skill
- do not migrate wip tasks unless the operator explicitly extends this skill later
- do not perform legacy flat backlog migration here

Frontmatter rules (mandatory):

- migrated task files use YAML frontmatter with:
  - required fields: `taskId`, `status`, `createdAt`, `updatedAt`
  - optional fields: `group`, `reviewedAt`, `plannedAt`, `startedAt`, `completedAt`, `reviewAfter`
- preserve existing trustworthy frontmatter values
- preserve `createdAt`
- refresh `updatedAt` to the migration timestamp because the active task file is rewritten
- set `status` to match the lifecycle folder:
  - `draft` for files under `drafts/`
  - `ready` for files under `ready/`
  - `blocked` for files under `blocked/`
- preserve `reviewAfter` only for blocked tasks
- do not edit plan, notes, question, completed, or archived frontmatter during this migration

BACKLOG rules (mandatory):

- after migration, rebuild `docs/backlog/BACKLOG.md`
- draft entries link to `<taskid>.task.draft.md` unless a refined task file exists
- ready and blocked entries link to `<taskid>.task.refined.md`
- preserve active section ordering as much as the shared index helper can infer from the previous backlog links
- keep links to:
  - `./archived/ARCHIVED.md`
  - `./completed/COMPLETED.md`
- each active task must appear in exactly one active section

Safety rules (mandatory):

- run `python3 scripts/migrate_backlog.py --dry-run` before writing unless the operator explicitly requested an immediate write
- stop if the script reports an error
- never modify `CHANGELOG.md`
- do not delete task folders
- do not drop sidecar files
- do not invent missing task content
- do not overwrite an existing refined or draft task file with a different legacy file

Migration procedure:

1. Read `docs/backlog/BACKLOG.md`.
2. Inventory task folders under `docs/backlog/drafts/`, `docs/backlog/ready/`, and `docs/backlog/blocked/`.
3. Run the migration script in dry-run mode.
4. If the dry run is coherent, run the migration script without `--dry-run`.
5. Verify that:
   - draft folders no longer rely on `<taskid>.task.md`
   - ready folders link to `<taskid>.task.refined.md`
   - blocked folders link to `<taskid>.task.refined.md`
   - plan, notes, question, and sidecar files stayed in their folders
   - `docs/backlog/BACKLOG.md` points to existing files

Expected output:

- current draft task files use `.task.draft.md`
- current ready and blocked task files use `.task.refined.md`
- `docs/backlog/BACKLOG.md` links to the current active task artifact
- no active ready or blocked task depends on legacy `.task.md`
