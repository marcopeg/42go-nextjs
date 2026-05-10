---
name: backlog-refine
description: File-based refinement for docs/backlog tasks; writes question rounds without frontmatter, updates the canonical <taskid>.task.md, and transitions status through refining/refined.
---

# Refine Task

Use `backlog-refine` to make a task explicit enough for planning through file-edited question rounds.

## Storage Model

- Backlog root: `docs/backlog`
- Resolve tasks from active status folders: `draft`, `refining`, `refined`, `planned`, `wip`, and `blocked`.
- Canonical task file: `<taskid>.task.md`
- Question round files: `<taskid>.question.v1.md`, `<taskid>.question.v2.md`, and so on.
- Question files are content-only artifacts and must not own frontmatter.
- All task-level frontmatter belongs only in `<taskid>.task.md`.

## Status Rules

- When refinement begins, transition the task to `refining`.
- Keep the task in `refining` while question rounds are pending.
- When the task is plan-ready and planning is proposed, transition the task to `refined`.
- Move the whole task folder into the matching status folder whenever status changes.

Use the shared transition helper where practical:

```bash
python3 .agents/skills/backlog-core/scripts/backlog_tool.py transition <taskid> --to-state refining
python3 .agents/skills/backlog-core/scripts/backlog_tool.py transition <taskid> --to-state refined
```

## Workflow

1. Resolve the task:

```bash
python3 .agents/skills/backlog-refine/scripts/resolve_task.py <taskid>
```

2. Read the task folder, including task, question rounds, plan, notes, and relevant sidecars.
3. Read `docs/backlog/BACKLOG.md`.
4. Inspect concretely relevant prior tasks and notes.
5. If no question round exists, transition to `refining`, write `<taskid>.question.v1.md`, and stop.
6. If the latest question round has no usable answers, stop and tell the operator which file needs answers.
7. If answers exist, fold them into `<taskid>.task.md`.
8. If ambiguity remains, write the next question round and keep status `refining`.
9. If plan-ready, transition to `refined` and ask exactly: `Refinement is enough. Do you want to plan this task now?`

## Question Files

Question files use this structure without YAML frontmatter:

```markdown
# Refinement Questions v1 — <Task title>

Answer inline under each question, then return to chat and say `next round`.

## Questions

### 1. <question>

Answer:
```

## Readiness Gate

Treat the task as plan-ready only when these task sections are concrete enough for implementation sequencing or explicitly `n/a`:

- `Business Gain`
- `Current State`
- `Desired State`
- `Definition of Success`
- `Constraints`
- `Acceptance Criteria`

Never modify `CHANGELOG.md`.
