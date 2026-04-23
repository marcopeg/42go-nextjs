---
name: backlog-plan
description: Builds or revises a milestone-based implementation plan for a task in docs/backlog, asks for explicit acceptance, and can hand off directly into execution.
---

# Plan Task

Use `backlog-plan` to produce a detailed implementation plan that also acts as execution progress state.

Storage model (mandatory):
- backlog root: `docs/backlog`
- resolve task folders from `docs/backlog/drafts/`, `docs/backlog/ready/`, `docs/backlog/wip/`, or `docs/backlog/blocked/`
- plan file lives inside the task folder alongside the task file

Frontmatter rules (mandatory):
- task files use YAML frontmatter with:
  - required fields: `taskId`, `status`, `createdAt`, `updatedAt`
  - optional fields: `group`, `reviewedAt`, `plannedAt`, `startedAt`, `completedAt`, `reviewAfter`
- plan files use YAML frontmatter with:
  - required fields: `taskId`, `createdAt`, `updatedAt`
- planning must preserve `createdAt`
- planning must refresh `updatedAt` on the task file and on the plan file whenever either file is changed
- use the current wall-clock timestamp for any `updatedAt`, newly created plan `createdAt`, and any newly written `plannedAt` or `reviewedAt`
- when a plan is created for the first time, set `plannedAt` on the task if it is not already set
- when planning happens after review/refinement, set `reviewedAt` on the task if it is not already set
- planning must preserve `group` when present and must not invent a group unless the operator explicitly adds one
- planning must not set `startedAt` or `completedAt`
- if the task remains blocked during planning, preserve `reviewAfter`
- if the task is blocked and later leaves blocked state, remove `reviewAfter`

TaskID resolution (mandatory):
- accept a case-insensitive `AA11` TaskID
- also accept `aa1` and normalize it to `AA01`
- if the user provides a task ID plus extra text, use the task ID and treat the rest as planning guidance
- to resolve the task folder and sibling artifacts quickly, use:
  - `python3 scripts/resolve_task.py <taskid>`

Planning workflow (mandatory):
- read the task file
- read `docs/backlog/BACKLOG.md`
- treat `docs/backlog/BACKLOG.md` as the active-work index only; use `docs/backlog/archived/ARCHIVED.md` or `docs/backlog/completed/COMPLETED.md` only when historical context is concretely needed
- inspect relevant code, config, prompts, prior tasks, and `.notes.md` execution logs
- after passing the review gate, create or update `{task}.plan.md`
- immediately update `docs/backlog/BACKLOG.md` so the task entry links to the plan file in its current lifecycle section
- maintain task and plan frontmatter according to the frontmatter rules
- never modify `CHANGELOG.md`

Review gate (mandatory):
- before creating or revising a plan, check whether the task has already been reviewed/refined enough for planning
- treat the task as reviewed when either:
  - it follows the current refinement template and the critical planning sections are concrete enough for implementation sequencing:
    - `Business Gain`
    - `Current State`
    - `Desired State`
    - `Definition of Success`
    - `Constraints`
    - `Acceptance Criteria`
  - or it uses an older/alternate format but still provides equivalent clarity about the problem, target outcome, success criteria, constraints, and acceptance conditions
- do not treat a task as reviewed when those areas are still placeholder-filled, materially vague, contradictory, or obviously missing
- if the task does not appear reviewed yet, ask exactly: `This task does not appear to have been reviewed yet. Do you want to review it first, or should I proceed with the planning anyway?`
- do not create or update the plan until the operator chooses one of those paths
- if the operator chooses review first, stop and direct the workflow to `backlog-refine`
- if the operator chooses to proceed with planning anyway, continue planning in the same turn

Plan content rules (mandatory):
- the plan must be milestone-based
- each milestone must contain trackable steps
- each step must be specific enough to drive implementation and later act as execution progress
- each step must explain:
  - what needs to be achieved
  - what files are likely to be created, modified, or deleted
  - which types, classes, functions, components, services, abstractions, schemas, or tests are likely involved
  - how the step will be validated
- avoid vague steps such as `implement feature` or `wire everything up`

Plan structure (mandatory):

```markdown
---
taskId: AA11
createdAt: 2026-04-21T23:59:00+02:00
updatedAt: 2026-04-21T23:59:00+02:00
---

# Plan — <Task title>

## Goal

<short summary of the implementation outcome>

## Milestones

### Milestone 1 — <name>

- [ ] Step 1 — <short label>
  - Achieve:
  - Create:
  - Modify:
  - Delete:
  - Touch points:
  - Validation:
  - Notes:

### Milestone 2 — <name>

...
```

Progress-state rules (mandatory):
- use checkbox state so execution can mark completed work directly in the plan
- keep milestones and steps ordered
- do not mark work complete during planning unless the task is already partially implemented and the completed state is evidenced in the codebase

Acceptance loop (mandatory):
- after every plan creation or revision, ask exactly: `Do you accept the plan?`
- if the operator gives refinement feedback instead of acceptance, revise the plan and ask again
- repeat until the operator explicitly accepts

Acceptance semantics (mandatory):
- treat `yes`, `accept`, and equivalent positive replies as plan acceptance
- treat `yes and execute`, `accept and execute`, `execute`, and equivalent replies as `accept + execute`
- `accept` only:
  - if the task is in Drafts, move it to Ready
  - if the task is already in Ready, keep it in Ready
  - if the task is already in WIP, keep it in WIP
  - if the task is already in Blocked, keep it in Blocked
- `accept + execute`:
  - treat the plan as accepted
  - move the task into WIP immediately
  - continue into the execution workflow in the same turn when feasible

BACKLOG rules (mandatory):
- use only relative links from `docs/backlog/BACKLOG.md`
- drafts use `./drafts/<taskid>-<task-slug>/<taskid>.task.md`
- ready tasks use `./ready/<taskid>-<task-slug>/<taskid>.task.md`
- wip tasks use `./wip/<taskid>-<task-slug>/<taskid>.task.md`
- blocked tasks use `./blocked/<taskid>-<task-slug>/<taskid>.task.md`
- `docs/backlog/BACKLOG.md` must keep links to `./archived/ARCHIVED.md` and `./completed/COMPLETED.md`
- the task must appear in exactly one section at a time
