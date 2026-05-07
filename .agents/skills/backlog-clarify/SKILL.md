---
name: backlog-clarify
description: Chat-based clarification for docs/backlog tasks. Use when the operator wants refine from mobile, light refine, dynamic refine, inline refine, refine in chat, or backlog clarify. The skill analyzes the task folder and relevant code/tasks like backlog-refine, but asks 1 to 3 questions per round directly in chat and records each round to clarify history files before updating the refined task.
---

# Clarify Task

Use `backlog-clarify` to reduce ambiguity through chat, not through file-edited question rounds.

This skill should behave like `backlog-refine` in analysis depth, review standards, refined-task output, and planning readiness.

The only workflow difference is how questions are managed:

- `backlog-refine` asks through files and expects inline file answers
- `backlog-clarify` asks through chat and logs the rounds to files for history

Storage model (mandatory):

- backlog root: `docs/backlog`
- resolve task folders from `docs/backlog/drafts/`, `docs/backlog/ready/`, `docs/backlog/wip/`, or `docs/backlog/blocked/`
- never move tasks across lifecycle folders in this skill
- original draft file: `<taskid>.task.draft.md`
- refined task file: `<taskid>.task.refined.md`
- legacy task file fallback: `<taskid>.task.md`
- clarify round files: `<taskid>.clarify.v1.md`, `<taskid>.clarify.v2.md`, and so on
- all task, clarify, plan, notes, and other sidecar files live in the same task folder

Frontmatter rules (mandatory):

- draft and refined task files use YAML frontmatter with:
  - required fields: `taskId`, `status`, `createdAt`, `updatedAt`
  - optional fields: `group`, `reviewedAt`, `plannedAt`, `startedAt`, `completedAt`, `reviewAfter`
- clarify files use YAML frontmatter with:
  - required fields: `taskId`, `round`, `createdAt`, `updatedAt`
  - optional fields: `answeredAt`
- clarification must never change `<taskid>.task.draft.md`
- clarification must preserve the refined task `createdAt` when the refined file already exists
- when creating the refined task for the first time, use the draft `createdAt` when available
- clarification must refresh `updatedAt` whenever the refined task file or a clarify file is changed
- use the current wall-clock timestamp for `updatedAt`, new clarify `createdAt`, new refined task `createdAt`, and any newly written `reviewedAt` or `answeredAt`
- when a clarify round has been answered and folded into the refined task, set `answeredAt` on that clarify file if it is missing
- when clarification materially reviews the task, set `reviewedAt` on the refined task file
- if the operator provides or corrects `group`, write that value into the refined task frontmatter
- if the task remains blocked, preserve `reviewAfter`
- if the operator provides a corrected `reviewAfter` for a blocked task, update it on the refined task

TaskID resolution (mandatory):

- accept a case-insensitive `AA11` TaskID
- also accept `aa1` and normalize it to `AA01`
- if the user provides only a task ID, use that task
- if the user provides a task ID plus extra text, use the task ID and treat the rest as clarification intent
- to resolve the task folder and sibling artifacts quickly, use:
  - `python3 scripts/resolve_task.py <taskid>`

Core behavior (mandatory):

- read the task folder first, including draft task, refined task, prior clarify rounds, refine question rounds, plan, notes, and relevant sidecars
- read `docs/backlog/BACKLOG.md`
- treat `docs/backlog/BACKLOG.md` as the active-work index only; use `docs/backlog/archived/ARCHIVED.md` or `docs/backlog/completed/COMPLETED.md` only when historical context is concretely needed
- inspect concretely relevant earlier task files and `.notes.md` execution logs
- inspect concretely relevant code, config, prompts, and documentation when they materially reduce ambiguity
- ask clarifying questions directly in chat
- write refined task content only to `<taskid>.task.refined.md`
- do not create or edit `<taskid>.plan.md` in this skill
- do not create or edit execution notes in this skill
- do not create or edit `<taskid>.question.v*.md` files in this skill
- do not move the task between Drafts, Ready, WIP, or Blocked
- never modify `CHANGELOG.md`

Clarify round workflow (mandatory):

1. If no clarify files exist, prepare round 1 and ask the questions directly in chat.
2. If clarify files exist, read every round in numeric order.
3. Identify the latest clarify round.
4. If the latest round exists but does not contain usable answers yet, restate those pending questions in chat instead of creating a new round.
5. When the operator answers in chat, update the latest clarify round file with those answers.
6. Fold the answered round into `<taskid>.task.refined.md`.
7. Reassess plan readiness from the refined task plus all answered rounds.
8. If important ambiguity remains, create the next clarify round file using the next version number and ask the next round directly in chat.
9. If the task is plan-ready, do not generate another clarify round. Propose planning.

Clarify file naming rules (mandatory):

- first round: `<taskid>.clarify.v1.md`
- second round: `<taskid>.clarify.v2.md`
- never overwrite an existing clarify round
- never skip a version number
- use the highest existing round number plus one for follow-up rounds

Clarify file structure (mandatory):

```markdown
---
taskId: AA11
round: 1
createdAt: 2026-04-21T23:59:00+02:00
updatedAt: 2026-04-21T23:59:00+02:00
answeredAt: 2026-04-21T23:59:30+02:00
---

# Clarify Round v1 — <Task title>

## Questions

### 1. <question>

### 2. <question>

## Answers

### 1.

<answer or `pending`>

### 2.

<answer or `pending`>

## Resolution Summary

- <resolved ambiguity or `pending`>
```

Clarify writing rules (mandatory):

- ask concise clarifying questions that reduce ambiguity fastest
- ask 1 to 3 questions per round, never more than 3
- do not force template order; ask in the order that best clarifies the task
- ask about anything that would make the task definition more explicit, testable, or plan-ready
- do not include questions that are already answered by the draft, refined task, prior clarify rounds, prior refine question rounds, or code/task lookup
- do not ask broad filler questions
- when a multiple-choice question reduces ambiguity faster, include the choices in the question text
- after preparing a new round file, ask those questions directly in chat and stop for the operator's answer
- the operator must never be instructed to edit clarify files manually

Chat answer handling rules (mandatory):

- after the operator answers in chat, record the answers in the latest clarify file
- keep the recorded answers concise but faithful to what the operator said
- add a short `Resolution Summary` that captures what became clear in that round
- if an answer is partial, record the usable part and leave the remaining uncertainty explicit
- if the operator answers out of order, still map each answer to the right question as clearly as possible

Continuation trigger rules (mandatory):

- treat `next round`, `continue clarify`, `answered`, `go on`, `clarify again`, `light refine`, `inline refine`, `dynamic refine`, `refine from mobile`, and equivalent replies as instructions to continue the chat-based clarify workflow
- if invoked from scratch in a new session and the task folder already has clarify rounds, resume from the latest round instead of starting over
- if the latest clarify round is still pending, restate those questions in chat before asking anything new

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
- when in doubt, ask another chat round instead of declaring satisfaction
- the operator may choose to switch to planning early at any time; if they explicitly ask to plan or invoke planning directly, honor that choice and stop clarifying

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

- after each answered clarify round, use the plan-readiness checklist before deciding whether to offer planning
- if the operator explicitly asks to switch to planning early, honor that choice immediately instead of asking again
- otherwise, propose planning only when the task meets the checklist
- use exactly this prompt when clarification becomes plan-ready: `Clarification is enough. Do you want to plan this task now?`

Stop conditions:

- stop after asking a round of questions in chat
- stop when the latest clarify round still needs chat answers
- stop when the operator chooses to start planning or directly invokes planning
- stop after proposing planning for a plan-ready task
