# Query Aggregation Design

`42go query` is the public CLI command family for local analytical aggregations.

## Boundary

`42go query ...` commands produce local analytical aggregates. They read local Parquet inputs and write local Parquet outputs.

Inputs:

- Raw events: `.local/42go-data/events/events_YYYYMM.parquet`
- Book/page facts: `.local/42go-data/lingocafe/books_pages.parquet`

Outputs:

- Aggregate root: `.local/42go-query/`
- File naming mirrors the full `42go query ...` subcommand chain.

## Command Structure

- Implement `42go query` as nested Typer subcommands.
- Intermediate command groups may represent domains, entities, or aggregate families, such as `42go query lingocafe reads`.
- Leaf commands do the aggregation work and write Parquet outputs.
- If the operator invokes a query command group without selecting a subcommand, present its subcommands as a numbered interactive menu. This applies at every level where subcommands exist.
- Keep command help useful at every level.
- Always provide `42go query all`.
- `42go query all` reruns every aggregation leaf command in dependency order. If one aggregate consumes another aggregate's output, the producer must run first.
- Avoid hidden aggregate dependencies. Document dependencies in the command module or aggregate registry used by `query all`.

## Output Naming

Every aggregation command writes Parquet files under `.local/42go-query/`.

For a single-output leaf command, join the subcommand chain after `query` with hyphens:

```text
42go query foo bar xxx
.local/42go-query/foo-bar-xxx.parquet
```

For a multi-output leaf command, append a meaningful output suffix after `--`:

```text
42go query foo bar xxx
.local/42go-query/foo-bar-xxx--file1.parquet
.local/42go-query/foo-bar-xxx--file2.parquet
```

Use real output names instead of placeholders in implementations, for example:

```text
.local/42go-query/lingocafe-reads--pages.parquet
.local/42go-query/lingocafe-reads--users.parquet
.local/42go-query/lingocafe-reads--summary.parquet
```

The `.local/42go-query/` directory is the canonical aggregate output root. Do not write new aggregation outputs under `.local/42go-stats/`.

## Cache Rules

- Use Parquet for aggregate tables and state.
- Include schema version in state.
- Include source file fingerprints where source archive files matter.
- Include parameter values that affect computation, such as session gap or completion threshold.
- `--reset` deletes current output files and known legacy `events_query_*` files.
- Output filters should not reduce cache coverage unless explicitly documented.

## Existing Aggregates

Sessions:

```text
sessions.parquet
```

Users growth:

```text
users-growth--metrics.parquet
users-growth--state.parquet
```

LingoCafe books:

```text
lingocafe-books--books.parquet
lingocafe-books--pages.parquet
lingocafe-books--progress.parquet
lingocafe-books--state.parquet
```

Reads:

```text
lingocafe-reads--pages.parquet
lingocafe-reads--users.parquet
lingocafe-reads--summary.parquet
lingocafe-reads--event-names.parquet
lingocafe-reads--page-completion.parquet
lingocafe-reads--book-completion.parquet
lingocafe-reads--completion-funnel.parquet
lingocafe-reads--state.parquet
```

LingoCafe subscribers:

```text
lingocafe-subscribers--users.parquet
lingocafe-subscribers--state.parquet
```

## Session Query

- Command: `42go query sessions`
- Module: `query/sessions.py`
- Output: `.local/42go-query/sessions.parquet`
- Gap parameter: `--duration` in minutes.
- Default gap: `20` minutes.
- Grouping: app, user.
- Include all event names.
- Ignore rows without `user_id` or `event_at`.
- Session id is first event id.
- Rebuild from all raw event Parquet files on every run and overwrite the sessions output file.
- Required output columns: `session_id`, `app_id`, `user_id`, `started_at`, `ended_at`, `duration_seconds`, `event_count`, and `event_ids`.

## Users Growth Query

- Module: `events/users_growth.py`
- Reading events: `page.open`, `page.scroll`, `page.translate`.
- Consent events: `user.consent.created`, `user.consent.updated`.
- User population: `.local/42go-data/auth/users.parquet` when available; event-inferred users are only a fallback.
- Bucket timezone: `Europe/Rome`.
- Buckets: day, week, month, year.
- WAU/MAU use trailing 7/30 day windows.

## Book Query

- Module: `events/books.py`
- Reads raw local files from `.local/42go-data/lingocafe`.
- Raw source pull lives under `42go pull lingocafe`.
- `books` and `books_progress` are progressive.
- `books_pages` is a full catalog refresh because the table has no cursor column.
- `42go query lingocafe books` never queries PostgreSQL.

## Reads Query

- Module: `events/reads.py`
- Reading events: `page.open`, `page.scroll`, `page.translate`.
- Book context events also include `book.info`, `read.settings.changed`, `read.settings.opened`.
- Page metrics count `page.open` by all/day/week/month.
- Reader metrics count distinct users by all/week/month/year.
- Completion threshold default: `8000` BPS.
- User-page progress is max `progress_bps`.
- Page completion means max progress is at or above threshold.
- Book completion is completed pages divided by total pages from `books_pages.parquet`.
- Funnel buckets: `0-20%`, `20-40%`, `40-60%`, `60-80%`, `80-100%`.

## LingoCafe Subscribers Query

- Module: `events/subscribers.py`
- User population: `.local/42go-data/auth/users.parquet`.
- App scope: `app_id = lingocafe`.
- Subscriber filter: latest `mkt` value is `true`, combining `auth.users.consent` with `user.consent.created` and `user.consent.updated` events.
- Profile fields: `ownLang`, `targetLang`, and `targetLevel`.
- Activity fields: latest computed session from `.local/42go-query/sessions.parquet`; 7/30-day flags are relative to the newest computed session timestamp.
- Read totals: computed from `.local/42go-query/lingocafe-reads--book-completion.parquet`.

## Migration History

Earlier cache names used shorter `query_reads_*` and older `events_query_*` files under `.local/42go-stats/{app-id}/`. Later LingoCafe commands wrote `query_lingocafe_*` files.
