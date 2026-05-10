---
name: backlog-migrate
description: Migrates active docs/backlog tasks to canonical <taskid>.task.md files, status folders, and frontmatter-free sidecar artifacts.
---

# Migrate Backlog

Use `backlog-migrate` when a project has legacy active backlog tasks that use `.task.draft.md`, `.task.refined.md`, `drafts/`, or `ready/`.

## Target Model

- Canonical task file: `<taskid>.task.md`
- Task frontmatter lives only in the canonical task file.
- Active statuses: `draft`, `refining`, `refined`, `planned`, `wip`, `blocked`
- Each active status has its own folder under `docs/backlog/`.
- Each active status folder has `BACKLOG_<STATUS>.md`.
- Sidecar artifacts such as plan, notes, question, clarify, and refined files must not own frontmatter.

## Workflow

1. Read `docs/backlog/BACKLOG.md`.
2. Run dry-run:

```bash
python3 .agents/skills/backlog-migrate/scripts/migrate_backlog.py --dry-run
```

3. Inspect the JSON action report.
4. If coherent, run:

```bash
python3 .agents/skills/backlog-migrate/scripts/migrate_backlog.py
```

5. The migration script runs `backlog-doctor` automatically after a write migration.
6. Run `backlog-doctor --dry-run` afterward if you need an extra report.

## Migration Rules

- `.task.draft.md` becomes `<taskid>.task.md`.
- Metadata from `.task.refined.md` wins over existing draft metadata because current skills wrote lifecycle metadata there.
- Preserve custom task frontmatter by merging it into `<taskid>.task.md`.
- Preserve user-authored artifact content.
- Remove frontmatter from non-main artifacts after task metadata is centralized.
- Call `backlog-doctor` at the end of write migrations so indexes and sidecar frontmatter are repaired from the canonical model.
- Move task folders into the folder matching canonical `status`.
- Do not migrate completed or archived history unless explicitly requested later.
- Never modify `CHANGELOG.md`.
