---
name: aplan
description: Builds or revises a milestone-based implementation plan for a task in .agents/backlog, asks for explicit acceptance, and can hand off directly into execution.
---

# Plan Task

Use `aplan` to produce a detailed implementation plan that also acts as execution progress state.

Storage model (mandatory):
- backlog root: `.agents/backlog`
- resolve tasks from `.agents/backlog/drafts/`, `.agents/backlog/ready/`, or `.agents/backlog/`
- plan file lives alongside the task file

TaskID resolution (mandatory):
- accept a case-insensitive `AA11` TaskID
- also accept `aa1` and normalize it to `AA01`
- if the user provides a task ID plus extra text, use the task ID and treat the rest as planning guidance

Planning workflow (mandatory):
- read the task file
- read `.agents/backlog/BACKLOG.md`
- inspect relevant code, config, prompts, prior tasks, and `.notes.md` execution logs
- create or update `{task}.plan.md`
- immediately update `.agents/backlog/BACKLOG.md` so the task entry links to the plan file in its current lifecycle section
- never modify `CHANGELOG.md`

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
# Plan — <Task title>

**TaskID**: AA11
**Status**: draft|ready|in-progress

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
  - if the task is already In Progress, keep it there
- `accept + execute`:
  - treat the plan as accepted
  - move the task into In Progress immediately
  - continue into the execution workflow in the same turn when feasible

BACKLOG rules (mandatory):
- use only relative links from `.agents/backlog/BACKLOG.md`
- drafts use `./drafts/...`
- ready tasks use `./ready/...`
- in-progress root tasks use `./...`
- the task must appear in exactly one section at a time
