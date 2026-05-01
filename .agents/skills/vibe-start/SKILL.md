---
name: vibe-start
description: Starts or resumes a documented vibe coding session. Use when a new vibe session is requested or when the user wants to prepare session tracking before later work. This skill only sets up the session workspace and kickoff context; it does not authorize implementation.
---

# Vibe Start

Use this skill to bootstrap or resume a vibe coding session with durable documentation from the start.

This skill is for session preparation only.
It does not authorize product work, implementation, fixes, refactors, or validation outside the session workspace.
Treat the user input as the session topic/context, not as permission to start doing the underlying task.

This skill prepares a session workspace under `docs/vibe-sessions/` with:
- `session.md` for the working narrative
- `memory.md` for durable session knowledge that should survive beyond temporary exploration

## Session Workspace

Create a new session workspace with:

```text
python3 scripts/start_session.py "<goal>"
```

If the user is clearly continuing the latest active session, inspect it first:

```text
python3 scripts/latest_session.py
```

The returned JSON includes:
- `sessionDir`
- `sessionFile`
- `memoryFile`

All paths are project-relative or absolute and work whether the skill is installed in the project or in `~/.agents/skills`, because the scripts operate against the current project working directory.

## Workflow

### 1. Create or resume the session

Do this before deeper repo exploration or any product work.

- For a new session, create the workspace with `scripts/start_session.py`
- For a continuation, locate the latest active session with `scripts/latest_session.py`
- Keep both `session.md` and `memory.md` in view during the session

### 2. Load current project context

Only gather enough context to prepare the session kickoff.
Do not turn this into execution planning or implementation.

Read in parallel when present:
- `docs/backlog/BACKLOG.md`
- `docs/backlog/completed/COMPLETED.md`
- `docs/backlog/archived/ARCHIVED.md`
- `README.md`
- `AGENTS.md`
- relevant permanent docs under `docs/`, excluding the active session workspace unless resuming

Capture:
- active and blocked backlog work related to the goal
- recent completed work related to the goal
- existing architecture or feature docs
- constraints, terminology, and prior decisions

### 3. Scan the codebase

Build only a focused structural overview for orientation:
- top-level folders and key config files
- actual runtime entrypoints
- modules most likely to be affected by the goal

Stop at orientation.
Do not edit product files, implement changes, run verification, or start solving the task itself as part of `vibe-start`.

### 4. Populate the session log

Write a concise context digest into `session.md`:
- project summary
- tech stack
- relevant backlog items
- relevant permanent docs and prior decisions
- code areas of interest
- constraints or open questions

### 5. Seed the long-term memory target

Inspect `memory.md` and decide which sections are likely to matter during the session:
- stable context
- decisions
- architecture notes
- working agreements
- open questions

Tell the user explicitly that stable conclusions will be promoted into `memory.md` throughout the session, not only at the end. When meaningful durable knowledge appears, switch to `vibe-doc` and update the memory doc immediately.

### 6. Present the kickoff digest

Reply with:
- the session workspace path
- a short context summary
- the first concrete question, risk, or suggested next action for the session

After this kickoff reply, stop.
Do not continue into implementation unless the user separately asks to start the actual work.

## Constraints

- Always create or resume the session workspace before deeper work
- Use `docs/backlog`, not `.agents/backlog`
- Treat `session.md` as the working log and `memory.md` as the durable session memory
- Keep the user aware that stable context should be promoted during the session, not deferred
- Limit edits during `vibe-start` to the session workspace and related session-tracking docs only
- Do not treat the goal text as approval to modify product code or run task execution
- Do not implement, refactor, fix, verify, or otherwise perform the underlying user task as part of `vibe-start`
