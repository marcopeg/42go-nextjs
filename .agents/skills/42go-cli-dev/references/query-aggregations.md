# Query Aggregation Design

## Boundary

`42go query ...` commands produce local analytical aggregates. They read local Parquet inputs and write local Parquet outputs.

Inputs:

- Raw events: `.local/42go-events/events/parquet/events_YYYYMM.parquet`
- Book/page facts: `.local/42go-stats/{app-id}/query_books_stats_pages.parquet`

Outputs:

- App-scoped root: `.local/42go-stats/{app-id}/`
- File naming: `query_{subcommand}_{table}.parquet`
- State tables: `query_{subcommand}_state.parquet`

Do not use nested command folders for generated aggregates.

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
query_session_sessions.parquet
query_session_events.parquet
query_session_state.parquet
```

Users growth:

```text
query_users_growth_metrics.parquet
query_users_growth_state.parquet
```

Book stats:

```text
query_books_stats_books.parquet
query_books_stats_pages.parquet
query_books_stats_state.parquet
```

Reads:

```text
query_reads_pages.parquet
query_reads_users.parquet
query_reads_summary.parquet
query_reads_event_names.parquet
query_reads_page_completion.parquet
query_reads_book_completion.parquet
query_reads_completion_funnel.parquet
query_reads_state.parquet
```

## Session Query

- Module: `events/sessions.py`
- Schema version: `SESSION_SCHEMA_VERSION`
- Gap: `SESSION_GAP_SECONDS = 3600`
- Grouping: app, user.
- Include all event names.
- Ignore rows without `user_id` or `event_at`.
- Session id is first event id.

## Users Growth Query

- Module: `events/users_growth.py`
- Reading events: `page.open`, `page.scroll`, `page.translate`.
- Consent events: `user.consent.created`, `user.consent.updated`.
- Bucket timezone: `Europe/Rome`.
- Buckets: day, week, month, year.
- WAU/MAU use trailing 7/30 day windows.

## Book Stats Query

- Module: `events/books.py`
- Pulls `lingocafe.books` and `lingocafe.books_pages`.
- Default URL key: `DATABASE_URL`.
- `--database-url-env BACKUP_DATABASE_URL` can pull from production-style backup URL.
- Cleans old `events_query_books_stats_*` files when writing new outputs.

## Reads Query

- Module: `events/reads.py`
- Reading events: `page.open`, `page.scroll`, `page.translate`.
- Book context events also include `book.info`, `read.settings.changed`, `read.settings.opened`.
- Page metrics count `page.open` by all/day/week/month.
- Reader metrics count distinct users by all/week/month/year.
- Completion threshold default: `8000` BPS.
- User-page progress is max `progress_bps`.
- Page completion means max progress is at or above threshold.
- Book completion is completed pages divided by total pages from `query_books_stats_pages.parquet`.
- Funnel buckets: `0-20%`, `20-40%`, `40-60%`, `60-80%`, `80-100%`.

## Migration History

Earlier cache names used `events_query_*`. Current commands must write `query_*`. Keep legacy cleanup code until old local worktrees have naturally reset.
