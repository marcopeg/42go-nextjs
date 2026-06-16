---
name: 42go-cli
description: Use when operating the local `42go` CLI, running backups/restores, pulling event archives, inspecting local Parquet data, checking command help, or explaining CLI capabilities.
---

# 42Go CLI

Use this skill for operator-facing `42go` CLI usage. It is the consolidated manual for capabilities that used to be split across backup, events export, and events logging skills.

## Rules

- Keep the console command `42go`.
- Use command help as the source of truth before running a command: `42go --help`, then subcommand `--help`.
- `42go pull` is for raw source data extraction.
- `42go query` is intentionally not available. Historical aggregation notes are retained in `references/query-analytics.md` for a future rebuild.
- No-arg command groups such as `42go pull` open interactive menus.
- Do not use `42go events` or `42go users`; those roots were removed.
- Raw pulled data lives under `.local/42go-data/`.
- Raw pulled rows that mirror a source table use `.local/42go-data/{schema}/{table}.parquet`.
- Do not commit `.local/42go-data`, `.local/42go-stats`, or `.local/42go-backups`.
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
- Raw data extraction:
  - `42go pull`
  - `42go pull auth`
  - `42go pull events`
  - `42go pull lingocafe`
  - `42go pull all`
  - `42go pull '*'` as the literal star alias for all data.
  - Load `references/events-archive.md`.
- Parquet data contract:
  - `42go peek`
  - `42go peek auth`
  - `42go peek auth users`
  - `42go peek .local/42go-data/auth/users.parquet`
  - Raw pull files under `.local/42go-data`.
  - Load `references/parquet-files.md`.
- Historical local analytics design:
  - `42go query` is not currently supported.
  - Load `references/query-analytics.md`.
- Event logging expectations:
  - New application events should flow through the shared core events system and be consumable by `42go pull events`.
  - Load `references/event-logging.md`.
- Full refresh shortcut:
  - `42go update`
  - `42go update --reset`
  - Load `references/events-archive.md`.

## Common Workflows

Refresh all local raw data:

```bash
42go update
```

Refresh all local raw data from scratch:

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
42go peek --help
42go update --help
42go pull --help
42go pull auth --help
42go pull events --help
42go pull lingocafe --help
42go pull all --help
42go pull '*' --help
42go backup --help
42go restore --help
```

If command help cannot explain purpose, options, defaults, and relevant environment variables, fix the CLI help and update this skill.
