# 42Go Query Analytics

Use this reference for local analytics built from pulled Parquet files.

`42go query` is available as the public CLI command family for local aggregate Parquet files. Some sections below still describe planned or historical aggregates, but the sessions command is active.

## Boundary

- `42go pull ...` extracts raw source rows into `.local/42go-data`.
- Raw pulled data is never filtered by app ID.
- `42go query ...` commands build local analytics from cached Parquet data.
- Derived aggregate files live under `.local/42go-query/`.
- Aggregate filenames mirror the command chain. Example: `42go query sessions` writes `.local/42go-query/sessions.parquet`.
- Multi-output aggregate filenames append a meaningful suffix after `--`.

## Full Refresh Shortcut

```bash
42go update
42go update --reset
```

Current query refresh:

```bash
42go query all
```

`42go query all` runs all available aggregate commands in dependency order. Today that means:

1. `42go query sessions`
2. `42go query users`

The `42go pull all` step runs raw pull targets in parallel. State files remain target-scoped under `.local/42go-data/auth/_state.json`, `.local/42go-data/events/_state.json`, and `.local/42go-data/lingocafe/_state.json`. Auth and LingoCafe also parallelize independent database reads internally, then write target state once. Events merge distinct monthly Parquet files in parallel, then write state once.

`42go pull all` prints a readable source summary instead of raw JSON. The blocks are grouped under `auth`, `events`, and `lingocafe`; sub-blocks use table names such as `users`, `accounts`, changed `events_YYYYMM` partitions, `books`, `books_pages`, and `books_progress`. It omits raw Parquet and state paths.

The final update output includes the latest LingoCafe headline totals:

- total users
- subscribers
- weekly active users
- monthly active users

Options:

- `--data-dir`: raw data root for pulls and event/book inputs, default `.local/42go-data`.
- `--limit`: maximum rows to pull per progressive source query.
- `--database-url-env`: env or `.env` key for auth and LingoCafe pulls, default `BACKUP_DATABASE_URL`.
- `--reset`: delete selected raw Parquet files and aggregate caches before rebuilding.

## High-Level Stats

```bash
42go query stats
```

Reads local monthly event Parquet files and prints archive/product stats:

- covered months
- total events
- distinct ids
- app counts
- user counts
- event-name counts
- timestamp ranges
- per-month counts

## Sessions

```bash
42go query sessions
42go query sessions --duration 20
```

Rules:

- Source: local monthly event Parquet only.
- User dimension: `.local/42go-data/auth/users.parquet`.
- Event pulls reconcile email-shaped `user_id` values to real auth user ids when auth users have been pulled first.
- Grouping: `app_id`, then `user_id`.
- Included events: every event name for the same user.
- Ignored rows: missing `user_id` or `event_at`.
- Ignored identities: event rows whose `app_id` plus `user_id` does not match an auth user.
- Split rule: gap greater than `--duration` minutes starts a new session; exactly the duration stays in the session.
- Default duration: 20 minutes.
- Session id: first event id in the session.
- Duration column: `duration_seconds`.
- Every run rebuilds the whole sessions output from raw event Parquet and overwrites the previous output file.

Output file:

```text
.local/42go-query/sessions.parquet
```

Columns:

- `session_id`
- `app_id`
- `user_id`
- `started_at`
- `ended_at`
- `duration_seconds`
- `event_count`
- `event_ids`

## Users

```bash
42go query users
```

Rules:

- Dependency: `.local/42go-query/sessions.parquet`, created by `42go query sessions`.
- `42go query all` runs `sessions` before `users`.
- One row per unique `app_id` plus `user_id`.
- Rows come from `.local/42go-data/auth/users.parquet`.
- Session-only identities are ignored; they only contribute when their `app_id` plus `user_id` matches an auth user.
- The output never includes `password`.
- Activity windows are relative to the newest session `ended_at` timestamp in `sessions.parquet`.

Output file:

```text
.local/42go-query/users.parquet
```

Session metric columns:

- `active_1d`
- `active_7d`
- `active_30d`
- `session_count`
- `session_avg_seconds`
- `session_min_seconds`
- `session_max_seconds`

## Users Growth

```bash
42go query users growth
42go query users growth --app lingocafe,default
42go query users growth --format json
42go query users growth --reset
```

Metrics:

- `total_users`: auth users known at bucket boundary from `.local/42go-data/auth/users.parquet`; falls back to first observed user-scoped event only when auth users are not available.
- `subscribed_users`: users whose latest `mkt` consent value is true at bucket boundary, using auth consent plus consent events.
- `weekly_active_users`: users with `page.open`, `page.scroll`, or `page.translate` in trailing 7 days.
- `monthly_active_users`: users with reading activity in trailing 30 days.
- `inactive_users`: known users minus monthly active users.

Rules:

- Bucket timezone: `Europe/Rome`.
- Week buckets start Monday.
- Current partial buckets use the latest available auth user or event timestamp.
- Consent events: `user.consent.created`, `user.consent.updated`.
- Consent payload: latest `data.next.mkt[]` evidence by `changedAt`.

Cache files:

```text
.local/42go-stats/{app-id}/query_users_growth_metrics.parquet
.local/42go-stats/{app-id}/query_users_growth_state.parquet
```

## Books

```bash
42go pull lingocafe
42go query lingocafe books
42go query lingocafe books --format json
```

Purpose:

- Pull `lingocafe.books`, `lingocafe.books_pages`, and `lingocafe.books_progress` into raw local Parquet.
- Provide total page counts and page positions for read-completion joins.
- Read local files only during `42go query lingocafe books`.

Raw files:

```text
.local/42go-data/lingocafe/books.parquet
.local/42go-data/lingocafe/books_pages.parquet
.local/42go-data/lingocafe/books_progress.parquet
.local/42go-data/lingocafe/_state.json
```

Cache files:

```text
.local/42go-stats/lingocafe/query_lingocafe_books_books.parquet
.local/42go-stats/lingocafe/query_lingocafe_books_pages.parquet
.local/42go-stats/lingocafe/query_lingocafe_books_progress.parquet
.local/42go-stats/lingocafe/query_lingocafe_books_state.parquet
```

## Reads

```bash
42go query lingocafe reads
42go query lingocafe reads --book-id dracula-sv-a2 --limit 100
42go query lingocafe reads --completion-threshold-bps 8000
42go query lingocafe reads --format json
42go query lingocafe reads --reset
```

Source facts:

- Events: `.local/42go-data/events/events_YYYYMM.parquet`
- Book/page catalog: `.local/42go-data/lingocafe/books_pages.parquet`

Event fields:

- Book identity: `data.book_id`
- Page identity: `data.page_id`
- Progress: `data.progress_bps`

Book-related events:

- `page.open`
- `page.scroll`
- `page.translate`
- `book.info`
- `read.settings.changed`
- `read.settings.opened`
- any row with `data.book_id`, `data.page_id`, or an event name containing `book`

Page metrics:

- Count `page.open` rows with `book_id` and `page_id`.
- Granularities: all-time, day, week, month.

Reader metrics:

- Count distinct users from `page.open`, `page.scroll`, and `page.translate`.
- Granularities: all-time, week, month, year.

Completion metrics:

- Default page completion threshold: `8000` BPS.
- User-page progress is the max `progress_bps` for `book_id`, `page_id`, and `user_id`.
- A page is completed when max progress is greater than or equal to threshold.
- Book completion uses completed pages divided by total pages from `books_pages.parquet`.
- Furthest-opened ratio uses max opened page position divided by total pages.
- Funnel buckets: `0-20%`, `20-40%`, `40-60%`, `60-80%`, `80-100%`.

Cache files:

```text
.local/42go-stats/lingocafe/query_lingocafe_reads_pages.parquet
.local/42go-stats/lingocafe/query_lingocafe_reads_users.parquet
.local/42go-stats/lingocafe/query_lingocafe_reads_summary.parquet
.local/42go-stats/lingocafe/query_lingocafe_reads_event_names.parquet
.local/42go-stats/lingocafe/query_lingocafe_reads_page_completion.parquet
.local/42go-stats/lingocafe/query_lingocafe_reads_book_completion.parquet
.local/42go-stats/lingocafe/query_lingocafe_reads_completion_funnel.parquet
.local/42go-stats/lingocafe/query_lingocafe_reads_state.parquet
```
