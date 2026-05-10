---
name: backlog-complete
description: Marks wip docs/backlog tasks completed using the canonical <taskid>.task.md metadata model and appends the completed history log.
---

# Complete Task

Use `backlog-complete` when the operator asks to mark a WIP task complete.

## Storage Model

- Canonical task file: `<taskid>.task.md`
- Task frontmatter lives only in the canonical task file.
- Completed tasks move to `docs/backlog/completed/<taskid>-<task-slug>/`.
- Completed history log: `docs/backlog/completed/COMPLETED.md`.

## Workflow

1. Resolve the task from `wip`.
2. Run:

```bash
python3 .agents/skills/backlog-complete/scripts/complete_task.py <taskid>
```

3. Verify the task moved to `completed`, root/status indexes were updated, and `COMPLETED.md` appended one entry.

## Rules

- Set `status: completed` in `<taskid>.task.md`.
- Set `completedAt` on the canonical task file.
- Preserve existing custom task frontmatter.
- Do not add task frontmatter to sidecar artifacts.
- Never modify `CHANGELOG.md`.
