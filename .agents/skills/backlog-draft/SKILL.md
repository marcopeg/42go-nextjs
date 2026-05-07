---
name: backlog-draft
description: Creates a draft task in docs/backlog from a human operator's mind dump, using the standard task template and a generated AA11-style TaskID, with optional immediate refinement handoff.
---

# Draft Task

`backlog-draft` is low-friction capture for the human operator.

Use it to turn rough notes, dictation, or a partial idea into a stored draft task without overthinking the content.

Invocation model (mandatory):

- use this skill for direct commands such as `draft a new task: ...`, `new task: ...`, or equivalent conversational requests to capture future work
- also use this skill when the request appears inside a longer conversation and the operator clearly wants the current idea captured as a backlog item
- if the operator asks to `draft and refine`, `create and refine`, `new task and refine`, or equivalent, create the draft first and then immediately continue into `backlog-refine` in the same turn

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
- draft task file: `docs/backlog/drafts/<taskid>-<task-slug>/<taskid>.task.draft.md`
- refined task file, created later by `backlog-refine`: `docs/backlog/drafts/<taskid>-<task-slug>/<taskid>.task.refined.md`
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
- new drafts use `./drafts/<taskid>-<task-slug>/<taskid>.task.draft.md`
- refined drafts, ready tasks, wip tasks, and blocked tasks use `./<state>/<taskid>-<task-slug>/<taskid>.task.refined.md` when a refined task file exists
- legacy tasks may still use `./<state>/<taskid>-<task-slug>/<taskid>.task.md` until migrated
- `docs/backlog/BACKLOG.md` must also link to `./archived/ARCHIVED.md` and `./completed/COMPLETED.md`

State consistency rules (mandatory):

- the task must appear in exactly one BACKLOG section
- `backlog-draft` must list the task only under `## Drafts`
- never modify `CHANGELOG.md`

Behavior rules (mandatory):

- always create the draft task, even if the operator input is rough, incomplete, or dictated in a stream-of-consciousness style
- do not block on missing detail
- do not create a plan file in this skill unless the user explicitly supplied one and asked you to store it
- do not create a refined task file in this skill; that belongs to `backlog-refine`
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
- write the captured draft to `<taskid>.task.draft.md`
- write the metadata into frontmatter instead of inline `**TaskID**` or `**Status**` lines

After creating the draft:

1. add the task to `## Drafts` in `docs/backlog/BACKLOG.md`
2. ensure the task appears nowhere else in the backlog
3. report the created TaskID and draft path
4. if the operator did not already request refinement, ask exactly: `Do you want to start refinement now?`
5. if the operator already requested draft-and-refine, immediately hand off to `backlog-refine` and generate the first question round file instead of asking whether to refine

Chaining rules:

- `backlog-draft` may hand off directly to `backlog-refine` only after the draft file exists and the backlog index links to it
- pass the new TaskID and draft folder path to `backlog-refine`
- the handoff must not rewrite `<taskid>.task.draft.md`; refinement writes separate question files and eventually `<taskid>.task.refined.md`
