---
name: 42go-cli-dev
description: Use when changing, extending, refactoring, or reviewing the Python `42go` CLI implementation, including command structure, Typer wiring, raw Parquet pulls, event archive internals, backup/restore behavior, and tests.
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
  - `42go query` for local analytical aggregations.
  - `42go backup` and `42go restore` for data-only SQL dump workflows.
- `42go query` must stay mounted on the root CLI.
- Structure `42go query` as nested Typer subcommands. Each intermediate command group may contain more subcommands.
- At every `42go query` command-group level, if subcommands exist but the operator does not provide one, present the available subcommands as a numbered interactive choice so the operator can navigate aggregation functionality.
- Always maintain `42go query all`. It reruns all aggregation leaf commands in the correct dependency order. If one aggregate depends on another, the dependency runs first.
- Aggregation commands write Parquet outputs under `.local/42go-query/`.
- A single-output leaf command names its Parquet file from the full subcommand chain joined by hyphens. Example: `42go query foo bar xxx` writes `.local/42go-query/foo-bar-xxx.parquet`.
- A multi-output leaf command appends a meaningful output suffix after `--`. Example: `42go query foo bar xxx` may write `.local/42go-query/foo-bar-xxx--file1.parquet` and `.local/42go-query/foo-bar-xxx--file2.parquet`.
- Use meaningful multi-output suffixes such as `sessions`, `summary`, `users`, `pages`, or `state`; avoid generic names unless they are placeholders in documentation.
- Do not reintroduce `42go events` or `42go users`.
- Store raw pulled data as Parquet under `.local/42go-data/`.
- Raw pulled rows that mirror a source table must use `.local/42go-data/{schema}/{table}.parquet`.
- Keep command help useful and test it.
- No-arg command groups with subcommands should open interactive menus.
- Update `42go-cli` operator docs when user-facing behavior changes.

## Load-On-Demand References

- CLI package structure and dependencies: `references/architecture.md`
- Command wiring and help contract: `references/commands.md`
- Event archive implementation: `references/event-archive-implementation.md`
- Query aggregation command contract: `references/query-aggregations.md`
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
