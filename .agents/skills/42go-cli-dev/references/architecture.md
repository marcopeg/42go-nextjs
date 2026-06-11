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
- `psycopg[binary]`: PostgreSQL backup/export/book reads and restore helpers.
- `pytz`: timezone-aware analytics buckets.
- `pytest`: test dependency.

## Module Layout

```text
cli/src/fortytwogo_cli/
  cli.py                         # root Typer app and update orchestration
  backup/
    cli.py                       # backup/restore command functions
    core.py                      # dump/restore implementation
  pull/
    cli.py                       # 42go pull auth/events/books/all
  users/
    paths.py                     # auth pull path/env helpers
    pull.py                      # auth.users/auth.accounts pull implementation
  events/
    cli.py                       # 42go query command tree
    paths.py                     # raw event data path/env helpers
    dependencies.py              # optional dependency import helpers
    pull.py                      # events pull/export implementation
    query.py                     # high-level archive stats
    sessions.py                  # query session aggregation
    users_growth.py              # query users growth aggregation
    books.py                     # book raw pull helpers and query lingocafe books reader
    reads.py                     # query lingocafe reads engagement aggregation
```

## Command Boundary

- `42go pull auth`: reads `auth.users` and `auth.accounts`, writes `.local/42go-data/auth/users.parquet` and `.local/42go-data/auth/accounts.parquet` without password or token secrets.
- `42go pull events`: reads `events.events`, writes raw monthly local Parquet.
- `42go pull books`: reads LingoCafe books, pages, and progress, writes raw local Parquet.
- `42go pull all`: runs all raw pulls.
- `42go pull '*'`: literal star alias for all raw pulls.
- `42go query ...`: reads local Parquet and builds or inspects local aggregates.
- `42go query lingocafe books`: inspects LingoCafe book catalog facts from local raw Parquet.
- `42go query lingocafe reads`: builds LingoCafe reading engagement aggregates.
- `42go backup` / `42go restore`: data-only SQL movement.

## Environment Loading

- Raw data root: `FORTYTWOGO_DATA_DIR` or `.local/42go-data`.
- Event source: `EVENTS_DATABASE_URL`, with `.env` fallback via `events.paths.load_dotenv_value`.
- Auth and book source: `--database-url-env`, default `DATABASE_URL`, with `.env` fallback.
- Backup source: `BACKUP_DATABASE_URL`.
- Restore target: `RESTORE_DATABASE_URL`.

Do not print secrets. Redact connection strings in operator output.
