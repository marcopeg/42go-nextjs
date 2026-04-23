---
name: backlog-draft
description: Creates a draft task in docs/backlog from a human operator's mind dump, using the standard task template and a generated AA11-style TaskID.
---

# Draft Task

`backlog-draft` is low-friction capture for the human operator.

Use it to turn rough notes, dictation, or a partial idea into a stored draft task without overthinking the content.

Storage model (mandatory):
- backlog root: `docs/backlog`
- active backlog index: `docs/backlog/BACKLOG.md`
- archived history log: `docs/backlog/archived/ARCHIVED.md`
- completed history log: `docs/backlog/completed/COMPLETED.md`
- draft task folders live in `docs/backlog/drafts/`
- ready task folders live in `docs/backlog/ready/`
- wip task folders live in `docs/backlog/wip/`
- blocked task folders live in `docs/backlog/blocked/`
- completed task folders live in `docs/backlog/completed/`
- archived task folders live in `docs/backlog/archived/`

TaskID rules (mandatory):
- every task has a case-insensitive TaskID in the form `AA11`
- canonical stored form is uppercase, two letters plus two digits
- when parsing user input, accept case-insensitive forms and normalize them to uppercase
- also accept a one-digit numeric suffix such as `aa1`, and normalize it to `AA01`
- generate new IDs from the locally unused pool by running:
  - `python3 scripts/generate_task_id.py`

Filename rules (mandatory):
- task folder: `docs/backlog/drafts/<taskid>-<task-slug>/`
- task file: `docs/backlog/drafts/<taskid>-<task-slug>/<taskid>.task.md`
- plan file: `docs/backlog/drafts/<taskid>-<task-slug>/<taskid>.plan.md`
- notes file: `docs/backlog/drafts/<taskid>-<task-slug>/<taskid>.notes.md`

Frontmatter rules (mandatory):
- task files use YAML frontmatter
- required task frontmatter fields:
  - `taskId`
  - `status`
  - `createdAt`
  - `updatedAt`
- optional task frontmatter fields:
  - `group`
  - `reviewedAt`
  - `plannedAt`
  - `startedAt`
  - `completedAt`
  - `reviewAfter`
- `createdAt` and `updatedAt` must be written in ISO 8601 format
- all timestamps written by this skill must use the current wall-clock timestamp at write time
- on draft creation, set:
  - `status: draft`
  - `createdAt` to the current timestamp
  - `updatedAt` to the same timestamp
- on draft creation, do not set `reviewedAt`, `plannedAt`, `startedAt`, or `completedAt` yet
- include `group` only when the operator provided one or the grouping is explicit enough to be safely inferred
- do not write `reviewAfter` on a draft

BACKLOG link convention (mandatory):
- use only relative links from `docs/backlog/BACKLOG.md`
- drafts use `./drafts/<taskid>-<task-slug>/<taskid>.task.md`
- ready tasks use `./ready/<taskid>-<task-slug>/<taskid>.task.md`
- wip tasks use `./wip/<taskid>-<task-slug>/<taskid>.task.md`
- blocked tasks use `./blocked/<taskid>-<task-slug>/<taskid>.task.md`
- `docs/backlog/BACKLOG.md` must also link to `./archived/ARCHIVED.md` and `./completed/COMPLETED.md`

State consistency rules (mandatory):
- the task must appear in exactly one BACKLOG section
- `backlog-draft` must list the task only under `## Drafts`
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
- read `docs/backlog/BACKLOG.md`
- inspect relevant task files and `.notes.md` files when prior work might inform the draft
- populate `Related to` only with concretely relevant items, not loose keyword matches

Task template (mandatory):

```markdown
---
taskId: AA11
status: draft
createdAt: 2026-04-21T23:59:00+02:00
updatedAt: 2026-04-21T23:59:00+02:00
---

# <Task title>

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
- create the task folder as `<taskid>-<task-slug>`
- write the metadata into frontmatter instead of inline `**TaskID**` or `**Status**` lines

After creating the draft:
1. add the task to `## Drafts` in `docs/backlog/BACKLOG.md`
2. ensure the task appears nowhere else in the backlog
3. report the created TaskID and draft path, and optionally mention that refinement can start next if useful
