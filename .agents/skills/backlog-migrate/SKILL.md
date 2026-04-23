---
name: backlog-migrate
description: Migrates legacy flat backlog files into the folder-based `docs/backlog` layout, preserving task state, artifacts, and links while rebuilding the backlog safely.
---

# Migrate Backlog

Use `backlog-migrate` when this skill package is copied into a project that still stores backlog tasks as flat markdown files and needs to migrate them into the folder-based repository documentation tree under `docs/backlog`.

This skill is for one-time structural migration work.

Script support:
- use the dedicated migration runner for filesystem and frontmatter work:
  - `python3 scripts/migrate_backlog.py`

## Source and Target Models

Supported source models:
- backlog root may be `.agents/backlog` or `docs/backlog`
- backlog index may be `.agents/backlog/BACKLOG.md` or `docs/backlog/BACKLOG.md`
- historical completed and archived entries may still be embedded directly inside `BACKLOG.md` in older repos
- legacy active tasks may be stored as flat files directly under the backlog root
- blocked tasks may be stored as flat files under `blocked/`
- draft tasks may be stored as flat files under `drafts/`
- ready tasks may be stored as flat files under `ready/`
- completed tasks may be stored as flat files under `completed/`
- archived tasks may be stored as flat files under `archived/`
- flat sibling plan files may exist as `<task>.plan.md`
- flat sibling notes files may exist as `<task>.notes.md`
- source task files may already contain partial YAML frontmatter such as `status:` or `title:`
- source task, plan, and notes files may still carry inline metadata lines such as `**TaskID**:` or `**Status**:`
- canonical TaskIDs are typically `AA11`, but the migration must tolerate mixed case in filenames, links, and task headers because real repos may already contain drift

Target model:
- backlog root: `docs/backlog`
- active backlog index: `docs/backlog/BACKLOG.md`
- archived history log: `docs/backlog/archived/ARCHIVED.md`
- completed history log: `docs/backlog/completed/COMPLETED.md`
- wip task folders: `docs/backlog/wip/<taskid>-<task-slug>/`
- blocked task folders: `docs/backlog/blocked/<taskid>-<task-slug>/`
- draft task folders: `docs/backlog/drafts/<taskid>-<task-slug>/`
- ready task folders: `docs/backlog/ready/<taskid>-<task-slug>/`
- completed task folders: `docs/backlog/completed/<taskid>-<task-slug>/`
- archived task folders: `docs/backlog/archived/<taskid>-<task-slug>/`
- task file: `<task-folder>/<taskid>.task.md`
- sibling plan file: `<task-folder>/<taskid>.plan.md`
- sibling notes file: `<task-folder>/<taskid>.notes.md`
- the migration may need to relocate the backlog into `docs/backlog` and reorganize each task into its own folder in the same run

Target frontmatter model:
- task files use YAML frontmatter with required fields:
  - `taskId`
  - `status`
  - `createdAt`
  - `updatedAt`
- task files may also carry optional fields:
  - `group`
  - `reviewedAt`
  - `plannedAt`
  - `startedAt`
  - `completedAt`
  - `reviewAfter`
- plan files use YAML frontmatter with required fields:
  - `taskId`
  - `createdAt`
  - `updatedAt`
- notes files use YAML frontmatter with required fields:
  - `taskId`
  - `createdAt`
  - `updatedAt`

Frontmatter migration rules:
- if the source file already has YAML frontmatter, preserve any trustworthy existing values for recognized fields before inferring replacements
- prefer existing explicit frontmatter values over inline body metadata when both exist and do not materially conflict
- preserve existing `group`, `reviewedAt`, `plannedAt`, `startedAt`, `completedAt`, and `reviewAfter` when present and trustworthy
- preserve existing `createdAt` and `updatedAt` when they reflect durable prior history, except that `updatedAt` must still be refreshed to the migration timestamp because the file is rewritten
- migrate inline metadata markers into frontmatter instead of preserving those markers in the body

## TaskID Rules

TaskID rules for this migration step (mandatory):
- canonical stored form is uppercase `AA11`
- matching is case-insensitive when the operator references a task in a skill
- also accept one-digit numeric suffix input such as `aa1`, and normalize it to `AA01`
- do not assign new TaskIDs in this migration step
- preserve existing TaskIDs exactly as stored unless a later migration step explicitly requires normalization
- use the preserved stored TaskID token in the target folder name and artifact filenames, even when the source repo already contains mixed-case IDs such as `wl24`, `hh58`, or `ZK29`

ID generation rules:
- no new IDs are generated in this migration step

Traceability rules:
- preserve all existing legacy markers such as `**Legacy Task ID**` when present
- do not rewrite task body content solely to normalize historical formatting in this migration step
- remove inline `**TaskID**` and `**Status**` lines when that metadata is migrated into frontmatter
- preserve other meaningful body metadata such as `**Legacy Task ID**`

Timestamp rules:
- use `git log --follow` as the primary best-effort evidence source for historical timestamps whenever repository history is available
- prefer git history on the most specific artifact that matches the lifecycle event:
  - task file history for task creation and early review activity
  - plan file history for planning activity
  - notes file history for execution start evidence
  - backlog/history transitions for completion when they can be identified reliably
- ignore obvious structural-only rewrites when inferring semantic lifecycle timestamps, such as backlog relocations, folderization, frontmatter-only rewrites, or other repo-wide mechanical refactors
- when git history is not available or is too ambiguous, fall back to the best trustworthy timestamp already present in frontmatter or the file body
- `createdAt` must be preserved or inferred from the oldest trustworthy evidence available
- `updatedAt` must be set to the migration timestamp because the file is being rewritten
- if the source task already has trustworthy lifecycle timestamps in frontmatter, preserve them instead of re-inferring them
- when a plan file exists, infer `plannedAt` from the oldest trustworthy timestamp on the plan artifact when no better source exists
- when a task is reviewed enough for planning and no explicit prior review timestamp exists, infer `reviewedAt` from the same evidence used for `plannedAt`
- when a notes file exists, infer `startedAt` from the oldest trustworthy timestamp on the notes artifact when no better source exists
- when a task is already in `wip` or `completed` and no notes file exists, `startedAt` may be inferred from `plannedAt` if that is the best available evidence
- when a task is already in `completed`, infer `completedAt` from the best available semantic completion evidence in git history; if that cannot be identified reliably, prefer leaving `completedAt` unset over inventing a misleading completion timestamp
- when a task is `blocked`, `reviewAfter` is mandatory; preserve the existing value when present, otherwise propose one and confirm it with the operator before writing

## Migration Goals

The migration must:
- preserve every meaningful backlog artifact
- preserve lifecycle state
- preserve relative links between task, plan, and notes files
- preserve relative links to related tasks when they point at migrated backlog files
- preserve historical ordering for `Completed` and `Archived`
- avoid silently dropping orphan or inconsistent files
- leave the repo with exactly one active backlog source of truth
- relocate the backlog into `docs/` so it becomes part of the repository documentation set
- reorganize every task into its own folder
- normalize metadata into YAML frontmatter for task, plan, and notes files
- split historical logs out of `BACKLOG.md` so the active backlog only tracks current work and links to the dedicated history logs

The migration must not:
- modify `CHANGELOG.md`
- invent missing task content
- silently discard unlisted backlog files
- leave the active backlog under both `.agents/backlog` and `docs/backlog`
- leave migrated flat task files behind in the active backlog tree

## Preflight

Before moving anything:
1. detect whether the source backlog root is `.agents/backlog` or `docs/backlog`
2. read the source `BACKLOG.md`
3. inventory every flat task file under the source backlog root and its `blocked/`, `drafts/`, `ready/`, `completed/`, and `archived/` subdirectories
4. detect sibling plan and notes files
5. compare the filesystem inventory against the source `BACKLOG.md`
6. identify:
   - tasks listed in the backlog
   - files present on disk but missing from the backlog
   - duplicate or superseded drafts
   - state mismatches between folder location and task status line

Stop and ask the operator only if the migration cannot be made safe with a reasonable assumption.

## State Mapping

Source-to-target state mapping for this step:
- source-root `/*.md` -> `docs/backlog/wip/<taskid>-<task-slug>/<taskid>.task.md` under `## WIP`
- source-root `/blocked/*.md` -> `docs/backlog/blocked/<taskid>-<task-slug>/<taskid>.task.md` under `## Blocked`
- source-root `/drafts/*.md` -> `docs/backlog/drafts/<taskid>-<task-slug>/<taskid>.task.md` under `## Drafts`
- source-root `/ready/*.md` -> `docs/backlog/ready/<taskid>-<task-slug>/<taskid>.task.md` under `## Ready Tasks`
- source-root `/completed/*.md` -> `docs/backlog/completed/<taskid>-<task-slug>/<taskid>.task.md` listed in `docs/backlog/completed/COMPLETED.md`
- source-root `/archived/*.md` -> `docs/backlog/archived/<taskid>-<task-slug>/<taskid>.task.md` listed in `docs/backlog/archived/ARCHIVED.md`

Status alignment rules:
- if a task lands in WIP, make its stored status reflect wip
- if a task lands in Blocked, make its stored status reflect blocked
- if a task lands in Drafts, make its stored status reflect draft
- if a task lands in Ready, make its stored status reflect ready
- if a task lands in Completed, make its stored status reflect completed
- if a task lands in Archived, make its stored status reflect archived

## File Naming Rules

Target filenames:
- task folder: `<taskid>-<task-slug>/`
- task file: `<taskid>.task.md`
- plan file: `<taskid>.plan.md`
- notes file: `<taskid>.notes.md`

Examples:
- `docs/backlog/wip/IR48-ideas-filters/IR48.task.md`
- `docs/backlog/blocked/ip42-show-word-count-in-the-projects-language-matrix/ip42.task.md`
- `docs/backlog/drafts/HH58-improve-projects-api/HH58.task.md`
- `docs/backlog/completed/WL24-skus-view/WL24.notes.md`

The migrated slug should preserve the existing slug exactly in this step.
The migrated task folder should preserve both the existing task ID token and the existing slug exactly in this step.

## Backlog Rules

Target backlog link convention (mandatory):
- use only relative links from `docs/backlog/BACKLOG.md`
- wip tasks use `./wip/<taskid>-<task-slug>/<taskid>.task.md`
- blocked tasks use `./blocked/<taskid>-<task-slug>/<taskid>.task.md`
- drafts use `./drafts/<taskid>-<task-slug>/<taskid>.task.md`
- ready tasks use `./ready/<taskid>-<task-slug>/<taskid>.task.md`
- `docs/backlog/BACKLOG.md` must link to `./completed/COMPLETED.md` and `./archived/ARCHIVED.md`

Historical log link convention (mandatory):
- use only relative links from `docs/backlog/completed/COMPLETED.md` for completed entries
- completed task links use `./<taskid>-<task-slug>/<taskid>.task.md`
- use only relative links from `docs/backlog/archived/ARCHIVED.md` for archived entries
- archived task links use `./<taskid>-<task-slug>/<taskid>.task.md`

State consistency rules (mandatory):
- every migrated task must appear in exactly one backlog section
- each backlog entry should include `plan` and `notes` links only when those files exist
- unrelated project files must remain unchanged

Ordering rules:
- `docs/backlog/completed/COMPLETED.md` is a historical log; preserve the existing order from the source backlog
- `docs/backlog/archived/ARCHIVED.md` is a historical log; preserve the existing order from the source backlog
- do not sort completed or archived entries by the new TaskID

## Orphan and Duplicate Handling

Orphan handling rules (mandatory):
- do not drop files that exist on disk under the source backlog root but are not listed in the source backlog
- first determine whether the file is:
  - a legitimate task omitted from the backlog
  - a stale duplicate of another task
  - a superseded draft snapshot

Default policy:
- if an orphan is clearly a stale or superseded duplicate, migrate it into `Archived`
- if it is a legitimate active task omitted from the backlog, migrate it into the state implied by its folder
- if the correct state is ambiguous and the file is not clearly stale, ask the operator

## Migration Procedure

Perform the migration in this order:

1. Detect the source backlog root and treat it as the source of truth for this migration step.
2. Create `docs/backlog/` and its subdirectories if they do not already exist.
   - including `wip/`, `blocked/`, `drafts/`, `ready/`, `completed/`, and `archived/`
3. Build the full migration inventory from the source backlog and filesystem.
4. For each task:
   - compute the target task folder as `<taskid>-<task-slug>`
   - create that folder in the target lifecycle directory
   - move the main task file to `<task-folder>/<taskid>.task.md`
   - move sibling `.plan.md` and `.notes.md` files to `<task-folder>/<taskid>.plan.md` and `<task-folder>/<taskid>.notes.md`
   - rewrite local relative links that point to migrated task, plan, or notes files
   - migrate metadata into frontmatter for task, plan, and notes files, preserving trustworthy existing frontmatter values first
   - remove inline `**TaskID**` and `**Status**` lines once that metadata exists in frontmatter
   - preserve existing legacy markers and other meaningful task body content
   - align the stored status with the target state only when it materially conflicts with the folder state
5. Rebuild `docs/backlog/BACKLOG.md` from the migrated inventory instead of trying to patch the old backlog incrementally.
   - include only active sections plus links to `./completed/COMPLETED.md` and `./archived/ARCHIVED.md`
6. Rebuild `docs/backlog/completed/COMPLETED.md` from the migrated completed inventory.
7. Rebuild `docs/backlog/archived/ARCHIVED.md` from the migrated archived inventory.
8. Validate the migrated structure.
9. Remove obsolete flat task files from the target backlog tree after the folder-based target is complete and internally consistent.
10. Remove `.agents/backlog` only after the target backlog is complete and internally consistent, when `.agents/backlog` was the source root.

## Validation Checklist

Migration validation (mandatory):
- `docs/backlog/BACKLOG.md` exists
- `docs/backlog/completed/COMPLETED.md` exists
- `docs/backlog/archived/ARCHIVED.md` exists
- every migrated task file exists in the correct target folder
- every migrated task folder contains exactly one `.task.md` file for the task
- every `plan` link resolves when a plan file exists
- every `notes` link resolves when a notes file exists
- every task appears exactly once in the target backlog
- no active backlog entry still points into flat task files
- no active backlog entry still embeds completed or archived task lists inline
- no active backlog entry still points into `.agents/backlog`
- the source `.agents/backlog` tree is removed only after validation succeeds, when it was the source root

## Expected Output

When `backlog-migrate` finishes, the project should have:
- a single active backlog rooted at `docs/backlog`
- the same task inventory and lifecycle distribution that existed before migration
- every task stored in its own folder
- migrated historical tasks still accessible through the new backlog
- historical completed and archived logs split into `docs/backlog/completed/COMPLETED.md` and `docs/backlog/archived/ARCHIVED.md`
- no active backlog dependency on `.agents/backlog`

## Notes for the Operator

This migration is intentionally conservative.

If the project contains legacy inconsistencies such as:
- tasks present on disk but missing from the backlog
- duplicate drafts for already completed work
- mismatched status lines
- missing plan or notes files

the migration should preserve the artifacts first and normalize the structure second.
