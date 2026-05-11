# Export Workflow

Use the `42go-events-export` skill to download events from PostgreSQL into paired CSV and Parquet batches.

The export cursor is:

```text
(created_at, id)
```

Use `event_at` for behavioral analysis, not extraction progress.

The source database env var is:

```bash
EVENTS_DATABASE_URL
```

Default local archive:

```text
.local/42go-events-analytics
```
