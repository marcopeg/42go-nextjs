# 42Go Event Archive

Use this reference for pulling core event rows into local files.

## Commands

Pull new rows:

```bash
42go events pull
```

Inspect the next export batch without writing files:

```bash
42go events pull --dry-run
```

Control batch size:

```bash
42go events pull --limit 5000
```

Override archive root:

```bash
42go events pull --archive-dir .local/42go-events
```

## Environment

- Source database env var: `EVENTS_DATABASE_URL`
- Archive override env var: `EVENTS_ANALYTICS_DIR`
- Default archive root: `.local/42go-events`

The CLI reads `.env` when the env var is not already exported.

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

## Extraction Contract

- Source table: core `events.events`.
- PostgreSQL is read-only for this operation.
- Export cursor: `created_at, id`.
- Analytics timestamp: `event_at`.
- `app_id` is preserved.
- JSONB `data` and `meta` are stored as JSON strings in CSV and Parquet.
- Monthly files are named after the event partition strategy: `events_YYYYMM.csv` and `events_YYYYMM.parquet`.
- Existing monthly files are merged by event `id` and rewritten atomically.
- State advances only after every touched CSV and Parquet file is written and smoke-read.
- Incomplete reruns reuse the inflight run ID.

## After Pulling

Use the query commands for local analytics:

```bash
42go query stats
42go query session --reset
42go query users growth --reset --app lingocafe
```
