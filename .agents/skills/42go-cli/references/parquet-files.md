# 42Go Parquet Files

This reference explains the local Parquet contract used by `42go pull`, `42go query`, and `42go update`.

## Roots

- Raw pulled data: `.local/42go-data/`
- Query aggregates: `.local/42go-stats/{app-id}/`
- Raw rows that mirror a source table use `.local/42go-data/{schema}/{table}.parquet`.
- LingoCafe aggregate files use filenames that mirror the command chain, such as `query_lingocafe_reads_pages.parquet`.

## Raw Pull Files

### `.local/42go-data/auth/users.parquet`

Source: `auth.users`.

Stores one row per auth user without password data. Useful fields include `app_id`, `id`, `username`, `name`, `email`, `email_verified`, `image`, JSON-string fields `profile`, `consent`, `feature_flags`, and timestamps.

Provides the local user dimension for management views that need account identity, consent/profile data, or user creation timelines.

### `.local/42go-data/auth/accounts.parquet`

Source: `auth.accounts`.

Stores one row per linked auth account without token secrets. Useful fields include `app_id`, `account_id`, `user_id`, `type`, `provider`, `scope`, `token_type`, `expires_at`, and timestamps.

Provides provider-linking facts, such as which users logged in with GitHub, Google, credentials, or other providers.

### `.local/42go-data/auth/_state.json`

Stores progressive pull cursors for `auth.users` and `auth.accounts`. This is JSON, not Parquet, but it sits beside the raw auth table files.

Useful for the CLI only. Visualization should not treat it as a metric table.

### `.local/42go-data/events/events_YYYYMM.parquet`

Source: `events.events`, partitioned by `created_at` month.

Stores raw event rows with `created_at`, `id`, `app_id`, `user_id`, `event_at`, `name`, JSON-string `data`, and JSON-string `meta`.

Provides the canonical local event fact table for all event-based analytics: sessions, user growth, read engagement, and ad hoc archive stats. Use the whole file group as one partitioned dataset.

### `.local/42go-data/events/_state.json`

Stores the progressive event cursor and latest completed batch summary: `last_created_at`, `last_id`, batch row count, touched months, and update time. This is JSON, not Parquet, but it sits beside the partitioned event files.

Useful for the CLI pull process. Visualization generally reads `events_YYYYMM.parquet`, not this file.

### `.local/42go-data/events/_inflight.json`

Stores a temporary run id and cursor while an event pull is in progress. This is JSON, not Parquet, but it sits beside the partitioned event files.

Useful for interrupted CLI reruns. Visualization should ignore it.

### `.local/42go-data/lingocafe/books.parquet`

Source: `lingocafe.books`.

Stores one row per book with book metadata such as `id`, `project`, `lang`, `level`, `title`, `description`, `author`, JSON-string `tags`, JSON-string `info`, `published_at`, `created_at`, and `updated_at`.

Provides the raw LingoCafe book dimension.

### `.local/42go-data/lingocafe/books_pages.parquet`

Source: `lingocafe.books_pages`.

Stores one row per book page with `book_id`, page `id`, `position`, `kind`, `prefix`, `title`, `summary`, and `content`.

Provides page counts, ordering, and page metadata. Read-completion aggregates use this file to compute total pages and page positions.

### `.local/42go-data/lingocafe/books_progress.parquet`

Source: `lingocafe.books_progress`.

Stores user progress by `user_id`, `book_id`, `page_id`, `progress_bps`, `created_at`, `updated_at`, and `completed_at`.

Provides raw explicit progress facts from the LingoCafe application.

### `.local/42go-data/lingocafe/_state.json`

Stores progressive cursors for LingoCafe book and progress pulls, plus row counts. This is JSON, not Parquet, but it sits beside the raw LingoCafe table files.

Useful for the CLI pull process. Visualization usually reads the three LingoCafe raw Parquet files instead.

## Query Aggregate Files

### `.local/42go-stats/{app-id}/query_users_growth_metrics.parquet`

Command: `42go query users growth`.

Stores bucketed user growth and activity metrics by `app_id`, `granularity`, `bucket_start`, and `bucket_label`.

Metrics:

- `total_users`: users known at bucket boundary, inferred from first observed user-scoped event.
- `subscribed_users`: users whose latest marketing consent is true at bucket boundary.
- `weekly_active_users`: users with reading activity in the trailing 7 days.
- `monthly_active_users`: users with reading activity in the trailing 30 days.
- `inactive_users`: known users minus monthly active users.

This is the main file for management growth charts.

### `.local/42go-stats/{app-id}/query_users_growth_state.parquet`

Command: `42go query users growth`.

Stores cache metadata per source event file: schema version, generated time, timezone, source path, file fingerprint, event range, row count, granularities, reading events, and consent events.

Useful for cache validation and debugging. It is not a business metric table.

### `.local/42go-stats/{app-id}/query_session_sessions.parquet`

Command: `42go query session`.

Stores one row per detected user session with `id`, `app_id`, `user_id`, `start_at`, `end_at`, `duration`, and `event_count`.

Sessions are grouped by app and user. A gap greater than one hour starts a new session.

This is the main file for management session-level analytics.

### `.local/42go-stats/{app-id}/query_session_events.parquet`

Command: `42go query session`.

Stores the event rows assigned to each session. Fields include `session_id`, `event_index`, event `id`, `created_at`, `app_id`, `user_id`, `event_at`, `name`, JSON-string `data`, and JSON-string `meta`.

Provides drill-down from a session to the exact ordered events that compose it.

### `.local/42go-stats/{app-id}/query_session_state.parquet`

Command: `42go query session`.

Stores cache metadata per source event file: schema version, generated time, source path, file fingerprint, event range, session gap, session count, grouping, and included event-name policy.

Useful for cache validation and debugging. It is not a business metric table.

### `.local/42go-stats/lingocafe/query_lingocafe_books_books.parquet`

Command: `42go query lingocafe books`.

Stores one row per LingoCafe book with `app_id`, `book_id`, `project`, `lang`, `level`, `title`, `author`, and `page_count`.

Provides a compact book dimension for dashboards and joins.

### `.local/42go-stats/lingocafe/query_lingocafe_books_pages.parquet`

Command: `42go query lingocafe books`.

Stores one row per LingoCafe page with `app_id`, `book_id`, `page_id`, `position`, `kind`, and `title`.

Provides a compact page dimension and page-order map. This is usually better for analytics joins than the raw page file because it excludes large content fields.

### `.local/42go-stats/lingocafe/query_lingocafe_books_progress.parquet`

Command: `42go query lingocafe books`.

Stores a compact progress summary with `app_id`, `progress_rows`, and `source_path`.

Provides a row-count sanity check for the raw progress source. It is not user-level progress analytics.

### `.local/42go-stats/lingocafe/query_lingocafe_books_state.parquet`

Command: `42go query lingocafe books`.

Stores cache metadata and source paths for the compact book aggregate: book count, page count, progress row count, raw source paths, and update time.

Useful for cache validation and debugging.

### `.local/42go-stats/lingocafe/query_lingocafe_reads_pages.parquet`

Command: `42go query lingocafe reads`.

Stores page-open metrics by `app_id`, `book_id`, `granularity`, `bucket_start`, and `bucket_label`.

Metrics:

- `page_open_events`: count of `page.open` rows with book and page ids.
- `unique_pages_opened`: distinct pages opened in the bucket.

Granularities are `all`, `day`, `week`, and `month`.

This is the main file for management page-read trend charts.

### `.local/42go-stats/lingocafe/query_lingocafe_reads_users.parquet`

Command: `42go query lingocafe reads`.

Stores reader metrics by `app_id`, `book_id`, `granularity`, `bucket_start`, and `bucket_label`.

Metrics:

- `reader_users`: distinct users with reading activity.
- `reading_event_count`: total `page.open`, `page.scroll`, and `page.translate` events.

Granularities are `all`, `week`, `month`, and `year`.

Provides book-level reader activity and retention-style trend inputs.

### `.local/42go-stats/lingocafe/query_lingocafe_reads_summary.parquet`

Command: `42go query lingocafe reads`.

Stores one summary row per book with first/last event time, total book-context event count, reading event count, page-open count, unique pages opened, reader count, and event-name list.

Provides a compact book engagement leaderboard.

### `.local/42go-stats/lingocafe/query_lingocafe_reads_event_names.parquet`

Command: `42go query lingocafe reads`.

Stores event-name coverage for read/book events. Fields include `name`, `event_count`, `user_count`, `book_count`, and `page_count`.

Useful for instrumentation QA: it shows which event names are powering read analytics and whether payloads include book/page ids.

### `.local/42go-stats/lingocafe/query_lingocafe_reads_page_completion.parquet`

Command: `42go query lingocafe reads`.

Stores page-level completion by `book_id` and `page_id`.

Metrics include page position/title, opened readers, completed readers, completion rate, average max progress BPS, and threshold used.

Provides page-level drop-off and completion diagnostics.

### `.local/42go-stats/lingocafe/query_lingocafe_reads_book_completion.parquet`

Command: `42go query lingocafe reads`.

Stores user-book completion rows by `book_id` and `user_id`.

Metrics include opened pages, completed pages, total pages, opened/completed ratios, max page position opened/completed, max-position ratios, and threshold used.

Provides per-reader completion analysis and can power detailed retention/completion views.

### `.local/42go-stats/lingocafe/query_lingocafe_reads_completion_funnel.parquet`

Command: `42go query lingocafe reads`.

Stores completion funnel buckets per book.

Fields include `bucket`, min/max completed ratio, user count, and threshold used. Buckets are `0-20%`, `20-40%`, `40-60%`, `60-80%`, and `80-100%`.

Provides a book-level completion distribution for funnel charts.

### `.local/42go-stats/lingocafe/query_lingocafe_reads_state.parquet`

Command: `42go query lingocafe reads`.

Stores cache metadata per source event file plus book-page catalog fingerprint: schema version, generated time, timezone, source file fingerprints, event range, book count, completion threshold, book-page source/count, granularities, reading events, and book-context events.

Useful for cache validation and debugging. It is not a business metric table.
