---
name: backlog-execute
description: Executes an accepted docs/backlog plan, transitions the canonical task to wip, updates progress checkboxes, and maintains notes.
---

# Execute Task

Use `backlog-execute` only after the operator explicitly accepts a plan.

## Storage Model

- Backlog root: `docs/backlog`
- WIP status folder: `docs/backlog/wip/`
- Canonical task file: `<taskid>.task.md`
- Plan file: `<taskid>.plan.md`
- Notes file: `<taskid>.notes.md`
- Plan and notes files are content-only artifacts and must not own frontmatter.

## Execution Gate

- Do not execute without an accepted plan.
- If no plan exists, stop and direct the workflow back to `backlog-plan`.
- `accept and execute`, `yes and execute`, and `execute` after a pending acceptance prompt mean accepted plan plus execution.

## Lifecycle Rules

- Transition the task to `wip` before implementation.
- Move the whole task folder into `docs/backlog/wip/`.
- Update root and status-local backlog indexes.
- Create `<taskid>.notes.md` if it does not exist.
- Never move the task to completed or archived in this skill.

Use:

```bash
python3 .agents/skills/backlog-execute/scripts/transition_task.py <taskid> --to-state wip
```

## Plan Tracking

- Execute milestone by milestone.
- Mark completed steps in the plan immediately.
- Record deviations in both the plan notes and execution notes.

## Notes Structure

Notes files use no YAML frontmatter:

```markdown
# Execution Notes — <Task title>
**Task**: ./<taskid>.task.md
**Plan**: ./<taskid>.plan.md

## Decisions

## Problems Encountered

## Deviations From Plan

## Additional Requests

## Known Limitations
```

Never modify `CHANGELOG.md`.
