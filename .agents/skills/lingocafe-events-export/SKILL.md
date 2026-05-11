---
name: lingocafe-events-export
description: Download LingoCafe `lingocafe.events` rows from PostgreSQL into a repo-local analytics archive with paired CSV and Parquet batches. Use when Codex needs to export new LingoCafe events, inspect the event archive, run local event analytics smoke checks, or explain the Mac-local CSV/Parquet workflow.
---

# LingoCafe Events Export

Use this skill to download new `lingocafe.events` rows into the local analytics archive.

## Rules

- Treat PostgreSQL as read-only. Never delete, truncate, retain, or clean up source events in this skill.
- Use `LC_EVENTS_DATABASE_URL` for the source database.
- Use `.local/lingocafe-analytics` as the default archive root.
- Write paired CSV and Parquet files from the same export batch.
- Advance `events/state.json` only after both files are written and the Parquet file passes a smoke read.
- Use `created_at, id` as the export cursor. Use `event_at` for behavioral analytics.

## Public Commands

Set up local Python dependencies:

```bash
python3 -m venv .local/lingocafe-analytics/.venv
. .local/lingocafe-analytics/.venv/bin/activate
pip install -r .agents/skills/lingocafe-events-export/requirements.txt
```

Export new events:

```bash
LC_EVENTS_DATABASE_URL="postgres://..." \
python3 .agents/skills/lingocafe-events-export/scripts/export_events.py
```

Run a weekly-active-users smoke query against local Parquet files:

```bash
python3 .agents/skills/lingocafe-events-export/scripts/analyze_events.py wau
```

## Archive Layout

```text
.local/lingocafe-analytics/
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
