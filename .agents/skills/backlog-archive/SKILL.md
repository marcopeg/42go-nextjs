---
name: backlog-archive
description: Archives one or more tasks from docs/backlog by moving their files to archived storage and appending them to the dedicated archived history log.
---

# Archive Task

Use `backlog-archive` for tasks that are intentionally abandoned, deferred indefinitely, or superseded.

Storage model (mandatory):
- backlog root: `docs/backlog`
- active backlog index: `docs/backlog/BACKLOG.md`
- valid archive targets live as task folders in `docs/backlog/wip/`, `docs/backlog/blocked/`, `docs/backlog/drafts/`, or `docs/backlog/ready/`
- archived tasks live as task folders in `docs/backlog/archived/`
- archived history log: `docs/backlog/archived/ARCHIVED.md`

Frontmatter rules (mandatory):
- task files use YAML frontmatter with:
  - required fields: `taskId`, `status`, `createdAt`, `updatedAt`
  - optional fields: `group`, `reviewedAt`, `plannedAt`, `startedAt`, `completedAt`, `reviewAfter`
- plan and notes files use YAML frontmatter with:
  - required fields: `taskId`, `createdAt`, `updatedAt`
- archive must preserve `createdAt`
- archive must preserve `group`, `reviewedAt`, `plannedAt`, `startedAt`, and `completedAt` when present
- archive must set `status: archived`
- use the current wall-clock timestamp for any `updatedAt` written during archiving
- archive must refresh `updatedAt` on the task file
- if the task still carries `reviewAfter`, remove it during archive because the task is no longer waiting for review

TaskID resolution (mandatory):
- accept one or more case-insensitive `AA11` TaskIDs
- also accept one-digit numeric suffixes such as `aa1` and normalize them to `AA01`
- if no task ID is provided, read `docs/backlog/BACKLOG.md` and use the task or tasks currently listed under `## WIP`
- use the archive helper for the mechanical transition:
  - `python3 scripts/archive_task.py <taskid>`

For each task to archive:
1. resolve the task folder from `docs/backlog/wip/`, `docs/backlog/blocked/`, `docs/backlog/drafts/`, or `docs/backlog/ready/`
2. use `python3 scripts/archive_task.py <taskid>` for the folder move, status update, timestamp update, and log updates
3. verify that the task file and any sibling `.plan.md` and `.notes.md` files stayed together inside `docs/backlog/archived/`

Archived log convention (mandatory):
- use only relative links from `docs/backlog/archived/ARCHIVED.md`
- archived entries must link as `./<taskid>-<task-slug>/<taskid>.task.md`
- include `| [plan](...)` when a plan file exists
- include `| [notes](...)` when a notes file exists

State consistency rules:
- remove the task entry from any active section in `docs/backlog/BACKLOG.md` before adding it to `docs/backlog/archived/ARCHIVED.md`
- keep `docs/backlog/BACKLOG.md` focused on active work and its links to the historical logs
- keep unrelated tasks unchanged
- never modify `CHANGELOG.md`

Archived ordering rule (mandatory):
- treat `docs/backlog/archived/ARCHIVED.md` as a historical log
- append newly archived tasks to the end of that file
- never sort archived tasks by TaskID
