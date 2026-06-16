# Event Archive Implementation

## Files

- `events/paths.py`: raw data root, env loading, path construction.
- `events/pull.py`: source query, merge/write, state handling.

## Archive Layout

```text
.local/42go-data/
  events/
    events_YYYYMM.parquet
    _state.json
    _inflight.json
```

## Export Contract

- Source: PostgreSQL `events.events`.
- Cursor: `created_at, id`.
- Analytics timestamp: `event_at`.
- User-id reconciliation uses `.local/42go-data/auth/users.parquet` when present.
- Event `user_id` values shaped as plain email addresses or `email:<address>` are rewritten to the matching `auth.users.id` for the same `app_id`.
- When the auth users Parquet exists, event rows that cannot be tied to a real `app_id + auth.users.id` are skipped from the local events Parquet for now. The source `events.events` table is never modified or cleaned by the pull.
- The pull result reports `source_rows`, exported `rows`, `reconciled_user_ids`, and `skipped_unresolved_user_ids`.
- Monthly file partitioning follows `created_at` month.
- Merge existing local rows and fetched rows by event `id`.
- Write Parquet atomically for each touched month.
- Smoke-read touched Parquet files with DuckDB before committing state.
- Commit state only after every file write succeeds.
- Record the progressive cursor and latest completed batch summary in `_state.json`.
- Incomplete reruns reuse inflight run ID.

## Data Normalization

The archive preserves:

- `created_at`
- `id`
- `app_id`
- `user_id`
- `event_at`
- `name`
- `data`
- `meta`

JSONB fields are serialized as JSON strings for CSV and Parquet.

If a monthly file is touched by a pull, existing rows in that file are normalized through the same email-to-user-id reconciliation and unresolved-user filtering before the file is rewritten. To reconcile the entire local event archive, run auth first and reset events:

```bash
42go pull auth
42go pull events --reset
```

## Safety

- Treat production PostgreSQL as read-only.
- Never delete source events.
- Keep unresolved email/login attempts in source `events.events`; skip them only from the current local user-event Parquet archive until a dedicated unknown-event archive exists.
- Never run heavy analytics directly on production; export first and analyze local Parquet files.
