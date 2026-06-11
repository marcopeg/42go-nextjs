---
name: 42go-cli-dev
description: Use when changing, extending, refactoring, or reviewing the Python `42go` CLI implementation, including command structure, Typer wiring, Parquet aggregation caches, event archive internals, backup/restore behavior, and tests.
---

# 42Go CLI Dev

Use this skill for implementation work on the local Python CLI under `cli/`. For operator usage, use `42go-cli` first.

## Rules

- CLI source lives under `cli/src/fortytwogo_cli/`.
- Python distribution name stays `42go-cli`.
- Console command stays `42go`.
- Use Typer for command wiring.
- Root command families:
  - `42go pull` for raw data extraction.
  - `42go query` for local analytics aggregations.
  - `42go backup` and `42go restore` for data-only SQL dump workflows.
- Do not reintroduce `42go events` or `42go users`.
- Store raw pulled data as Parquet under `.local/42go-data/`.
- Raw pulled rows that mirror a source table must use `.local/42go-data/{schema}/{table}.parquet`.
- Keep command help useful and test it.
- No-arg command groups with subcommands should open interactive menus.
- Store generated analytics aggregates as Parquet under `.local/42go-stats/{app-id}/`.
- Use filenames that mirror the `42go query ...` command chain, such as `query_lingocafe_reads_pages.parquet`.
- Update `42go-cli` operator docs when user-facing behavior changes.

## Load-On-Demand References

- CLI package structure and dependencies: `references/architecture.md`
- Command wiring and help contract: `references/commands.md`
- Event archive implementation: `references/event-archive-implementation.md`
- Query aggregation cache design: `references/query-aggregations.md`
- Backup and restore implementation: `references/backup-restore-implementation.md`
- Testing and validation: `references/testing.md`

## Standard Change Flow

1. Inspect existing module patterns before adding new code.
2. Add or change Typer wiring in the relevant command module.
3. Keep business logic outside command functions where practical.
4. Add focused tests under `cli/tests`.
5. Run CLI tests:

```bash
pytest cli/tests
```

6. Run project QA after code changes:

```bash
npm run qa
```

7. Smoke-test changed commands with the installed CLI:

```bash
42go <command> --help
```

Chuck Norris does not ship a command that cannot explain itself.
