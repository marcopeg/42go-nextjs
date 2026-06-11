# 42Go Query Analytics

Use this reference for local analytics commands under `42go query`.

## Boundary

- `42go events pull` extracts raw event rows into `.local/42go-events`.
- `42go query ...` builds local aggregates from cached Parquet data.
- Aggregates are independent by app ID under `.local/42go-stats/{app-id}/`.
- Aggregate files use `query_*.parquet` names.
- `--app-id`, `--user-id`, `--book-id`, and `--limit` filter visible output unless command help says otherwise.
- `--reset` rebuilds local aggregate caches from available local data and removes legacy `events_query_*` files.

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

- `total_users`: users known at bucket boundary, inferred from first observed user-scoped event.
- `subscribed_users`: users whose latest `mkt` consent value is true at bucket boundary.
- `weekly_active_users`: users with `page.open`, `page.scroll`, or `page.translate` in trailing 7 days.
- `monthly_active_users`: users with reading activity in trailing 30 days.
- `inactive_users`: known users minus monthly active users.

Rules:

- Bucket timezone: `Europe/Rome`.
- Week buckets start Monday.
- Current partial buckets use the latest available event time.
- Consent events: `user.consent.created`, `user.consent.updated`.
- Consent payload: latest `data.next.mkt[]` evidence by `changedAt`.

Cache files:

```text
.local/42go-stats/{app-id}/query_users_growth_metrics.parquet
.local/42go-stats/{app-id}/query_users_growth_state.parquet
```

## Book Stats

```bash
42go query books stats
42go query books stats --database-url-env BACKUP_DATABASE_URL
42go query books stats --format json
```

Purpose:

- Pull LingoCafe book/page facts from PostgreSQL into local Parquet.
- Provide total page counts and page positions for read-completion joins.

Environment:

- Default URL key: `DATABASE_URL`
- Optional URL key: `BACKUP_DATABASE_URL` or another `.env`/environment variable.

Cache files:

```text
.local/42go-stats/{app-id}/query_books_stats_books.parquet
.local/42go-stats/{app-id}/query_books_stats_pages.parquet
.local/42go-stats/{app-id}/query_books_stats_state.parquet
```

Run this before read completion analysis when book/page metadata may have changed.

## Reads

```bash
42go query reads
42go query reads --app-id lingocafe --book-id dracula-sv-a2 --limit 100
42go query reads --completion-threshold-bps 8000
42go query reads --format json
42go query reads --reset
```

Source facts:

- Events: `.local/42go-events/events/parquet/events_YYYYMM.parquet`
- Book/page catalog: `.local/42go-stats/{app-id}/query_books_stats_pages.parquet`

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
- Book completion uses completed pages divided by total pages from `query_books_stats_pages.parquet`.
- Furthest-opened ratio uses max opened page position divided by total pages.
- Funnel buckets: `0-20%`, `20-40%`, `40-60%`, `60-80%`, `80-100%`.

Cache files:

```text
.local/42go-stats/{app-id}/query_reads_pages.parquet
.local/42go-stats/{app-id}/query_reads_users.parquet
.local/42go-stats/{app-id}/query_reads_summary.parquet
.local/42go-stats/{app-id}/query_reads_event_names.parquet
.local/42go-stats/{app-id}/query_reads_page_completion.parquet
.local/42go-stats/{app-id}/query_reads_book_completion.parquet
.local/42go-stats/{app-id}/query_reads_completion_funnel.parquet
.local/42go-stats/{app-id}/query_reads_state.parquet
```
