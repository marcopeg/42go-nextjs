# 42Go Event Archive

Use this reference for pulling core event rows into local files.

## Commands

Pull new rows:

```bash
42go pull events
```

Inspect the next export batch without writing files:

```bash
42go pull events --dry-run
```

Control batch size:

```bash
42go pull events --limit 5000
```

Override data root:

```bash
42go pull events --data-dir .local/42go-data
```

## Environment

- Source database env var: `BACKUP_DATABASE_URL`
- Data-root override env var: `FORTYTWOGO_DATA_DIR`
- Default data root: `.local/42go-data`

The event pull uses the same source database env var as `42go backup`. The CLI reads `.env` when the env var is not already exported.

## Archive Layout

```text
.local/42go-data/
  events/
    events_YYYYMM.parquet
    _state.json
    _inflight.json
```

## Extraction Contract

- Source table: core `events.events`.
- PostgreSQL is read-only for this operation.
- Export cursor: `created_at, id`.
- Analytics timestamp: `event_at`.
- `app_id` is preserved.
- `user_id` is reconciled through `.local/42go-data/auth/users.parquet` when available.
- If `user_id` is a plain email address or `email:<address>`, the event pull replaces it with the matching `auth.users.id` for the same `app_id`.
- When `.local/42go-data/auth/users.parquet` exists, rows that still cannot be tied to a real `app_id + auth.users.id` are skipped from this local events archive. The source database keeps those events.
- Pull results include `source_rows`, exported `rows`, `reconciled_user_ids`, and `skipped_unresolved_user_ids`.
- JSONB `data` and `meta` are stored as JSON strings in Parquet.
- Monthly files are named after the event partition strategy: `events_YYYYMM.parquet`.
- Existing monthly files are merged by event `id` and rewritten atomically.
- State advances only after every touched Parquet file is written and smoke-read.
- `_state.json` stores the progressive cursor and latest completed batch summary.
- Incomplete reruns reuse the inflight run ID.

## After Pulling

Inspect raw local files with `42go peek`:

```bash
42go peek events
42go peek .local/42go-data/events/events_YYYYMM.parquet
```

To repair an existing local archive that already contains email-shaped or unresolved `user_id` values, rebuild auth first and reset events:

```bash
42go pull auth
42go pull events --reset
```
