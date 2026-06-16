# 42Go Query Analytics

Use this reference for local analytics commands under `42go query`.

Invoking `42go query` without a subcommand opens an interactive menu. If the selected target has subcommands, that level opens its own menu; for example `42go query users` opens the user-query menu.

## Boundary

- `42go pull ...` extracts raw source rows into `.local/42go-data`.
- Raw pulled data is never filtered by app ID.
- `42go query ...` builds or reads local analytics from cached Parquet data.
- Derived aggregate files are app-scoped under `.local/42go-stats/{app-id}/`.
- LingoCafe aggregate files use filenames that mirror the command chain, such as `query_lingocafe_books_pages.parquet` and `query_lingocafe_reads_pages.parquet`.
- `--app-id`, `--user-id`, `--book-id`, and `--limit` filter visible output unless command help says otherwise.
- `--reset` rebuilds local aggregate caches from available local data and removes legacy `events_query_*` files.

## Full Refresh Shortcut

```bash
42go update
42go update --reset
```

`42go update` runs the standard refresh pipeline:

1. `42go pull all`
2. `42go query lingocafe books`
3. `42go query session`
4. `42go query users growth`
5. `42go query lingocafe reads`
6. `42go query lingocafe subscribers`

The final update output includes the latest LingoCafe headline totals:

- total users
- subscribers
- weekly active users
- monthly active users

Options:

- `--data-dir`: raw data root for pulls and event/book inputs, default `.local/42go-data`.
- `--limit`: maximum rows to pull per progressive source query.
- `--database-url-env`: env or `.env` key for auth and book pulls, default `BACKUP_DATABASE_URL`.
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
42go query session
42go query session --app-id lingocafe --user-id <id> --limit 100
42go query session --format json
42go query session --reset
```

Rules:

- Source: local monthly event Parquet only.
- Grouping: `app_id`, then `user_id`.
- Included events: every event name for the same user.
- Ignored rows: missing `user_id` or `event_at`.
- Split rule: gap greater than one hour starts a new session; exactly one hour stays in the session.
- Session id: first event id in the session.
- Duration: seconds in JSON, human-readable in text output.
- Text output: summaries only, newest sessions first.
- JSON output: returned sessions include full `events[]`.
- Default visible limit: 20 sessions per app.

Cache files:

```text
.local/42go-stats/{app-id}/query_session_sessions.parquet
.local/42go-stats/{app-id}/query_session_events.parquet
.local/42go-stats/{app-id}/query_session_state.parquet
```

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
42go pull books
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
