---
name: 42go-cli
description: Use when operating the local `42go` CLI, running backups/restores, pulling event archives, building local query aggregations, checking command help, or explaining CLI capabilities.
---

# 42Go CLI

Use this skill for operator-facing `42go` CLI usage. It is the consolidated manual for capabilities that used to be split across backup, events export, and events logging skills.

## Rules

- Keep the console command `42go`.
- Use command help as the source of truth before running a command: `42go --help`, then subcommand `--help`.
- `42go pull` is for raw source data extraction.
- `42go query` is for local analytics aggregations built from cached local data.
- No-arg command groups such as `42go pull`, `42go query`, and `42go query users` open interactive menus.
- Do not use `42go events` or `42go users`; those roots were removed.
- Raw pulled data lives under `.local/42go-data/`.
- Raw pulled rows that mirror a source table use `.local/42go-data/{schema}/{table}.parquet`.
- Generated analytics cache files live under `.local/42go-stats/{app-id}/` and use filenames that mirror the `42go query ...` command chain.
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
  - `42go pull books`
  - `42go pull all`
  - `42go pull '*'` as the literal star alias for all data.
  - Load `references/events-archive.md`.
- Local analytics queries:
  - `42go query`
  - `42go query stats`
  - `42go query session`
  - `42go query users`
  - `42go query users growth`
  - `42go query lingocafe`
  - `42go query lingocafe books`
  - `42go query lingocafe reads`
  - Load `references/query-analytics.md`.
- Event logging expectations:
  - New application events should flow through the shared core events system and be consumable by `42go pull events`.
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

Navigate local analytics interactively:

```bash
42go query
42go query users
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
42go pull --help
42go pull auth --help
42go pull events --help
42go pull books --help
42go pull all --help
42go pull '*' --help
42go query --help
42go query stats --help
42go query session --help
42go query users growth --help
42go query lingocafe --help
42go query lingocafe books --help
42go query lingocafe reads --help
42go backup --help
42go restore --help
```

If command help cannot explain purpose, options, defaults, and relevant environment variables, fix the CLI help and update this skill.
