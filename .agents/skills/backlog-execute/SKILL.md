---
name: backlog-execute
description: Executes an accepted plan for a task in docs/backlog, keeps the plan updated as progress state, and maintains detailed execution notes.
---

# Execute Task

Use `backlog-execute` only after the plan was explicitly accepted by the human operator.

Storage model (mandatory):
- backlog root: `docs/backlog`
- execution state lives in task folders under `docs/backlog/wip/`
- task file, plan file, and notes file must live together while the task is in wip

Frontmatter rules (mandatory):
- task files use YAML frontmatter with:
  - required fields: `taskId`, `status`, `createdAt`, `updatedAt`
  - optional fields: `group`, `reviewedAt`, `plannedAt`, `startedAt`, `completedAt`, `reviewAfter`
- plan files use YAML frontmatter with:
  - required fields: `taskId`, `createdAt`, `updatedAt`
- notes files use YAML frontmatter with:
  - required fields: `taskId`, `createdAt`, `updatedAt`
- execution must preserve `createdAt` values on every file
- execution must refresh `updatedAt` whenever task, plan, or notes files are changed
- use the current wall-clock timestamp for any `updatedAt`, newly created notes `createdAt`, newly written `startedAt`, and blocked-state `reviewAfter` confirmation writes
- execution must preserve `group`, `reviewedAt`, and `plannedAt` when already present
- when a task first enters WIP, set `status: wip` and set `startedAt` if it is not already set
- if the task enters WIP from `blocked`, remove `reviewAfter`
- when a notes file is created for the first time, initialize its frontmatter immediately
- when a blocked state is introduced, `reviewAfter` is mandatory and must be either:
  - proposed by the agent and confirmed by the human operator
  - or provided directly by the human operator

TaskID resolution (mandatory):
- accept a case-insensitive `AA11` TaskID
- also accept `aa1` and normalize it to `AA01`
- resolve the task folder from `docs/backlog/wip/`, `docs/backlog/ready/`, `docs/backlog/drafts/`, or `docs/backlog/blocked/`
- for state moves into `wip` or `blocked`, use:
  - `python3 scripts/transition_task.py <taskid> --to-state wip`
  - `python3 scripts/transition_task.py <taskid> --to-state blocked --review-after <iso-date-or-datetime>`

Execution gate (mandatory):
- do not execute without an accepted plan
- if no plan file exists, stop and direct the workflow back to `backlog-plan`
- if the plan exists but has not been explicitly accepted, stop and ask for acceptance first
- the only shortcut is when the current operator reply clearly means `accept + execute`

Lifecycle rules (mandatory):
- move the whole task folder into `docs/backlog/wip/` before execution if it is currently in Drafts, Ready, or Blocked
- keep the task file and plan file inside that folder
- create the notes file inside that folder if it does not yet exist
- update `docs/backlog/BACKLOG.md` so the task appears only under `## WIP`
- maintain task, plan, and notes frontmatter according to the frontmatter rules
- prefer the transition script for folder moves and index updates, then update any remaining plan/notes content manually
- never move the task to Completed or Archived in this skill
- never update `docs/backlog/completed/COMPLETED.md` or `docs/backlog/archived/ARCHIVED.md` in this skill
- never modify `CHANGELOG.md`

Plan-tracking rules (mandatory):
- execute the accepted plan milestone by milestone
- when a step is completed, update the plan immediately
- when a milestone is completed, update the plan immediately
- keep the plan as the current progress state of the task
- if implementation must diverge from the plan, record that both in the plan notes and in the execution notes

Execution notes (mandatory):
- maintain `{task}.notes.md` throughout execution
- use this structure:

```markdown
---
taskId: AA11
createdAt: 2026-04-21T23:59:00+02:00
updatedAt: 2026-04-21T23:59:00+02:00
---

# Execution Notes — <Task title>
**Task**: ./AA11.task.md
**Plan**: ./AA11.plan.md

## Decisions

...

## Problems Encountered

...

## Deviations From Plan

...

## Additional Requests

...

## Known Limitations

...
```

Notes-update rules (mandatory):
- update the notes whenever there is anything worth annotating, including:
  - non-trivial implementation decisions
  - bugs, failures, or unexpected constraints
  - deviations from the plan
  - new operator requests that change or expand the scope
  - transition from planned execution into more open-ended vibe coding
- if execution is smooth, still document that no major problems occurred

BACKLOG link convention (mandatory):
- use only relative links from `docs/backlog/BACKLOG.md`
- wip entries use:
  - `./wip/AA11-task-slug/AA11.task.md`
  - `./wip/AA11-task-slug/AA11.plan.md`
  - `./wip/AA11-task-slug/AA11.notes.md`
- `docs/backlog/BACKLOG.md` must keep links to `./archived/ARCHIVED.md` and `./completed/COMPLETED.md`

Exit rule:
- leave the task in WIP when execution work for the session ends unless the operator explicitly decides the task is temporarily blocked
- if the operator explicitly decides the task is temporarily blocked, move the whole task folder into `docs/backlog/blocked/`, set the stored status to `blocked`, set or confirm `reviewAfter`, refresh `updatedAt`, and update `docs/backlog/BACKLOG.md` so the task appears only under `## Blocked`
- hand off final completion to `backlog-complete`
