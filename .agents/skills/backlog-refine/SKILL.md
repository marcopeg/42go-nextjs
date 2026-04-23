---
name: backlog-refine
description: Refines a task in docs/backlog by interviewing the human operator, reducing ambiguity, and maintaining the standard task template without creating a plan.
---

# Refine Task

Use `backlog-refine` to make a task explicit enough for planning.

This skill is for ambiguity reduction and context definition only.

Storage model (mandatory):
- backlog root: `docs/backlog`
- resolve task folders from `docs/backlog/drafts/`, `docs/backlog/ready/`, `docs/backlog/wip/`, or `docs/backlog/blocked/`
- never move tasks across lifecycle folders in this skill

Frontmatter rules (mandatory):
- task files use YAML frontmatter with:
  - required fields: `taskId`, `status`, `createdAt`, `updatedAt`
  - optional fields: `group`, `reviewedAt`, `plannedAt`, `startedAt`, `completedAt`, `reviewAfter`
- refinement must preserve `createdAt`
- refinement must refresh `updatedAt` whenever the task file is changed
- use the current wall-clock timestamp for `updatedAt` and any newly written `reviewedAt`
- when refinement materially reviews the task, set `reviewedAt` to the current timestamp
- if the operator provides or corrects `group`, write that value into task frontmatter
- if the task remains blocked, preserve `reviewAfter`
- if the operator provides a corrected `reviewAfter` for a blocked task, update it
- if the task leaves blocked state in a later workflow, that later workflow must remove `reviewAfter`

TaskID resolution (mandatory):
- accept a case-insensitive `AA11` TaskID
- also accept `aa1` and normalize it to `AA01`
- if the user provides only a task ID, use that task
- if the user provides a task ID plus extra text, use the task ID and treat the rest as refinement intent
- to resolve the task folder and sibling artifacts quickly, use:
  - `python3 scripts/resolve_task.py <taskid>`

Core behavior (mandatory):
- read the task file first
- read `docs/backlog/BACKLOG.md`
- treat `docs/backlog/BACKLOG.md` as the active-work index only; use `docs/backlog/archived/ARCHIVED.md` or `docs/backlog/completed/COMPLETED.md` only when historical context is concretely needed
- inspect concretely relevant earlier task files and `.notes.md` execution logs
- update the task file in place
- maintain task frontmatter according to the frontmatter rules
- do not create or edit `{task}.plan.md` in this skill
- do not create or edit execution notes in this skill
- do not move the task between Drafts, Ready, WIP, or Blocked
- never modify `CHANGELOG.md`

Template maintenance rules (mandatory):
- keep these sections present in the task file:
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
- if the operator supplies concrete information, replace `information is missing`
- if the operator makes it clear that a section does not apply, use `n/a`
- do not invent answers to fill blank sections
- do not treat unresolved placeholders as implicitly good enough for planning
- when uncertainty remains, capture it explicitly in `Open Questions` instead of silently assuming closure

Refinement interview rules (mandatory):
- ask concise clarifying questions that reduce ambiguity fastest
- do not force template order; ask in the order that best clarifies the task
- prefer 1 to 3 questions per round
- ask about anything that would make the task definition more explicit, testable, or plan-ready
- after each round, reassess which important gaps still block a concrete implementation plan
- keep asking follow-up rounds while critical sections are still vague, placeholder-filled, contradictory, or materially incomplete
- do not declare that refinement is complete merely because one round of answers was provided
- if an answer resolves one ambiguity but exposes another concrete unknown, continue the interview in a later round
- be especially picky about:
  - business value
  - current versus desired state
  - success definition
  - constraints and steering instructions
  - acceptance criteria
  - known unknowns

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
- when in doubt, continue refinement instead of declaring satisfaction
- the operator may choose to switch to planning early at any time; if they explicitly ask to plan or invoke planning directly, honor that choice and stop refining

Related-work lookup (mandatory):
- update `Related to` using prior tasks and execution notes only when the relevance is concrete
- prefer entries that constrain design, reveal prior tradeoffs, or expose reusable implementation details

Planning handoff rule (mandatory):
- after each refinement round, use the plan-readiness checklist before deciding whether to offer planning
- if the operator explicitly asks to switch to planning early, honor that choice immediately instead of asking again
- otherwise, ask the human operator whether they want to start planning immediately only when the task meets the checklist
- this prompt is part of the skill and should happen every time the task becomes plan-ready again, even after later refinement rounds

Stop conditions:
- stop when the operator does not want to continue refinement
- stop when the operator chooses to start planning or directly invokes planning
- otherwise continue refining until the task is clear and actionable
