---
name: 42go-events-export
description: Download core `events.events` rows from PostgreSQL into a repo-local monthly CSV and Parquet archive. Use when Codex needs to export new 42go core events, inspect the event archive, run local event analytics smoke checks, or explain the Mac-local CSV/Parquet workflow.
---

# 42go Events Export

Use this skill to download new core `events.events` rows into the local analytics archive.

## Rules

- Treat PostgreSQL as read-only. Never delete, truncate, retain, or clean up source events in this skill.
- Use `EVENTS_DATABASE_URL` for the source database. Fail when it is unset.
- Use `.local/42go-events` as the default archive root.
- Write paired monthly CSV and Parquet files from the same normalized rows.
- Name monthly files after the PostgreSQL partition strategy: `events_YYYYMM.csv` and `events_YYYYMM.parquet`.
- Merge with existing monthly files by event `id`, rewrite monthly files atomically, and delete old local `batch-*` archive files.
- Advance `events/state.json` only after every touched monthly file is written and each Parquet file passes a smoke read.
- Use `created_at, id` as the export cursor. Use `event_at` for behavioral analytics.
- Preserve `app_id` in every exported row.

## Public Commands

Install or update the local CLI:

```bash
pipx install ./cli
```

Export new events:

```bash
42go events pull
```

Run a high-level stats query against local Parquet files:

```bash
42go events query stats
```

## Archive Layout

```text
.local/42go-events/
  events/
    csv/events_YYYYMM.csv
    parquet/events_YYYYMM.parquet
    state.json
    manifest.jsonl
```

## Details

- Read `README.md` in this skill for the full operator workflow and decision record.
- The `42go events pull` command stores JSONB `data` and `meta` payloads as JSON strings in CSV and Parquet.
- If an export dies before state is committed, rerunning reuses the same run ID and rewrites touched monthly files.
- CSV exists for human inspection. Parquet exists for Python and DuckDB analysis.
- Legacy scripts under `scripts/` are compatibility wrappers only. Keep event implementation logic in `cli/src/fortytwogo_cli/events/`.
