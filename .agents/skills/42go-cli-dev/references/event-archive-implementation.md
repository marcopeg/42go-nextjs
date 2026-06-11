# Event Archive Implementation

## Files

- `events/paths.py`: raw data root, env loading, path construction.
- `events/pull.py`: source query, merge/write, state handling.
- `events/query.py`: high-level archive stats.

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

## Safety

- Treat production PostgreSQL as read-only.
- Never delete source events.
- Never run heavy analytics directly on production; export first, query locally.
