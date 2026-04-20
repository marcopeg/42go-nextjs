---
name: acomplete
description: Marks one or more in-progress tasks in .agents/backlog as completed, moves their files to completed storage, and appends them to the Completed backlog log.
---

# Complete Task

Use `acomplete` only for tasks that are already in progress and are now finished.

Storage model (mandatory):
- backlog root: `.agents/backlog`
- valid completion targets live in `.agents/backlog/`
- completed tasks live in `.agents/backlog/completed/`

TaskID resolution (mandatory):
- accept one or more case-insensitive `AA11` TaskIDs
- also accept one-digit numeric suffixes such as `aa1` and normalize them to `AA01`
- if no task ID is provided, read `.agents/backlog/BACKLOG.md` and complete the task or tasks currently listed under `## In Progress`

Approval model (mandatory):
- treat an explicit request to complete a task as sufficient approval to move it into completed state
- do not ask for confirmation before completing the task when the operator intent and target task are clear
- only stop to ask a follow-up question when the completion target is ambiguous, such as multiple plausible in-progress tasks and no clear selection
- if no task ID is provided and exactly one task is listed under `## In Progress`, complete it directly
- if no task ID is provided and multiple tasks are listed under `## In Progress`, ask which one to complete instead of guessing

For each task to complete:
1. resolve the main task file in `.agents/backlog/`
2. move the task file to `.agents/backlog/completed/`
3. move the sibling `.plan.md` and `.notes.md` files when present
4. update the task status to `completed` when a status line or status field exists
5. update `.agents/backlog/BACKLOG.md` so the task appears exactly once, under `## Completed`

BACKLOG link convention (mandatory):
- use only relative links from `.agents/backlog/BACKLOG.md`
- completed entries must link as `./completed/...`
- include `| [plan](...)` when a plan file exists
- include `| [notes](...)` when a notes file exists

State consistency rules:
- remove the task entry from `## In Progress` before adding it to `## Completed`
- keep unrelated tasks unchanged
- never modify `CHANGELOG.md`

Completed ordering rule (mandatory):
- treat `## Completed` as a historical log ordered by completion time
- append newly completed tasks to the end of the section
- never sort completed entries by TaskID

After completing the task:
1. report which TaskID values were completed
2. mention any moved plan or notes files when present
3. do not ask for extra confirmation after the completion was already requested
