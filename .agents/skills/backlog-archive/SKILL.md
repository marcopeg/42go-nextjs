---
name: backlog-archive
description: Archives active docs/backlog tasks using the canonical <taskid>.task.md metadata model and appends the archived history log.
---

# Archive Task

Use `backlog-archive` when the operator asks to archive an active task.

## Storage Model

- Canonical task file: `<taskid>.task.md`
- Task frontmatter lives only in the canonical task file.
- Archived tasks move to `docs/backlog/archived/<taskid>-<task-slug>/`.
- Archived history log: `docs/backlog/archived/ARCHIVED.md`.

## Workflow

1. Resolve the task from an active status folder.
2. Run:

```bash
python3 .agents/skills/backlog-archive/scripts/archive_task.py <taskid>
```

3. Verify the task moved to `archived`, root/status indexes were updated, and `ARCHIVED.md` appended one entry.

## Rules

- Set `status: archived` in `<taskid>.task.md`.
- Preserve existing custom task frontmatter.
- Clear active-only fields such as `reviewAfter` when archiving.
- Do not add task frontmatter to sidecar artifacts.
- Never modify `CHANGELOG.md`.
