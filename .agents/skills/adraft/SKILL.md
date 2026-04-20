---
name: adraft
description: Creates a draft task in .agents/backlog from a human operator's mind dump, using the standard task template and a generated AA11-style TaskID.
---

# Draft Task

`adraft` is low-friction capture for the human operator.

Use it to turn rough notes, dictation, or a partial idea into a stored draft task without overthinking the content.

Storage model (mandatory):
- backlog root: `.agents/backlog`
- backlog index: `.agents/backlog/BACKLOG.md`
- draft tasks live in `.agents/backlog/drafts/`
- ready tasks live in `.agents/backlog/ready/`
- in-progress tasks live in `.agents/backlog/`
- completed tasks live in `.agents/backlog/completed/`
- archived tasks live in `.agents/backlog/archived/`

TaskID rules (mandatory):
- every task has a case-insensitive TaskID in the form `AA11`
- canonical stored form is uppercase, two letters plus two digits
- when parsing user input, accept case-insensitive forms and normalize them to uppercase
- also accept a one-digit numeric suffix such as `aa1`, and normalize it to `AA01`
- generate new IDs from the locally unused pool by running:
  - `python3 .agents/skills/adraft/scripts/generate_task_id.py`

Filename rules (mandatory):
- task file: `.agents/backlog/drafts/<taskid>.<task-slug>.md`
- plan file: `.agents/backlog/drafts/<taskid>.<task-slug>.plan.md`
- notes file: `.agents/backlog/drafts/<taskid>.<task-slug>.notes.md`

BACKLOG link convention (mandatory):
- use only relative links from `.agents/backlog/BACKLOG.md`
- drafts use `./drafts/...`
- ready tasks use `./ready/...`
- in-progress root tasks use `./...`
- completed tasks use `./completed/...`
- archived tasks use `./archived/...`

State consistency rules (mandatory):
- the task must appear in exactly one BACKLOG section
- `adraft` must list the task only under `## Drafts`
- never modify `CHANGELOG.md`

Behavior rules (mandatory):
- always create the draft task, even if the operator input is rough, incomplete, or dictated in a stream-of-consciousness style
- do not block on missing detail
- do not create a plan file in this skill unless the user explicitly supplied one and asked you to store it
- do not hallucinate content just to make the template look complete
- if a section was not covered by the operator input, write exactly: `information is missing`
- preserve uncertainty, tradeoffs, and open-ended language from the operator instead of prematurely deciding things

Approval model (mandatory):
- treat an explicit request to draft or capture a task as sufficient approval to create or update the draft backlog entry
- do not ask for confirmation before writing the draft when the operator intent is clear
- only stop to ask a follow-up question when the task title or storage target is genuinely ambiguous enough that creating the draft would likely capture the wrong work item

Related-work lookup (mandatory):
- read `.agents/backlog/BACKLOG.md`
- inspect relevant task files and `.notes.md` files when prior work might inform the draft
- populate `Related to` only with concretely relevant items, not loose keyword matches

Task template (mandatory):

```markdown
# <Task title>

**TaskID**: AA11
**Status**: draft

## Elevator's Pitch

...

## Business Gain

...

## Current State

...

## Desired State

...

## Definition of Success

...

## Additional Context

...

## Assumptions

...

## Constraints

...

## Acceptance Criteria

...

## Dos

...

## Don'ts

...

## Open Questions

...

## Related to

...
```

Drafting rules:
- create every section, every time
- write the task in clear operator-facing prose
- do not reinterpret the task into a narrower implementation unless the operator already implied it
- generate a kebab-case slug from the task title
- include `**TaskID**` and `**Status**` near the top of the file

After creating the draft:
1. add the task to `## Drafts` in `.agents/backlog/BACKLOG.md`
2. ensure the task appears nowhere else in the backlog
3. report the created TaskID and draft path, and optionally mention that refinement can start next if useful
