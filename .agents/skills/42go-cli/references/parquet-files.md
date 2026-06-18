# 42Go Parquet Files

This reference explains the local Parquet contract used by `42go pull`, `42go query`, `42go peek`, and `42go update`.

## Roots

- Raw pulled data: `.local/42go-data/`
- Raw rows that mirror a source table use `.local/42go-data/{schema}/{table}.parquet`.
- Query aggregates: `.local/42go-query/`

Use `42go peek` to inspect raw Parquet files from the terminal. `42go peek` opens an interactive folder/file chooser, `42go peek auth` opens a file chooser inside `.local/42go-data/auth`, and complete commands such as `42go peek auth users` or `42go peek .local/42go-data/auth/users.parquet` stream rows through `more` as a terminal-width table. Use repeatable filters like `-f app_id=lingocafe`; `%` is a wildcard, so `-f email=%@gmail.com` matches Gmail addresses. Use `-rmc app_id,image` to hide columns from the result table.

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

During event pull, `user_id` values shaped as a plain email address or `email:<address>` are reconciled to the matching `auth.users.id` for the same `app_id` when `.local/42go-data/auth/users.parquet` is available. If the auth users file exists and an event still cannot be tied to a real auth user, the row is skipped from this local archive for now. The source event remains in PostgreSQL.

Provides the canonical local event fact table for future event-based analytics. Use the whole file group as one partitioned dataset.

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

Provides page counts, ordering, and page metadata.

### `.local/42go-data/lingocafe/books_progress.parquet`

Source: `lingocafe.books_progress`.

Stores user progress by `user_id`, `book_id`, `page_id`, `progress_bps`, `created_at`, `updated_at`, and `completed_at`.

Provides raw explicit progress facts from the LingoCafe application.

### `.local/42go-data/lingocafe/_state.json`

Stores progressive cursors for LingoCafe book and progress pulls, plus row counts. This is JSON, not Parquet, but it sits beside the raw LingoCafe table files.

Useful for the CLI pull process. Visualization usually reads the three LingoCafe raw Parquet files instead.

## Query Aggregates

Query aggregates are rebuilt from the raw `.local/42go-data` Parquet files and written under `.local/42go-query/`.

### `.local/42go-query/sessions.parquet`

Command: `42go query sessions`

Stores one row per event session. Sessions are grouped by `app_id` and `user_id`, ordered by `event_at`, and split when the gap between adjacent events is greater than `--duration` minutes. The default duration is 20 minutes. Only events whose `app_id` plus `user_id` matches `.local/42go-data/auth/users.parquet` are eligible.

Columns:

- `session_id`: first event id in the session.
- `app_id`
- `user_id`
- `started_at`
- `ended_at`
- `duration_seconds`
- `event_count`
- `event_ids`: list of event ids in the session.

### `.local/42go-query/users.parquet`

Command: `42go query users`

Depends on `.local/42go-query/sessions.parquet`. A row is keyed by unique `app_id` plus `user_id` from `.local/42go-data/auth/users.parquet`. Session-only identities are ignored unless they match an auth user. The output omits `password`.

Activity flags are relative to the newest session `ended_at` timestamp in `sessions.parquet`. By default, active flags only count sessions with at least 60 seconds of duration and at least 4 events. Override with `42go query users --min-session-length <seconds> --min-session-events <count>`. Session duration metric columns still use all connected sessions.

Session metric columns:

- `active_1d`
- `active_7d`
- `active_30d`
- `session_count`
- `session_avg_seconds`
- `session_min_seconds`
- `session_max_seconds`

### `.local/42go-query/lingocafe-users.parquet`

Command: `42go query lingocafe users`

Depends on `.local/42go-query/users.parquet` and `.local/42go-query/sessions.parquet`. The output reads the general users aggregate, filters to `app_id = lingocafe`, extracts LingoCafe profile and marketing consent fields, and joins session activity from the sessions aggregate.

Columns:

- `user_id`
- `email`
- `own_lang`
- `target_lang`
- `target_level`
- `is_subscriber`
- `is_active_7d`
- `is_active_30d`
- `last_session_at`
- `total_sessions`
- `session_length_total`
- `session_length_avg`
- `created_at`

### `.local/42go-query/lingocafe-growth.parquet`

Command: `42go query lingocafe growth`

Depends on `.local/42go-query/users.parquet`, `.local/42go-query/sessions.parquet`, and raw event files under `.local/42go-data/events/`. Stores one row per `day + target_lang` for line charts. `target_lang = all` is the all-language rollup. Subscriber state is rebuilt day by day from `user.consent.created` and `user.consent.updated` event evidence in `data.next.mkt[]`, using the latest `value` by `changedAt`. Target-language state is rebuilt from `user.profile.created` and `user.profile.updated` event payloads.

Columns:

- `day`
- `target_lang`
- `total_users`
- `total_subscribers`
- `active_users_1d`
- `active_users_7d`
- `active_users_30d`

### `.local/42go-query/lingocafe-reads.parquet`

Command: `42go query lingocafe reads`

Depends on raw event files under `.local/42go-data/events/`. Stores one row per day for LingoCafe page-reading charts. It reads `page.open` and `page.scroll` events, using `data.book_id`, `data.page_id`, and `data.progress_bps`.

The `--bps` option controls the completion threshold on the 0-10000 scroll-progress scale. Default: `8000`. A user/page is keyed by `user_id + book_id + page_id`. Starts and completions count only the first historical start or completion for that key, so re-reading does not inflate the series.

Columns:

- `day`
- `user_pages_started`
- `user_pages_completed`
