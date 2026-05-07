---
name: backlog-draft
description: Drafts new docs/backlog tasks from rough operator input or commands like draft task, new task, capture this, draft and refine, or create and refine; agents prepare structured sections, run the scaffold script, and report the generated AA11 TaskID plus draft path.
---

# Draft Task

Create draft backlog tasks through the scaffold script first. The agent owns interpretation. Python owns deterministic files.

## Workflow

1. Treat an explicit request to draft or capture a task as approval to create the draft.
2. Do not ask for confirmation when the operator intent is clear.
3. Ask a follow-up only when the task title or target work item is ambiguous enough that a draft would likely capture the wrong thing.
4. Read `docs/backlog/BACKLOG.md`.
5. Inspect concretely relevant task files and `.notes.md` files when prior work can improve the draft.
6. Prepare structured task content from the operator input and lookup results.
7. Run `.agents/skills/backlog-draft/scripts/scaffold_draft.py`.
8. Verify the returned draft path exists and the task appears once in `docs/backlog/BACKLOG.md`.
9. Report the created TaskID and draft path.
10. If the operator did not already request refinement, ask exactly: `Do you want to start refinement now?`
11. If the operator requested draft-and-refine, continue into `backlog-refine` after the scaffold succeeds.

## Agent-Owned Work

- Derive the clearest task title from the operator input.
- Include `group` only when the operator provided it or it is explicit enough to infer safely.
- Write clear operator-facing section content.
- Preserve uncertainty, tradeoffs, and open-ended language.
- Do not narrow the task beyond what the operator implied.
- Do not hallucinate content to make the template look complete.
- Populate `Related to` only with concretely relevant items, not loose keyword matches.
- Do not create a plan file unless the operator explicitly supplied one and asked to store it.
- Do not create a refined task file; refinement owns that.
- Never modify `CHANGELOG.md`.

## Script-Owned Work

Use the scaffold script for deterministic creation:

```bash
python3 .agents/skills/backlog-draft/scripts/scaffold_draft.py --input /path/to/input.json
```

The script owns:

- generating a free AA11-style TaskID
- creating `docs/backlog/drafts/<taskid>-<task-slug>/`
- writing `<taskid>.task.draft.md`
- writing required draft frontmatter
- writing every standard body section
- filling omitted section content with `information is missing`
- rebuilding `docs/backlog/BACKLOG.md`
- verifying the draft is linked once in the active backlog
- printing JSON with at least `taskId`, `taskFolder`, and `draftPath`

Keep `generate_task_id.py` as the narrow ID helper. Use `scaffold_draft.py` for full draft creation.

## Scaffold Input

Pass JSON as an input file or stdin. Prefer an input file when section bodies are large.

Required:

- `title`

Optional:

- `group`
- `sections`

The `sections` object may use the standard section names directly:

```json
{
  "title": "Improve Backlog Draft Skill Scaffolding",
  "group": "agents",
  "sections": {
    "Elevator's Pitch": "Short pitch.",
    "Business Gain": "Business value.",
    "Current State": "Current behavior.",
    "Desired State": "Target behavior.",
    "Definition of Success": "Success definition.",
    "Additional Context": "Extra context.",
    "Assumptions": "- Assumption one",
    "Constraints": "- Constraint one",
    "Acceptance Criteria": "- [ ] Criterion one",
    "Dos": "- Do this",
    "Don'ts": "- Don't do that",
    "Open Questions": "- Question one",
    "Related to": "information is missing"
  }
}
```

The script also accepts common aliases such as `pitch`, `businessValue`, `currentState`, `desiredState`, `acceptanceCriteria`, `dos`, `donts`, and `related`.

## Required Sections

The scaffold always writes:

- `Elevator's Pitch`
- `Business Gain`
- `Current State`
- `Desired State`
- `Definition of Success`
- `Additional Context`
- `Assumptions`
- `Constraints`
- `Acceptance Criteria`
- `Dos`
- `Don'ts`
- `Open Questions`
- `Related to`

If the operator did not cover a section, send no content for that section or send an empty value. The script will write exactly `information is missing`.

## Scaffold Output

Parse the JSON output. Use it for verification and final reporting.

Expected fields include:

- `taskId`
- `title`
- `status`
- `taskFolder`
- `draftPath`
- `absoluteDraftPath`
- `backlogPath`
- `backlogEntry`
- `createdAt`
- `updatedAt`

## Chaining

`backlog-draft` may hand off directly to `backlog-refine` only after:

- the draft file exists
- `docs/backlog/BACKLOG.md` links to it
- the scaffold output has been checked

Pass the new TaskID and task folder path to `backlog-refine`. Do not rewrite `<taskid>.task.draft.md` during refinement.
