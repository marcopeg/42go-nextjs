---
name: backlog-draft
description: Drafts new docs/backlog tasks from rough operator input; creates a canonical <taskid>.task.md under the draft status folder and updates backlog indexes.
---

# Draft Task

Use `backlog-draft` when the operator asks to draft, capture, or create a backlog task.

## Storage Model

- Backlog root: `docs/backlog`
- Draft status folder: `docs/backlog/draft/<taskid>-<task-slug>/`
- Canonical task file: `<taskid>.task.md`
- The canonical task file is the only task-level frontmatter owner.
- New drafts start with `status: draft`.
- Non-main artifacts must not own task frontmatter.

## Workflow

1. Treat a clear draft/capture request as approval to create the task.
2. Read `docs/backlog/BACKLOG.md`.
3. Inspect concretely relevant task files or notes when prior work can improve the draft.
4. Prepare structured task content from the operator input.
5. Run:

```bash
python3 .agents/skills/backlog-draft/scripts/scaffold_draft.py --input /path/to/input.json
```

6. Verify the returned task path exists and appears once in `docs/backlog/BACKLOG.md`.
7. Report the TaskID and task path.
8. If the operator did not already request refinement, ask exactly: `Do you want to start refinement now?`

## Agent-Owned Work

- Derive the clearest task title.
- Include `group` only when explicit or safe to infer.
- Preserve uncertainty and open-ended language.
- Populate `Related to` only with concretely relevant items.
- Do not create plan, notes, question, or refined files during drafting.
- Never modify `CHANGELOG.md`.

## Script-Owned Work

The scaffold script owns:

- generating a free AA11-style TaskID
- creating `docs/backlog/draft/<taskid>-<task-slug>/`
- writing `<taskid>.task.md`
- writing required task frontmatter
- writing every standard body section
- filling missing section content with `information is missing`
- rebuilding root and status-local backlog indexes
- printing JSON with at least `taskId`, `taskFolder`, and `taskPath`

## Scaffold Input

Use JSON with:

- `title` required
- `group` optional
- `sections` optional

Section names are the standard task template headings. Common aliases such as `pitch`, `businessValue`, `currentState`, `desiredState`, `acceptanceCriteria`, and `related` are accepted by the script.

## Chaining

If the operator requested draft-and-refine, continue into `backlog-refine` only after the canonical task file exists and the backlog indexes link to it.
