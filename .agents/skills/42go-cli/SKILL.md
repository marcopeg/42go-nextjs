---
name: 42go-cli
description: Use when working with the local pipx-installable `42go` Python CLI, adding commands, checking help output, or navigating event archive tooling.
---

# 42Go CLI

Use this skill when the task mentions the local `42go` CLI, `42go-cli`, pipx installation, command help, or event archive commands.

## Rules

- Keep the CLI package under `cli/`.
- Keep the Python distribution name `42go-cli`.
- Keep the console command `42go`.
- Keep commands discoverable through standard `--help`.
- Bare `42go`, `42go events`, and `42go events query` must print useful help.
- When adding or changing commands, update this skill in the same task.
- Complex commands may get dedicated docs under this skill folder when the flat index becomes too dense.

## Install

Normal install from this repository:

```bash
pipx install ./cli
```

Development install from this repository:

```bash
pipx install --force --editable ./cli
```

Use editable mode when changing files under `cli/src/`; it avoids reinstalling after every source edit.

Uninstall the global pipx command:

```bash
pipx uninstall 42go-cli
```

For local development inside the event venv:

```bash
.local/42go-events/.venv/bin/pip install -e cli
```

## Command Index

- `42go`
  - Use to show root help and discover available command families.
- `42go --help`
  - Use to show root command help explicitly.
- `42go --version`
  - Use to show the installed CLI version.
- `42go events`
  - Use to show event archive command help.
- `42go events pull`
  - Use to download new `events.events` rows from `EVENTS_DATABASE_URL` into local monthly CSV and Parquet files.
- `42go events pull --dry-run`
  - Use to verify the next export batch without writing files or advancing `events/state.json`.
- `42go events query`
  - Use to show local event query command help.
- `42go events query stats`
  - Use to print human-readable high-level stats from local monthly Parquet files, including covered months, total events, distinct ids, app/user/event-name counts, timestamp ranges, and per-month counts.
- `42go events query users`
  - Use to show user-statistics command help.
- `42go events query users growth`
  - Use to compute app-scoped user growth, promotional-email subscription, weekly active user, monthly active user, and inactive user metrics from local Parquet files.
- `42go events query users growth --app lingocafe,default`
  - Use to filter terminal or JSON output to one or more app IDs while the aggregate cache remains app-scoped.
- `42go events query users growth --reset`
  - Use to remove the users-growth aggregate cache and recompute from all available local Parquet files.
- `42go events query users growth --format json`
  - Use to emit the users-growth result as machine-readable JSON.

## Event Archive Defaults

- Source database env var: `EVENTS_DATABASE_URL`
- Archive override env var: `EVENTS_ANALYTICS_DIR`
- Default archive root: `.local/42go-events`
- Raw CSV files: `.local/42go-events/events/csv/events_YYYYMM.csv`
- Raw Parquet files: `.local/42go-events/events/parquet/events_YYYYMM.parquet`
- Users-growth stats root: `.local/42go-stats/{app-id}/users/growth/`
- Users-growth metric cache: `.local/42go-stats/{app-id}/users/growth/metrics.parquet`
- Users-growth state cache: `.local/42go-stats/{app-id}/users/growth/state.json`

## Users Growth Metrics

- `total_users`: users known at the bucket boundary, inferred from first observed user-scoped event.
- `subscribed_users`: users whose latest `mkt` consent value is `true` at the bucket boundary.
- `weekly_active_users`: users with `page.open`, `page.scroll`, or `page.translate` in the trailing 7-day window.
- `monthly_active_users`: users with `page.open`, `page.scroll`, or `page.translate` in the trailing 30-day window.
- `inactive_users`: known users minus monthly active users.
- Bucket timezone: `Europe/Rome`.
- Week buckets: ISO weeks starting Monday.
- Current partial day/week/month/year buckets use the latest available event time rather than a future period end.
- Consent source events: `user.consent.created` and `user.consent.updated`.
- Consent payload rule: parse `data.next.mkt[]` structurally and use the latest evidence entry by `changedAt`.

## Help Contract

Agents should navigate commands by calling `--help` at each level:

```bash
42go --help
42go events --help
42go events pull --help
42go events query --help
42go events query stats --help
42go events query users --help
42go events query users growth --help
```

If a command cannot explain its purpose, options, defaults, and relevant environment variables through help output, fix the CLI help before relying on it.
