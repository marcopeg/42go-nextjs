---
name: backlog-doctor
description: Verifies and repairs docs/backlog status folders, indexes, and sidecar frontmatter from each task's canonical <taskid>.task.md status.
---

# Doctor Backlog

Use `backlog-doctor` when the backlog may have drift between task status frontmatter, physical status folders, root `BACKLOG.md`, per-status `BACKLOG_<STATUS>.md` indexes, or sidecar artifact frontmatter.

## Workflow

1. Run the doctor in dry-run mode first:

```bash
python3 .agents/skills/backlog-doctor/scripts/doctor_backlog.py --dry-run
```

2. Inspect the JSON report.
3. If the report is coherent, run repair:

```bash
python3 .agents/skills/backlog-doctor/scripts/doctor_backlog.py
```

4. Verify:
   - every active task folder lives under the subfolder matching `status` in `<taskid>.task.md`
   - root `docs/backlog/BACKLOG.md` links to existing task files
   - each active status folder has `BACKLOG_<STATUS>.md`
   - sidecar artifacts such as refined, plan, notes, question, and clarify files do not have frontmatter
   - each active task appears exactly once in the active backlog

## Rules

- Backlog root defaults to `docs/backlog`.
- Canonical task files are named `<taskid>.task.md`.
- Task status is read from the canonical task file frontmatter.
- Only the canonical task file may keep task frontmatter.
- Supported active statuses are `draft`, `refining`, `refined`, `planned`, `wip`, and `blocked`.
- The doctor may move whole task folders between active status directories.
- The doctor rebuilds root and status-local indexes from task discovery.
- The doctor strips frontmatter from sidecar artifacts in active, completed, and archived task folders.
- The doctor must not move completed or archived task folders.
- Never modify `CHANGELOG.md`.
