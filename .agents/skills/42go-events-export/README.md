# 42go Events Export

This skill downloads core 42go event rows from PostgreSQL into a Mac-local analytics archive. The VPS database is treated as a live event buffer. Heavy analytics run locally.

The export is download-only. It never deletes, truncates, retains, or cleans up source rows.

## Setup

Create a local virtual environment and install the skill dependencies:

```bash
python3 -m venv .local/42go-events/.venv
. .local/42go-events/.venv/bin/activate
pip install -r .agents/skills/42go-events-export/requirements.txt
```

Set the required source database URL:

```bash
export EVENTS_DATABASE_URL="postgres://user:pass@host:5432/db"
```

When `EVENTS_DATABASE_URL` is unset, the exporter fails.
The env var names live in `scripts/export_events.py` as top-level constants.

The archive root defaults to `.local/42go-events`. Override it with:

```bash
export EVENTS_ANALYTICS_DIR="/path/to/archive"
```

## Export

Run:

```bash
python3 .agents/skills/42go-events-export/scripts/export_events.py
```

Useful options:

```bash
python3 .agents/skills/42go-events-export/scripts/export_events.py --limit 5000
python3 .agents/skills/42go-events-export/scripts/export_events.py --dry-run
python3 .agents/skills/42go-events-export/scripts/export_events.py --archive-dir .local/42go-events
```

The raw export mirrors the online `events.events` table by time. It does not create app-scoped raw folders or app-filtered raw exports. Build app-specific analytics as a later ETL step from the raw monthly files.

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

Monthly file names mimic the PostgreSQL partition strategy from `events.events_prepare_partitions()`, for example `events_202605.csv` and `events_202605.parquet`.

`inflight.json` exists only while a run is incomplete. If the script dies before `state.json` advances, rerunning reuses the same run ID and rewrites the affected monthly outputs. Old local `batch-*.csv` and `batch-*.parquet` files are deleted by successful exporter runs, including no-new-row runs. Source database rows are never deleted.

## Cursor Semantics

The export cursor is `(created_at, id)`.

Rows are selected in this order:

```sql
ORDER BY created_at ASC, id ASC
```

Incremental runs query:

```sql
WHERE (created_at, id) > (:last_created_at, :last_id)
```

`event_at` is the analytics timestamp. It is not used as the extraction cursor.

The exporter groups fetched rows by `created_at` month. For each touched month, it reads existing monthly files when present, merges old rows plus new rows, de-duplicates by event `id`, and atomically rewrites the monthly CSV and Parquet files.

The cursor advances only after:

1. Every touched monthly CSV file is written.
2. Every touched monthly Parquet file is written.
3. DuckDB can read each touched monthly Parquet file and count the expected rows.
4. `manifest.jsonl` records the completed run and touched months.

## Local Analytics

Weekly active users smoke query:

```bash
python3 .agents/skills/42go-events-export/scripts/analyze_events.py wau
```

The command reads local Parquet files only. It does not query PostgreSQL.

## Reading Session Assumptions

Average time spent on a book should be calculated from local events by:

1. Reading events ordered by `user_id`, `json_extract_string(data, '$.book_id')`, and `event_at`.
2. Keeping events with a book context, such as `lingocafe.page-open` and `lingocafe.page-scroll`.
3. Starting a new session when the previous event for that user/book is more than an inactivity threshold away.
4. Using 30 minutes as the first documented threshold unless later product work chooses another value.
5. Summing bounded event gaps inside a session.

Sketch:

```sql
WITH ordered AS (
  SELECT
    user_id,
    json_extract_string(data, '$.book_id') AS book_id,
    event_at,
    LAG(event_at) OVER (
      PARTITION BY user_id, json_extract_string(data, '$.book_id')
      ORDER BY event_at
    ) AS previous_event_at
  FROM read_parquet('.local/42go-events/events/parquet/*.parquet')
  WHERE json_extract_string(data, '$.book_id') IS NOT NULL
),
bounded AS (
  SELECT
    *,
    CASE
      WHEN previous_event_at IS NULL THEN 0
      WHEN event_at - previous_event_at > INTERVAL '30 minutes' THEN 0
      ELSE EXTRACT(EPOCH FROM event_at - previous_event_at)
    END AS seconds_spent
  FROM ordered
)
SELECT book_id, AVG(seconds_spent) AS average_seconds_per_event_gap
FROM bounded
GROUP BY book_id;
```

This is a starting point, not a final reporting model.

## Safety

- Do not add source deletion to this skill.
- Do not run heavy analytics on the VPS database.
- Do not commit `.local/42go-events`.
- Keep credentials in environment variables.
