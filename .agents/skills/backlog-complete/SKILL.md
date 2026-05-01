---
name: backlog-complete
description: Marks one or more wip tasks in docs/backlog as completed, moves their files to completed storage, and appends them to the dedicated completed history log so execution history can be read backward.
---

# Complete Task

Use `backlog-complete` only for tasks that are already in wip and are now finished.

Storage model (mandatory):
- backlog root: `docs/backlog`
- active backlog index: `docs/backlog/BACKLOG.md`
- valid completion targets live as task folders in `docs/backlog/wip/`
- completed tasks live as task folders in `docs/backlog/completed/`
- completed history log: `docs/backlog/completed/COMPLETED.md`

Frontmatter rules (mandatory):
- task files use YAML frontmatter with:
  - required fields: `taskId`, `status`, `createdAt`, `updatedAt`
  - optional fields: `group`, `reviewedAt`, `plannedAt`, `startedAt`, `completedAt`, `reviewAfter`
- plan and notes files use YAML frontmatter with:
  - required fields: `taskId`, `createdAt`, `updatedAt`
- completion must preserve `createdAt`
- completion must preserve `group`, `reviewedAt`, `plannedAt`, and `startedAt` when present
- completion must set `status: completed`
- use the current wall-clock timestamp for `completedAt` and any `updatedAt` values written during completion
- completion must set `completedAt` on the task file
- completion must refresh `updatedAt` on the task file and on any plan or notes file that is modified during completion
- if the task still carries `reviewAfter`, remove it during completion

TaskID resolution (mandatory):
- accept one or more case-insensitive `AA11` TaskIDs
- also accept one-digit numeric suffixes such as `aa1` and normalize them to `AA01`
- if no task ID is provided, read `docs/backlog/BACKLOG.md` and complete the task or tasks currently listed under `## WIP`
- use the completion helper for the mechanical transition:
  - `python3 scripts/complete_task.py <taskid>`

Approval model (mandatory):
- treat an explicit request to complete a task as sufficient approval to move it into completed state
- do not ask for confirmation before completing the task when the operator intent and target task are clear
- only stop to ask a follow-up question when the completion target is ambiguous, such as multiple plausible wip tasks and no clear selection
- if no task ID is provided and exactly one task is listed under `## WIP`, complete it directly
- if no task ID is provided and multiple tasks are listed under `## WIP`, ask which one to complete instead of guessing

Completion review (mandatory):
- before moving a task to completed, review the current chat session plus the task file, plan file, and existing notes file when present
- identify any durable information from the session that is not yet captured in `{task}.notes.md`
- durable information includes:
  - implementation or product decisions
  - validation results and notable verification gaps
  - deviations from plan
  - important bugs, failures, or workarounds
  - scope clarifications or additional operator requests that materially changed the work
  - known limitations or follow-up-worthy caveats that should survive the chat session
- do not copy transient chatter, redundant status updates, or information already preserved elsewhere
- if relevant durable information is missing from the notes, update `{task}.notes.md` before completing the task
- if no notes file exists yet and there is durable information worth preserving, create `{task}.notes.md` before completing the task
- when creating a notes file during completion, use the same section structure as `backlog-execute` where applicable:
  - `## Decisions`
  - `## Problems Encountered`
  - `## Deviations From Plan`
  - `## Additional Requests`
  - `## Known Limitations`

For each task to complete:
1. resolve the task folder in `docs/backlog/wip/`
2. review the current chat session, task file, plan file, and notes file as required by the completion review rules
3. update or create the sibling `.notes.md` file when durable information needs to be preserved
4. use `python3 scripts/complete_task.py <taskid>` for the folder move, status update, timestamp update, and index/log updates
5. verify that the task file, `.plan.md`, and `.notes.md` files stayed together inside `docs/backlog/completed/`

Completed log convention (mandatory):
- use only relative links from `docs/backlog/completed/COMPLETED.md`
- completed entries must link as `./<taskid>-<task-slug>/<taskid>.task.md`
- include `| [plan](...)` when a plan file exists
- include `| [notes](...)` when a notes file exists
- `docs/backlog/completed/COMPLETED.md` is an append-only execution history index, not a sorted catalog
- each completion must add exactly one new list entry per completed task at the bottom of `COMPLETED.md`
- keep the newest completed task as the final list item so reading the file from bottom to top reconstructs execution history

State consistency rules:
- remove the task entry from `## WIP` in `docs/backlog/BACKLOG.md` before adding it to `docs/backlog/completed/COMPLETED.md`
- keep `docs/backlog/BACKLOG.md` focused on active work and its links to the historical logs
- keep unrelated tasks unchanged
- never modify `CHANGELOG.md`

Completed ordering rule (mandatory):
- treat `docs/backlog/completed/COMPLETED.md` as a historical log ordered by completion time
- append newly completed tasks to the end of that file
- preserve the existing order of all prior completed entries exactly as found before completion
- never sort completed entries by TaskID, title, folder name, or any other derived value
- after running `python3 scripts/complete_task.py <taskid>`, verify the new task entry is at the end of `COMPLETED.md`
- if an index rebuild or helper output places the new completed entry anywhere else, immediately repair `COMPLETED.md` by moving only the newly completed entry or entries to the bottom while preserving every other existing completed entry in its prior order
- when completing multiple tasks in one request, append them in the same order requested by the operator; if the operator did not provide an explicit order, append them in the order they appeared under `## WIP`

After completing the task:
1. report which TaskID values were completed
2. mention any created, updated, or moved plan or notes files when present
3. do not ask for extra confirmation after the completion was already requested
