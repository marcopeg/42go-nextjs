---
name: vibe-doc
description: Maintains documentation for an open vibe coding session. Use during a session to append factual notes and to promote stable findings from the live session into the paired long-term memory document and other permanent docs. This skill is for documentation only and does not itself authorize product work.
---

# Vibe Doc

Use this skill repeatedly during a vibe session.

Its job is to keep the documentation honest:
- append concise factual working notes to `session.md`
- move durable conclusions into `memory.md`
- if the knowledge belongs in a broader repo document, write it under `docs/` and record that promotion in the session log

This skill documents work that is already happening.
It is not permission to start implementing the session goal.

## Session Access

Locate the latest active session with:

```text
python3 scripts/latest_session.py
```

Append a factual session note with:

```text
python3 scripts/annotate_session.py \
  --session <sessionDir-or-session.md> \
  --title "<short title>" \
  --body "<1-4 sentence factual note>"
```

After promoting durable information into `memory.md` or another permanent doc, record that promotion with:

```text
python3 scripts/promote_session.py \
  --session <sessionDir-or-session.md> \
  --title "<promotion title>" \
  --summary "<what durable context was promoted>" \
  --doc "<permanent doc path>"
```

If the session is wrapping up and needs a clean closure, use:

```text
python3 scripts/close_session.py \
  --session <sessionDir-or-session.md> \
  --summary "<short closing note>"
```

## Workflow

### 1. Resolve the active session

- Find the latest active session with `scripts/latest_session.py`
- Open both `session.md` and `memory.md`
- If there is no active session, stop and use `vibe-start`

### 2. Decide what belongs where

Write to `session.md` when the information is:
- temporary
- exploratory
- a chronological note about what happened
- useful for reconstructing the narrative of the work

Write to `memory.md` when the information is:
- stable across the rest of the session
- likely to matter after an interruption
- a real decision, constraint, or working agreement
- architecture or design context that should not be rediscovered

Write to another permanent doc under `docs/` when the information is:
- broader than this single session
- part of the repo’s maintained architecture or feature documentation
- something future sessions should treat as project knowledge, not session knowledge

### 3. Update the durable docs

When stable knowledge emerges:
- update `memory.md`
- if needed, create or update the broader permanent doc under `docs/`
- then run `scripts/promote_session.py` so the session log records that promotion and the memory doc gets a fresh `updatedAt`

### 4. Keep the session log factual

Use `scripts/annotate_session.py` after:
- a meaningful discovery
- a completed phase of work
- a course correction
- a design or implementation decision
- a documentation promotion

## Constraints

- Use this skill multiple times during a session; do not wait until the end
- Do not leave stable conclusions only in `session.md`
- Keep annotations factual and brief
- Use `memory.md` as the session’s durable memory, and `docs/` for repo-level durable knowledge
- Do not treat documentation updates as authorization to execute the underlying task
