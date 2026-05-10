---
name: backlog-clarify
description: Chat-based refinement for docs/backlog tasks; logs clarify rounds without frontmatter, updates the canonical <taskid>.task.md, and transitions status through refining/refined.
---

# Clarify Task

Use `backlog-clarify` when the operator wants chat-based clarification instead of file-edited question rounds.

## Storage Model

- Backlog root: `docs/backlog`
- Canonical task file: `<taskid>.task.md`
- Clarify round files: `<taskid>.clarify.v1.md`, `<taskid>.clarify.v2.md`, and so on.
- Clarify files are content-only artifacts and must not own frontmatter.
- All task-level frontmatter belongs only in `<taskid>.task.md`.

## Status Rules

- Transition to `refining` when clarification begins.
- Keep `refining` while chat rounds are pending.
- Transition to `refined` when clarification is enough and planning is proposed.
- Move the whole task folder into the matching status folder whenever status changes.

## Workflow

1. Resolve and read the task folder.
2. Read prior clarify rounds, question rounds, plan, notes, and relevant sidecars.
3. Ask 1 to 3 targeted questions in chat.
4. Record each round in the next `<taskid>.clarify.vN.md` file without frontmatter.
5. Fold usable answers into `<taskid>.task.md`.
6. If ambiguity remains, ask another chat round and keep status `refining`.
7. If plan-ready, transition to `refined` and ask exactly: `Clarification is enough. Do you want to plan this task now?`

## Clarify File Structure

```markdown
# Clarify Round v1 — <Task title>

## Questions

### 1. <question>

## Answers

### 1.

<answer or pending>

## Resolution Summary

- <resolved ambiguity or pending>
```

Never modify `CHANGELOG.md`.
