---
name: aexecute
description: Executes an accepted plan for a task in .agents/backlog, keeps the plan updated as progress state, and maintains detailed execution notes.
---

# Execute Task

Use `aexecute` only after the plan was explicitly accepted by the human operator.

Storage model (mandatory):
- backlog root: `.agents/backlog`
- execution state lives in `.agents/backlog/`
- task file, plan file, and notes file must live together while the task is in progress

TaskID resolution (mandatory):
- accept a case-insensitive `AA11` TaskID
- also accept `aa1` and normalize it to `AA01`
- resolve the task from `.agents/backlog/`, `.agents/backlog/ready/`, or `.agents/backlog/drafts/`

Execution gate (mandatory):
- do not execute without an accepted plan
- if no plan file exists, stop and direct the workflow back to `aplan`
- if the plan exists but has not been explicitly accepted, stop and ask for acceptance first
- the only shortcut is when the current operator reply clearly means `accept + execute`

Lifecycle rules (mandatory):
- move the task file into `.agents/backlog/` before execution if it is currently in Drafts or Ready
- move the plan file alongside it
- create the notes file if it does not yet exist
- update `.agents/backlog/BACKLOG.md` so the task appears only under `## In Progress`
- never move the task to Completed or Archived in this skill
- never update the `## Completed` section in this skill
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
# Execution Notes — <Task title>

**TaskID**: AA11
**Task**: ./AA11.task-slug.md
**Plan**: ./AA11.task-slug.plan.md

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
- use only relative links from `.agents/backlog/BACKLOG.md`
- in-progress entries use:
  - `./AA11.task-slug.md`
  - `./AA11.task-slug.plan.md`
  - `./AA11.task-slug.notes.md`

Exit rule:
- leave the task in In Progress when execution work for the session ends
- hand off final completion to `acomplete`
