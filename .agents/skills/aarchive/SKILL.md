---
name: aarchive
description: Archives one or more tasks from .agents/backlog by moving their files to archived storage and appending them to the Archived backlog log.
---

# Archive Task

Use `aarchive` for tasks that are intentionally abandoned, deferred indefinitely, or superseded.

Storage model (mandatory):
- backlog root: `.agents/backlog`
- valid archive targets may live in `.agents/backlog/`, `.agents/backlog/drafts/`, or `.agents/backlog/ready/`
- archived tasks live in `.agents/backlog/archived/`

TaskID resolution (mandatory):
- accept one or more case-insensitive `AA11` TaskIDs
- also accept one-digit numeric suffixes such as `aa1` and normalize them to `AA01`
- if no task ID is provided, read `.agents/backlog/BACKLOG.md` and use the task or tasks currently listed under `## In Progress`

For each task to archive:
1. resolve the task file from `.agents/backlog/`, `.agents/backlog/drafts/`, or `.agents/backlog/ready/`
2. move the task file into `.agents/backlog/archived/`
3. move sibling `.plan.md` and `.notes.md` files with the same base name when present
4. update the task status to `archived` when a status line or status field exists
5. update `.agents/backlog/BACKLOG.md` so the task appears exactly once, under `## Archived`

BACKLOG link convention (mandatory):
- use only relative links from `.agents/backlog/BACKLOG.md`
- archived entries must link as `./archived/...`
- include `| [plan](...)` when a plan file exists
- include `| [notes](...)` when a notes file exists

State consistency rules:
- remove the task entry from any other backlog section before adding it to `## Archived`
- keep unrelated tasks unchanged
- never modify `CHANGELOG.md`

Archived ordering rule (mandatory):
- treat `## Archived` as a historical log
- append newly archived tasks to the end of the section
- never sort archived tasks by TaskID
