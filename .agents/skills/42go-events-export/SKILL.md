---
name: 42go-events-export
description: Download core `events.events` rows from PostgreSQL into a repo-local analytics archive with paired CSV and Parquet batches. Use when Codex needs to export new 42go core events, inspect the event archive, run local event analytics smoke checks, or explain the Mac-local CSV/Parquet workflow.
---

# 42go Events Export

Use this skill to download new core `events.events` rows into the local analytics archive.

## Rules

- Treat PostgreSQL as read-only. Never delete, truncate, retain, or clean up source events in this skill.
- Use `EVENTS_DATABASE_URL` for the source database; fall back to `DATABASE_URL` when unset.
- Use `.local/42go-events-analytics` as the default archive root.
- Write paired CSV and Parquet files from the same export batch.
- Advance `events/state.json` only after both files are written and the Parquet file passes a smoke read.
- Use `created_at, id` as the export cursor. Use `event_at` for behavioral analytics.
- Preserve `app_id` in every exported row.

## Public Commands

Set up local Python dependencies:

```bash
python3 -m venv .local/42go-events-analytics/.venv
. .local/42go-events-analytics/.venv/bin/activate
pip install -r .agents/skills/42go-events-export/requirements.txt
```

Export new events:

```bash
python3 .agents/skills/42go-events-export/scripts/export_events.py
```

Run a weekly-active-users smoke query against local Parquet files:

```bash
python3 .agents/skills/42go-events-export/scripts/analyze_events.py wau
```

## Archive Layout

```text
.local/42go-events-analytics/
  events/
    csv/batch-YYYYMMDDTHHMMSSZ.csv
    parquet/batch-YYYYMMDDTHHMMSSZ.parquet
    state.json
    manifest.jsonl
```

## Details

- Read `README.md` in this skill for the full operator workflow and decision record.
- The export script stores JSONB `data` and `meta` payloads as JSON strings in CSV and Parquet.
- If an export dies before state is committed, rerunning reuses and overwrites the incomplete batch.
- CSV exists for human inspection. Parquet exists for Python and DuckDB analysis.
