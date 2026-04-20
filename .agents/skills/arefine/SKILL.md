---
name: arefine
description: Refines a task in .agents/backlog by interviewing the human operator, reducing ambiguity, and maintaining the standard task template without creating a plan.
---

# Refine Task

Use `arefine` to make a task explicit enough for planning.

This skill is for ambiguity reduction and context definition only.

Storage model (mandatory):
- backlog root: `.agents/backlog`
- resolve tasks from `.agents/backlog/`, `.agents/backlog/drafts/`, or `.agents/backlog/ready/`
- never move tasks across lifecycle folders in this skill

TaskID resolution (mandatory):
- accept a case-insensitive `AA11` TaskID
- also accept `aa1` and normalize it to `AA01`
- if the user provides only a task ID, use that task
- if the user provides a task ID plus extra text, use the task ID and treat the rest as refinement intent

Core behavior (mandatory):
- read the task file first
- read `.agents/backlog/BACKLOG.md`
- inspect concretely relevant earlier task files and `.notes.md` execution logs
- update the task file in place
- do not create or edit `{task}.plan.md` in this skill
- do not create or edit execution notes in this skill
- do not move the task between Drafts, Ready, or In Progress
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

Refinement interview rules (mandatory):
- ask concise clarifying questions that reduce ambiguity fastest
- do not force template order; ask in the order that best clarifies the task
- prefer 1 to 3 questions per round
- ask about anything that would make the task definition more explicit, testable, or plan-ready
- be especially picky about:
  - business value
  - current versus desired state
  - success definition
  - constraints and steering instructions
  - acceptance criteria
  - known unknowns

Related-work lookup (mandatory):
- update `Related to` using prior tasks and execution notes only when the relevance is concrete
- prefer entries that constrain design, reveal prior tradeoffs, or expose reusable implementation details

Planning handoff rule (mandatory):
- after each refinement round, if the task is now explicit enough to plan, ask the human operator whether they want to start planning immediately
- this prompt is part of the skill and should happen every time the task becomes plan-ready again, even after later refinement rounds

Stop conditions:
- stop when the operator does not want to continue refinement
- stop when the operator chooses to start planning
- otherwise continue refining until the task is clear and actionable
