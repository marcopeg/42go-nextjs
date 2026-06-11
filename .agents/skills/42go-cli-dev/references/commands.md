# Command Wiring

## Root App

`cli/src/fortytwogo_cli/cli.py` defines the root Typer app:

- `events_app` mounted as `42go events`
- `query_app` mounted as `42go query`
- `backup` mounted as `42go backup`
- `restore` mounted as `42go restore`

The root callback prints help when no subcommand is invoked.

## Events And Query Apps

`cli/src/fortytwogo_cli/events/cli.py` defines:

- `events_app`: raw event archive commands only.
- `query_app`: local analytics aggregation commands.
- `stats_app`: callback-backed `42go query stats`.
- `query_users_app`: nested `42go query users`.
- `query_books_app`: nested `42go query books`.

Do not mount `query_app` under `events_app`. `42go events query` was removed.

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
42go events --help
42go events pull --help
42go query --help
42go query stats --help
42go query session --help
42go query users --help
42go query users growth --help
42go query books --help
42go query books stats --help
42go query reads --help
42go backup --help
42go restore --help
```

Tests should assert command presence and important flags.
