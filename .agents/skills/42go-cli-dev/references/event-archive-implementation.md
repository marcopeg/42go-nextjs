# Event Archive Implementation

## Files

- `events/paths.py`: archive root, env loading, path construction.
- `events/pull.py`: source query, merge/write, manifest/state handling.
- `events/query.py`: high-level archive stats.

## Archive Layout

```text
.local/42go-events/
  events/
    csv/events_YYYYMM.csv
    parquet/events_YYYYMM.parquet
    state.json
    manifest.jsonl
    inflight.json
```

## Export Contract

- Source: PostgreSQL `events.events`.
- Cursor: `created_at, id`.
- Analytics timestamp: `event_at`.
- Monthly file partitioning follows `created_at` month.
- Merge existing local rows and fetched rows by event `id`.
- Write CSV and Parquet atomically for each touched month.
- Smoke-read touched Parquet files with DuckDB before committing state.
- Commit state only after every file write succeeds.
- Record manifest entries for completed runs.
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
