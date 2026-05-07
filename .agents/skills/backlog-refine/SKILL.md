---
name: backlog-refine
description: Refines a task in docs/backlog through markdown question rounds, reducing ambiguity while preserving the original draft.
---

# Refine Task

Use `backlog-refine` to make a task explicit enough for planning.

This skill is for ambiguity reduction and context definition only. It interviews through files, not chat.

Storage model (mandatory):

- backlog root: `docs/backlog`
- resolve task folders from `docs/backlog/drafts/`, `docs/backlog/ready/`, `docs/backlog/wip/`, or `docs/backlog/blocked/`
- never move tasks across lifecycle folders in this skill
- original draft file: `<taskid>.task.draft.md`
- refined task file: `<taskid>.task.refined.md`
- legacy task file fallback: `<taskid>.task.md`
- question round files: `<taskid>.question.v1.md`, `<taskid>.question.v2.md`, and so on
- all task, question, plan, notes, and other sidecar files live in the same task folder

Frontmatter rules (mandatory):

- draft and refined task files use YAML frontmatter with:
  - required fields: `taskId`, `status`, `createdAt`, `updatedAt`
  - optional fields: `group`, `reviewedAt`, `plannedAt`, `startedAt`, `completedAt`, `reviewAfter`
- question files use YAML frontmatter with:
  - required fields: `taskId`, `round`, `createdAt`, `updatedAt`
  - optional fields: `answeredAt`
- refinement must never change `<taskid>.task.draft.md`
- refinement must preserve the refined task `createdAt` when the refined file already exists
- when creating the refined task for the first time, use the draft `createdAt` when available
- refinement must refresh `updatedAt` whenever the refined task file or a question file is changed
- use the current wall-clock timestamp for `updatedAt`, new question `createdAt`, new refined task `createdAt`, and any newly written `reviewedAt` or `answeredAt`
- when a question round has been answered and folded into the refined task, set `answeredAt` on that question file if it is missing
- when refinement materially reviews the task, set `reviewedAt` on the refined task file
- if the operator provides or corrects `group`, write that value into the refined task frontmatter
- if the task remains blocked, preserve `reviewAfter`
- if the operator provides a corrected `reviewAfter` for a blocked task, update it on the refined task

TaskID resolution (mandatory):

- accept a case-insensitive `AA11` TaskID
- also accept `aa1` and normalize it to `AA01`
- if the user provides only a task ID, use that task
- if the user provides a task ID plus extra text, use the task ID and treat the rest as refinement intent
- to resolve the task folder and sibling artifacts quickly, use:
  - `python3 scripts/resolve_task.py <taskid>`

Core behavior (mandatory):

- read the task folder first, including draft task, refined task, question rounds, plan, notes, and relevant sidecars
- read `docs/backlog/BACKLOG.md`
- treat `docs/backlog/BACKLOG.md` as the active-work index only; use `docs/backlog/archived/ARCHIVED.md` or `docs/backlog/completed/COMPLETED.md` only when historical context is concretely needed
- inspect concretely relevant earlier task files and `.notes.md` execution logs
- do not ask clarifying questions directly in chat
- write clarifying questions into the next question round file
- write refined task content only to `<taskid>.task.refined.md`
- do not create or edit `<taskid>.plan.md` in this skill
- do not create or edit execution notes in this skill
- do not move the task between Drafts, Ready, WIP, or Blocked
- never modify `CHANGELOG.md`

Question round workflow (mandatory):

1. If no question files exist, generate `<taskid>.question.v1.md`.
2. If question files exist, read every round in numeric order.
3. Identify the latest question round.
4. If the latest round does not contain usable inline answers, do not create a new round. Tell the operator which file needs answers.
5. If the latest round contains usable answers, fold the answers into `<taskid>.task.refined.md`.
6. Reassess plan readiness from the refined task plus all answered rounds.
7. If important ambiguity remains, generate the next question round file using the next version number.
8. If the task is plan-ready, do not generate another question file. Propose planning.

Question file naming rules (mandatory):

- first round: `<taskid>.question.v1.md`
- second round: `<taskid>.question.v2.md`
- never overwrite an existing question round
- never skip a version number
- use the highest existing round number plus one for follow-up questions

Question file structure (mandatory):

```markdown
---
taskId: AA11
round: 1
createdAt: 2026-04-21T23:59:00+02:00
updatedAt: 2026-04-21T23:59:00+02:00
---

# Refinement Questions v1 — <Task title>

Answer inline under each question, then return to chat and say `next round`.

## Questions

### 1. <question>

Answer:

### 2. <question>

Answer:
```

Question writing rules (mandatory):

- ask concise clarifying questions that reduce ambiguity fastest
- prefer 1 to 5 questions per round
- do not force template order; ask in the order that best clarifies the task
- ask about anything that would make the task definition more explicit, testable, or plan-ready
- do not include questions that are already answered by the draft, refined task, or prior question rounds
- do not ask broad filler questions
- when asking a multiple-choice question would reduce ambiguity faster, include the choices in the question text and still leave an `Answer:` slot
- after creating a question round, stop and tell the operator to answer inline in that file and come back with `next round`

Continuation trigger rules (mandatory):

- treat `next round`, `continue refinement`, `answered`, `go on`, `refine again`, and equivalent replies as instructions to read the latest question file and continue the workflow
- if invoked from scratch in a new session and the task folder already has question rounds, resume from the latest round instead of starting over
- if the operator added answers to an older round after later rounds exist, read all rounds again and fold all usable answers into the refined task before deciding what comes next

Template maintenance rules (mandatory):

- keep these sections present in the refined task file:
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
- seed the refined task from the draft task when no refined task exists
- if the operator supplies concrete information, replace `information is missing`
- if the operator makes it clear that a section does not apply, use `n/a`
- do not invent answers to fill blank sections
- do not treat unresolved placeholders as implicitly good enough for planning
- when uncertainty remains, capture it explicitly in `Open Questions` instead of silently assuming closure

Plan-readiness checklist (mandatory):

- treat the task as plan-ready only when the following sections are concrete enough to support implementation sequencing, or are explicitly `n/a`:
  - `Business Gain`
  - `Current State`
  - `Desired State`
  - `Definition of Success`
  - `Constraints`
  - `Acceptance Criteria`
- do not treat a task as plan-ready while any of those sections still effectively say `information is missing`, stay purely generic, or leave obvious execution-shaping ambiguity unresolved
- remaining uncertainty is acceptable only when it is explicitly captured under `Open Questions` and does not block decomposition into actionable planning steps
- when in doubt, generate another question round instead of declaring satisfaction
- the operator may choose to switch to planning early at any time; if they explicitly ask to plan or invoke planning directly, honor that choice and stop refining

Related-work lookup (mandatory):

- update `Related to` using prior tasks and execution notes only when the relevance is concrete
- prefer entries that constrain design, reveal prior tradeoffs, or expose reusable implementation details

BACKLOG link rules (mandatory):

- when `<taskid>.task.refined.md` exists, update `docs/backlog/BACKLOG.md` so the active entry links to the refined task file
- when only `<taskid>.task.draft.md` exists, the active entry may link to the draft task file
- use the shared index helper from the repository root when possible:
  - `python3 .agents/skills/backlog-core/scripts/backlog_tool.py sync-indexes --quiet`
- ensure the task appears in exactly one active backlog section

Planning handoff rule (mandatory):

- after each answered refinement round, use the plan-readiness checklist before deciding whether to offer planning
- if the operator explicitly asks to switch to planning early, honor that choice immediately instead of asking again
- otherwise, propose planning only when the task meets the checklist
- use exactly this prompt when refinement becomes plan-ready: `Refinement is enough. Do you want to plan this task now?`

Stop conditions:

- stop after writing a question round file
- stop when the latest question round still needs inline answers
- stop when the operator chooses to start planning or directly invokes planning
- stop after proposing planning for a plan-ready task
