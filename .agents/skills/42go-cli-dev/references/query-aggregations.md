# Query Aggregation Design

## Boundary

`42go query ...` commands produce local analytical aggregates. They read local Parquet inputs and write local Parquet outputs.

Inputs:

- Raw events: `.local/42go-data/events/events_YYYYMM.parquet`
- Book/page facts: `.local/42go-data/lingocafe/books_pages.parquet`

Outputs:

- App-scoped root: `.local/42go-stats/{app-id}/`
- LingoCafe file naming mirrors the `42go query lingocafe ...` command chain.

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

LingoCafe books:

```text
query_lingocafe_books_books.parquet
query_lingocafe_books_pages.parquet
query_lingocafe_books_progress.parquet
query_lingocafe_books_state.parquet
```

Reads:

```text
query_lingocafe_reads_pages.parquet
query_lingocafe_reads_users.parquet
query_lingocafe_reads_summary.parquet
query_lingocafe_reads_event_names.parquet
query_lingocafe_reads_page_completion.parquet
query_lingocafe_reads_book_completion.parquet
query_lingocafe_reads_completion_funnel.parquet
query_lingocafe_reads_state.parquet
```

LingoCafe subscribers:

```text
query_lingocafe_subscribers_users.parquet
query_lingocafe_subscribers_state.parquet
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
- Activity fields: latest computed session from `query_session_sessions.parquet`; 7/30-day flags are relative to the newest computed session timestamp.
- Read totals: computed from `query_lingocafe_reads_book_completion.parquet`.

## Migration History

Earlier cache names used shorter `query_reads_*` and older `events_query_*` files under `.local/42go-stats/{app-id}/`. Current LingoCafe commands must write `query_lingocafe_*` files. Keep legacy cleanup code until old local worktrees have naturally reset.
