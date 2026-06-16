# Command Wiring

## Root App

`cli/src/fortytwogo_cli/cli.py` defines the root Typer app:

- `pull_app` mounted as `42go pull`
- `backup` mounted as `42go backup`
- `restore` mounted as `42go restore`
- `peek` mounted as `42go peek`
- `update` mounted as `42go update`
- `query_app` mounted as `42go query`

The root callback prints help when no subcommand is invoked. Nested command groups with subcommands should open an interactive menu when invoked without a subcommand.

## Pull App

`cli/src/fortytwogo_cli/pull/cli.py` defines:

- `pull_app`: raw data extraction commands for auth, events, LingoCafe, and all data.

No-arg menus:

- `42go pull`: menu for auth, events, LingoCafe, and all.

Do not reintroduce `42go events` or `42go users`.

Maintain `42go query` as the aggregation command family.

## Query App

`cli/src/fortytwogo_cli/query/cli.py` should define:

- `query_app`: nested aggregation command tree.
- `42go query all`: reruns all aggregation leaf commands in dependency order.

No-arg menus:

- `42go query`: numbered menu for top-level query subcommands, including `all`.
- `42go query <group>`: numbered menu for that group's subcommands.
- `42go query <group> <subgroup>`: continue the same pattern until a leaf command is selected.

Output contract:

- Aggregates write Parquet files under `.local/42go-query/`.
- Single-output leaf naming: `.local/42go-query/{command-chain}.parquet`, where `command-chain` is the full subcommand path joined by hyphens.
- Multi-output leaf naming: `.local/42go-query/{command-chain}--{meaningful-output-name}.parquet`.
- Example: `42go query foo bar xxx` writes `.local/42go-query/foo-bar-xxx.parquet`, or `.local/42go-query/foo-bar-xxx--summary.parquet` plus sibling outputs for multi-file commands.
- Keep aggregate output naming stable because downstream aggregates may depend on these files.

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
42go peek --help
42go update --help
42go pull --help
42go pull auth --help
42go pull events --help
42go pull lingocafe --help
42go pull all --help
42go pull '*' --help
42go query --help
42go query users --help
42go query all --help
42go backup --help
42go restore --help
```

Tests should assert command presence and important flags.
Tests should also assert no-arg menus dispatch the selected command.

## Update Command

`42go update` lives in `cli/src/fortytwogo_cli/cli.py` because it orchestrates multiple command families.

Pipeline:

1. `run_all_pulls(...)`

The `--reset` flag deletes and rebuilds raw data through the pull commands. `42go update` must not write `.local/42go-stats` files or run aggregation loaders.

`42go pull all` is the documented all-data command. It runs auth first so event pulls can reconcile email-shaped event `user_id` values against `.local/42go-data/auth/users.parquet`, then runs events and LingoCafe in parallel. Inside auth and LingoCafe, independent database reads run in parallel and each target writes its Parquet files and `_state.json` only after the reads complete. Event pulls fetch from one source query, reconcile plain email or `email:<address>` user ids to matching `auth.users.id` for the same `app_id`, then merge distinct monthly Parquet files in parallel before writing the final events state. Its terminal output is grouped by source blocks under `auth`, `events`, and `lingocafe`, with sub-blocks such as `users`, `accounts`, `events_YYYYMM`, `books`, `books_pages`, and `books_progress`. Event partition blocks are printed only when the partition changed. The human output intentionally omits raw Parquet and state paths. `42go pull '*'` is a literal star alias; quote it in shells that expand `*`.

`42go peek` streams raw local Parquet rows through `more` as a terminal-width table. With no arguments it prompts for a `.local/42go-data` subfolder, then a Parquet file. With one folder argument, such as `42go peek auth`, it prompts for a Parquet file inside that folder. Complete commands such as `42go peek auth users` and explicit file paths such as `42go peek .local/42go-data/auth/users.parquet` stream immediately. Filters are repeatable with `-f column=value`; `%` is a wildcard. `-rmc column_a,column_b` hides columns from the result table.
