# Command Wiring

## Root App

`cli/src/fortytwogo_cli/cli.py` defines the root Typer app:

- `pull_app` mounted as `42go pull`
- `query_app` mounted as `42go query`
- `backup` mounted as `42go backup`
- `restore` mounted as `42go restore`
- `update` mounted as `42go update`

The root callback prints help when no subcommand is invoked. Nested command groups with subcommands should open an interactive menu when invoked without a subcommand.

## Pull And Query Apps

`cli/src/fortytwogo_cli/pull/cli.py` defines:

- `pull_app`: raw data extraction commands for auth, events, books, and all data.

`cli/src/fortytwogo_cli/events/cli.py` defines:

- `query_app`: local analytics aggregation commands.
- `stats_app`: callback-backed `42go query stats`.
- `query_users_app`: nested `42go query users`.
- `query_lingocafe_app`: nested `42go query lingocafe`.
- `42go query lingocafe books`: LingoCafe book catalog query.
- `42go query lingocafe reads`: LingoCafe reading engagement query.

No-arg menus:

- `42go pull`: menu for auth, events, books, and all.
- `42go query`: menu for stats, session, users, and LingoCafe.
- `42go query users`: menu for growth.
- `42go query lingocafe`: menu for books and reads.

Do not reintroduce `42go events` or `42go users`; both are absorbed by `42go pull`.

## Adding A Command

1. Add business logic in a focused module.
2. Add a Typer command function in the relevant CLI module.
3. Validate `--format` values manually when supporting text/json.
4. Catch `RuntimeError`, print to stderr, exit 1.
5. Add help tests in `cli/tests/test_cli.py`.
6. Add behavior tests for the module.
7. Update `42go-cli` and `42go-cli-dev` docs.

## Help Expectations

The following must print useful help:

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
42go query users --help
42go query users growth --help
42go query lingocafe --help
42go query lingocafe books --help
42go query lingocafe reads --help
42go backup --help
42go restore --help
```

Tests should assert command presence and important flags.
Tests should also assert no-arg menus dispatch the selected command.

## Update Command

`42go update` lives in `cli/src/fortytwogo_cli/cli.py` because it orchestrates multiple command families.

Pipeline:

1. `run_all_pulls(...)`
2. `load_book_stats(...)`
3. `load_event_sessions(..., reset=reset)`
4. `load_users_growth(..., reset=reset)`
5. `load_event_reads(..., reset=reset)`

The `--reset` flag deletes and rebuilds the selected raw data files and aggregation caches.

`42go pull all` is the documented all-data command. `42go pull '*'` is a literal star alias; quote it in shells that expand `*`.
