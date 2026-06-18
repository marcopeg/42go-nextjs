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

`42go update` runs `42go pull all` first, then rebuilds every query aggregate with the same dependency order as `42go query all`.

`42go query all` runs all available aggregate commands in dependency order. Today that means:

1. `42go query sessions`
2. `42go query users`
3. `42go query lingocafe users`
4. `42go query lingocafe growth`
5. `42go query lingocafe reads`

The `42go pull all` step runs raw pull targets in parallel. State files remain target-scoped under `.local/42go-data/auth/_state.json`, `.local/42go-data/events/_state.json`, and `.local/42go-data/lingocafe/_state.json`. Auth and LingoCafe also parallelize independent database reads internally, then write target state once. Events merge distinct monthly Parquet files in parallel, then write state once.

`42go pull all` prints a readable source summary instead of raw JSON. The blocks are grouped under `auth`, `events`, and `lingocafe`; sub-blocks use table names such as `users`, `accounts`, changed `events_YYYYMM` partitions, `books`, `books_pages`, and `books_progress`. It omits raw Parquet and state paths.

The final update output includes pull counts plus query summaries for sessions, users, LingoCafe growth, and LingoCafe reads.

Options:

- `--data-dir`: raw data root for pulls and event/book inputs, default `.local/42go-data`.
- `--query-dir`: aggregate output root, default `.local/42go-query`.
- `--limit`: maximum rows to pull per progressive source query.
- `--database-url-env`: env or `.env` key for auth and LingoCafe pulls, default `BACKUP_DATABASE_URL`.
- `--duration`: session gap duration in minutes for the sessions aggregate, default `20`.
- `--min-session-length`: minimum session duration in seconds for active user flags, default `60`.
- `--min-session-events`: minimum session event count for active user flags, default `4`.
- `--bps`: LingoCafe reads completion threshold, default `8000`.
- `--reset`: delete selected raw Parquet files before pulling; query aggregates are then rebuilt.

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
42go query users --min-session-length 60 --min-session-events 4
```

Rules:

- Dependency: `.local/42go-query/sessions.parquet`, created by `42go query sessions`.
- `42go query all` runs `sessions` before `users`.
- One row per unique `app_id` plus `user_id`.
- Rows come from `.local/42go-data/auth/users.parquet`.
- Session-only identities are ignored; they only contribute when their `app_id` plus `user_id` matches an auth user.
- The output never includes `password`.
- Activity windows are relative to the newest session `ended_at` timestamp in `sessions.parquet`.
- Active flags only consider sessions that meet both thresholds:
  - `--min-session-length`: minimum session duration in seconds, default `60`.
  - `--min-session-events`: minimum event count in the session, default `4`.
- Session duration metrics still use all connected sessions.

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

## LingoCafe Users

```bash
42go query lingocafe users
42go query lingocafe all
```

Rules:

- Dependencies:
  - `.local/42go-query/users.parquet`, created by `42go query users`.
  - `.local/42go-query/sessions.parquet`, created by `42go query sessions`.
- `42go query all` runs `sessions`, then general `users`, then `lingocafe users`, then `lingocafe growth`, then `lingocafe reads`.
- `42go query lingocafe all` runs `lingocafe users`, then `lingocafe growth`, then `lingocafe reads`.
- Reads the general users aggregate and keeps `app_id = lingocafe`.
- Reads sessions for LingoCafe activity and session-length totals.
- `is_subscriber` comes from `consent.mkt`, using the `value` from the latest evidence entry sorted by `changedAt`.
- `own_lang`, `target_lang`, and `target_level` come from the user profile JSON.
- Activity windows are relative to the newest LingoCafe session `ended_at` timestamp in `sessions.parquet`.
- `session_length_avg` is calculated from the user's sessions inside the latest 30-day window.

Output file:

```text
.local/42go-query/lingocafe-users.parquet
```

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

## LingoCafe Growth

```bash
42go query lingocafe growth
42go query lingocafe all
```

Rules:

- Dependencies:
  - `.local/42go-query/users.parquet`, created by `42go query users`.
  - `.local/42go-query/sessions.parquet`, created by `42go query sessions`.
  - `.local/42go-data/events/events_YYYYMM.parquet`, created by `42go pull events`.
- `42go query all` runs `sessions`, general `users`, `lingocafe users`, then `lingocafe growth`, then `lingocafe reads`.
- `42go query lingocafe all` runs `lingocafe users`, then `lingocafe growth`, then `lingocafe reads`.
- Output is one long table with `day + target_lang`.
- `target_lang = all` is the all-language rollup row.
- `target_lang = unknown` keeps missing profile evidence visible.
- Days use `Europe/Rome` boundaries.
- `total_users` counts LingoCafe users with `created_at <= day`.
- `total_subscribers` reconstructs subscriber state from `user.consent.created` and `user.consent.updated` events. It reads `data.next.mkt[]`, sorts evidence by `changedAt`, and uses the latest `value` for the day.
- Target-language state reconstructs from `user.profile.created` and `user.profile.updated` events using `data.next.targetLang`.
- Active users are distinct users with sessions ending in the relevant window: same day, trailing 7 days, or trailing 30 days.

Output file:

```text
.local/42go-query/lingocafe-growth.parquet
```

Columns:

- `day`
- `target_lang`
- `total_users`
- `total_subscribers`
- `active_users_1d`
- `active_users_7d`
- `active_users_30d`

## LingoCafe Reads

```bash
42go query lingocafe reads
42go query lingocafe reads --bps 9876
42go query lingocafe all
```

Rules:

- Source: raw LingoCafe events named `page.open` and `page.scroll`.
- Payload fields: `book_id`, `page_id`, and `progress_bps`.
- `--bps` is the page-completion threshold on the 0-10000 scroll scale. Default: `8000`.
- A user/page is `user_id + book_id + page_id`.
- `user_pages_started` counts the first historical `page.open` or `page.scroll` for each user/page.
- `user_pages_completed` counts the first historical event for each user/page whose `progress_bps` is at or above `--bps`.
- Re-reading the same page later does not create a new started or completed count.
- Days use `Europe/Rome` boundaries.

Output file:

```text
.local/42go-query/lingocafe-reads.parquet
```

Columns:

- `day`
- `user_pages_started`
- `user_pages_completed`

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
