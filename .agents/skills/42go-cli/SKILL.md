---
name: 42go-cli
description: Use when operating the local `42go` CLI, running backups/restores, pulling event archives, building local query aggregations, checking command help, or explaining CLI capabilities.
---

# 42Go CLI

Use this skill for operator-facing `42go` CLI usage. It is the consolidated manual for capabilities that used to be split across backup, events export, and events logging skills.

## Rules

- Keep the console command `42go`.
- Use command help as the source of truth before running a command: `42go --help`, then subcommand `--help`.
- `42go events` is only for raw event archive extraction.
- `42go query` is for local analytics aggregations built from cached local data.
- Do not use `42go events query`; that alias was removed.
- Generated analytics cache files live under `.local/42go-stats/{app-id}/` and use `query_*.parquet` names.
- Do not commit `.local/42go-events`, `.local/42go-stats`, or `.local/42go-backups`.
- If changing CLI implementation, also use the `42go-cli-dev` skill.

## Capability Index

- Install and help:
  - `42go --help`
  - `42go --version`
  - `pipx install ./cli`
  - `pipx install --force --editable ./cli`
  - Load `references/install-help.md`.
- Backup and restore:
  - `42go backup --full`
  - `42go backup --light`
  - `42go restore --from <dump>`
  - Load `references/backup-restore.md`.
- Event archive extraction:
  - `42go events pull`
  - `42go events pull --dry-run`
  - Load `references/events-archive.md`.
- Local analytics queries:
  - `42go query stats`
  - `42go query session`
  - `42go query users growth`
  - `42go query books stats`
  - `42go query reads`
  - Load `references/query-analytics.md`.
- Event logging expectations:
  - New application events should flow through the shared core events system and be consumable by `42go events pull`.
  - Load `references/event-logging.md`.
- Full refresh shortcut:
  - `42go update`
  - `42go update --reset`
  - Load `references/query-analytics.md`.

## Common Workflows

Fresh local read-engagement analytics:

```bash
42go update
```

Refresh session and user-growth aggregates:

```bash
42go update --reset
```

Create and restore a light data backup:

```bash
42go backup --light
42go restore --from .local/42go-backups/<dump>.dump.light.sql
```

## Help Contract

Agents should navigate commands with:

```bash
42go --help
42go update --help
42go events --help
42go events pull --help
42go query --help
42go query stats --help
42go query session --help
42go query users growth --help
42go query books stats --help
42go query reads --help
42go backup --help
42go restore --help
```

If command help cannot explain purpose, options, defaults, and relevant environment variables, fix the CLI help and update this skill.
