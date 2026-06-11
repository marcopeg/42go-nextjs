# Backup And Restore Implementation

## Files

- `backup/cli.py`: Typer command functions and prompts.
- `backup/core.py`: backup and restore implementation.

## Backup Modes

Full:

- Data-only SQL for application tables in non-system schemas.
- Excludes migration bookkeeping.
- Includes event partition creation statements for dumped `events.events` months.

Light:

- Skips heavy/derived tables.
- Skips `events.events*`.
- Skips `lingocafe.translation_cache`.
- Skips `lingocafe.books` and `lingocafe.books_pages`.
- Skips obsolete `lingocafe.events*`.
- Skips dynamic `notes.notes_*`.
- Skips tables that cannot restore without excluded parents.

## Restore

- Requires `RESTORE_DATABASE_URL`.
- Accepts explicit path or bare filename under `.local/42go-backups/`.
- Prompts before running.
- When no `--from` is provided, lists only the newest 10 backups in a table with file, readable UTC date, and readable size.
- Redacts target database credentials.
- Assumes migrations already created schema.
- Strips dynamic notes data from older dumps.

## Output

```text
.local/42go-backups/{utc-timestamp}.dump.{mode}.sql
```

Do not add JavaScript backup logic. The old `.agents/skills/42go-backup/scripts/backup.mjs` path is legacy only.
