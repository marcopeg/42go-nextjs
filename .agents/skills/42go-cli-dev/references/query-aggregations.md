# Query Aggregation Design

`42go query` is the public CLI command family for local analytical aggregations.

## Boundary

`42go query ...` commands produce local analytical aggregates. They read local Parquet inputs and write local Parquet outputs.

Inputs:

- Raw events: `.local/42go-data/events/events_YYYYMM.parquet`
- Auth users: `.local/42go-data/auth/users.parquet`
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

Users:

```text
users.parquet
```

LingoCafe users:

```text
lingocafe-users.parquet
```

LingoCafe growth:

```text
lingocafe-growth.parquet
```

LingoCafe reads:

```text
lingocafe-reads.parquet
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

Historical reads cache names:

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
- Dependency: `.local/42go-data/auth/users.parquet`, produced by `42go pull auth`.
- Gap parameter: `--duration` in minutes.
- Default gap: `20` minutes.
- Grouping: app, user.
- Include all event names.
- Ignore rows without `user_id` or `event_at`.
- Ignore event rows whose `app_id` plus `user_id` does not match an auth user.
- Session id is first event id.
- Rebuild from all raw event Parquet files on every run and overwrite the sessions output file.
- Required output columns: `session_id`, `app_id`, `user_id`, `started_at`, `ended_at`, `duration_seconds`, `event_count`, and `event_ids`.

## Users Query

- Command: `42go query users`
- Module: `query/users.py`
- Output: `.local/42go-query/users.parquet`
- Dependency: `.local/42go-query/sessions.parquet`, produced by `42go query sessions`.
- `42go query all` must run `sessions` before `users`.
- Row key: unique `app_id` plus `user_id`.
- User source: `.local/42go-data/auth/users.parquet`.
- Do not create extra rows for session-only identities found in `sessions.parquet`.
- Never include a `password` column.
- Activity windows are relative to the newest `ended_at` timestamp in `sessions.parquet`.
- Active flags only consider sessions that meet both thresholds:
  - `--min-session-length` duration in seconds, default `60`.
  - `--min-session-events` event count, default `4`.
- The active-session thresholds do not filter the session duration summary columns; those metrics use all connected sessions.
- Required activity columns: `active_1d`, `active_7d`, and `active_30d`.
- Required session duration columns: `session_avg_seconds`, `session_min_seconds`, and `session_max_seconds`.

## LingoCafe Users Query

- Command: `42go query lingocafe users`
- Module: `query/lingocafe_users.py`
- Output: `.local/42go-query/lingocafe-users.parquet`
- Dependencies:
  - `.local/42go-query/users.parquet`, produced by `42go query users`.
  - `.local/42go-query/sessions.parquet`, produced by `42go query sessions`.
- `42go query all` must run `sessions`, then `users`, then `lingocafe users`, then `lingocafe growth`, then `lingocafe reads`.
- `42go query lingocafe all` must run `lingocafe users`, then `lingocafe growth`, then `lingocafe reads`.
- User source: general users aggregate filtered to `app_id = lingocafe`.
- Session source: sessions aggregate filtered to `app_id = lingocafe`.
- Consent source: `consent.mkt`; pick the `value` from the latest evidence row sorted by `changedAt`.
- Profile source fields: `profile.ownLang`, `profile.targetLang`, and `profile.targetLevel`.
- Required output columns: `user_id`, `email`, `own_lang`, `target_lang`, `target_level`, `is_subscriber`, `is_active_7d`, `is_active_30d`, `last_session_at`, `total_sessions`, `session_length_total`, `session_length_avg`, and `created_at`.
- `last_session_at`, active flags, and session length metrics come from `sessions.parquet`.
- `session_length_avg` is the average session duration for the user over sessions in the latest 30-day window.

## LingoCafe Growth Query

- Command: `42go query lingocafe growth`
- Module: `query/lingocafe_growth.py`
- Output: `.local/42go-query/lingocafe-growth.parquet`
- Dependencies:
  - `.local/42go-query/users.parquet`, produced by `42go query users`.
  - `.local/42go-query/sessions.parquet`, produced by `42go query sessions`.
  - `.local/42go-data/events/events_YYYYMM.parquet`, produced by `42go pull events`.
- `42go query all` must run `sessions`, then `users`, then `lingocafe users`, then `lingocafe growth`, then `lingocafe reads`.
- `42go query lingocafe all` must run `lingocafe users`, then `lingocafe growth`, then `lingocafe reads`.
- Table shape is one row per `day + target_lang`.
- Use `target_lang = all` for all-language rows.
- Use `target_lang = unknown` when no target-language evidence exists for the user on that day.
- Bucket timezone: `Europe/Rome`.
- User population is based on LingoCafe users from the general users aggregate and `created_at <= day`.
- Subscriber state is rebuilt historically from `user.consent.created` and `user.consent.updated` event payloads by reading `data.next.mkt[]`, sorting evidence by `changedAt`, and taking the latest `value` at each day. Current `auth.users.consent` evidence may provide the same historical entries as a fallback.
- Target-language state is rebuilt historically from `user.profile.created` and `user.profile.updated` event payloads by reading `data.next.targetLang` and applying the latest profile event at each day.
- Active users are counted from `sessions.parquet` by session `ended_at` day. `active_users_1d` is the day itself, `active_users_7d` is the inclusive trailing 7-day window, and `active_users_30d` is the inclusive trailing 30-day window.
- Required output columns: `day`, `target_lang`, `total_users`, `total_subscribers`, `active_users_1d`, `active_users_7d`, and `active_users_30d`.

## LingoCafe Reads Query

- Command: `42go query lingocafe reads`
- Module: `query/lingocafe_reads.py`
- Output: `.local/42go-query/lingocafe-reads.parquet`
- Dependencies:
  - `.local/42go-data/events/events_YYYYMM.parquet`, produced by `42go pull events`.
- `42go query all` must run `sessions`, then `users`, then `lingocafe users`, then `lingocafe growth`, then `lingocafe reads`.
- `42go query lingocafe all` must run `lingocafe users`, then `lingocafe growth`, then `lingocafe reads`.
- Event source: LingoCafe raw events named `page.open` and `page.scroll`.
- Payload fields: `data.book_id`, `data.page_id`, and `data.progress_bps`.
- Bucket timezone: `Europe/Rome`.
- `--bps` controls the completion threshold in the 0-10000 scroll-progress scale. Default: `8000`.
- A user/page key is `user_id + book_id + page_id`.
- `user_pages_started` counts the first historical `page.open` or `page.scroll` seen for each user/page key.
- `user_pages_completed` counts the first historical event for each user/page key where `progress_bps` is at or above `--bps`.
- Re-reads do not create new started or completed counts after the first historical start/completion for that user/page key.
- Required output columns: `day`, `user_pages_started`, and `user_pages_completed`.

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
- Read totals: future subscriber read metrics should consume `.local/42go-query/lingocafe-reads.parquet` unless a later reads command intentionally adds documented multi-output files.

## Migration History

Earlier cache names used shorter `query_reads_*` and older `events_query_*` files under `.local/42go-stats/{app-id}/`. Later LingoCafe commands wrote `query_lingocafe_*` files.
