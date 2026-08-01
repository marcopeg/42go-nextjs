---
name: quickshare
description: Create, edit, publish, unpublish, and delete QuickShare resources through the personal bearer-token API. Use when the user asks to manage a QuickShare draft or publication, inspect its available share types or templates, change a public identifier, or configure QuickShare automation credentials.
---

# QuickShare

Use the bundled client for every QuickShare action. It fetches the live discovery contract before each operation, keeps the bearer token out of prompts and logs, and emits sanitized JSON.

Resolve `<skill-dir>` to the directory containing this `SKILL.md`. Invoke `<skill-dir>/scripts/quickshare.py`; installed plugins run from cache directories, not necessarily this repository.

## First use

In a user-controlled terminal, run:

```bash
python3 <skill-dir>/scripts/quickshare.py configure
```

The command asks for the QuickShare API origin and personal token through hidden prompts, then stores them in an owner-readable credential file. Configure from the project installation to select that project automatically, or add `--scope _global` for a global credential.

Never ask the user to paste a token into chat or send one as a command argument, URL, environment variable, or file in the repository. If credentials are missing, give the user the command above and stop. A user who deliberately chooses the documented `configure --from-stdin` fallback must send a single JSON object only over stdin; warn that this is less safe in a chat-driven shell and recommend rotating the token afterward.

## Workflow

1. Start with `discover`. Treat its live resource types, templates, schemas, limits, operations, availability, deprecations, and confirmation effects as authoritative.
2. Use `list` and `read` before changing a resource when the target or current revision is unclear.
3. Build create/save/identifier/publish input as JSON from the discovery schemas. Pass it from a file or stdin—not a command argument. Resource type is always explicit.
4. Saving creates a draft only. Publishing is separate and may make a pending public-ID change live.
5. Before every operation discovery marks disruptive or destructive, explain its live effect and obtain explicit user consent. Run the client with `--yes` only after that consent. The client rejects an unconfirmed action too.
6. For an identifier change on a published resource, show both `publishedUrl` and `nextPublicUrl`; no redirect exists. For unpublish, explain that delivery disappears but the draft remains. For a published delete, use the stronger warning: public delivery and the database record are permanently removed.
7. Report sanitized results. On stale revisions or conflicts, read the resource again, reason over the fresh result, and submit a newly validated request. Do not blindly retry mutations.

## Commands

```bash
python3 <skill-dir>/scripts/quickshare.py discover
python3 <skill-dir>/scripts/quickshare.py list
python3 <skill-dir>/scripts/quickshare.py read RESOURCE_UUID
python3 <skill-dir>/scripts/quickshare.py create --input request.json
python3 <skill-dir>/scripts/quickshare.py save RESOURCE_UUID --input request.json
python3 <skill-dir>/scripts/quickshare.py identifier RESOURCE_UUID --input request.json --yes
python3 <skill-dir>/scripts/quickshare.py publish RESOURCE_UUID --input request.json --yes
python3 <skill-dir>/scripts/quickshare.py unpublish RESOURCE_UUID --input request.json --yes
python3 <skill-dir>/scripts/quickshare.py delete RESOURCE_UUID --input request.json --yes
```

Use `--input-stdin` when a JSON request must be supplied through standard input. Read [references/automation.md](references/automation.md) for the durable protocol and recovery rules. Do not use direct HTTP requests: discovery-driven validation and confirmation gates are part of the safety boundary.
