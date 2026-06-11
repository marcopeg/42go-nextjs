# CLI Architecture

## Package

- Source root: `cli/src/fortytwogo_cli/`
- Distribution: `42go-cli`
- Entry point: `42go = "fortytwogo_cli.cli:main"`
- Tests: `cli/tests`
- Packaging manifest cache: `cli/src/42go_cli.egg-info/SOURCES.txt`

## Runtime Dependencies

Declared in `cli/pyproject.toml`:

- `typer[all]`: CLI command tree and option parsing.
- `duckdb`: local Parquet reads and smoke checks.
- `pyarrow`: Parquet writes.
- `psycopg[binary]`: PostgreSQL backup/export/book-stats reads and restore helpers.
- `pytz`: timezone-aware analytics buckets.
- `pytest`: test dependency.

## Module Layout

```text
cli/src/fortytwogo_cli/
  cli.py                         # root Typer app
  backup/
    cli.py                       # backup/restore command functions
    core.py                      # dump/restore implementation
  events/
    cli.py                       # events and query Typer apps
    paths.py                     # archive path/env helpers
    dependencies.py              # optional dependency import helpers
    pull.py                      # events pull/export implementation
    query.py                     # high-level archive stats
    sessions.py                  # query session aggregation
    users_growth.py              # query users growth aggregation
    books.py                     # query books stats pull/cache
    reads.py                     # query reads engagement aggregation
```

## Command Boundary

- `42go events pull`: talks to `EVENTS_DATABASE_URL`, writes raw local event archive.
- `42go query ...`: reads local Parquet and builds aggregate Parquet. `query books stats` is the one query command that pulls non-event book/page facts into local Parquet.
- `42go backup` / `42go restore`: data-only SQL movement.

## Environment Loading

- Event archive source: `EVENTS_DATABASE_URL`, with `.env` fallback via `events.paths.load_dotenv_value`.
- Event archive root: `EVENTS_ANALYTICS_DIR` or `.local/42go-events`.
- Book stats source: `--database-url-env`, default `DATABASE_URL`, with `.env` fallback in `events.books.read_env_url`.
- Backup source: `BACKUP_DATABASE_URL`.
- Restore target: `RESTORE_DATABASE_URL`.

Do not print secrets. Redact connection strings in operator output.
