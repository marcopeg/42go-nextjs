---
name: 42go-backup
description: Generate and restore 42go PostgreSQL data-only SQL dumps through the repository Makefile. Use when the user asks to back up, restore, dump, or move database data for this project.
---

# 42go Backup

Use this skill for 42go database backup and restore work.

## Public Commands

Run backup through the Makefile:

```bash
make backup mode=full
make backup mode=light
```

Run restore through the Makefile:

```bash
make restore from=.local/42go-backups/20260509T161705Z.dump.light.sql
make restore from=20260509T161705Z.dump.light.sql
```

## Behavior

- `BACKUP_DATABASE_URL` is required and is the source database for backup.
- `RESTORE_DATABASE_URL` is required and is the target database for restore.
- `mode=full` dumps data for application tables in every non-system schema, excluding Knex migration bookkeeping tables.
- `mode=light` skips `events.events*`, `lingocafe.translation_cache`, `lingocafe.books`, `lingocafe.books_pages`, and any selected table that cannot be restored without excluded parent data.
- Both modes skip obsolete `lingocafe.events*` tables when they still exist in older databases. Core events live under `events.events`.
- Both modes skip dynamic `notes.notes_*` bucket tables because migrations do not create those tables, so data-only SQL cannot restore them into a migration-only database.
- Restore also strips dynamic `notes.notes_*` entries from older dumps before running `psql`.
- Dump files are written to `.local/42go-backups/{utc-timestamp}.dump.{mode}.sql`.
- Dump files are SQL text files and contain data only. They do not contain schema DDL, ownership, grants, or migration metadata rows.
- The generated SQL includes the restore instructions: transaction wrapper, dependency-safe truncate statement, and dependency-ordered inserts.
- Full dumps with `events.events` data also include partition creation statements for event months present in the dump, because migrations only prepare a rolling set of event partitions.
- Migrations must be run manually before restore. Do not run migrations automatically in this skill.
- `make restore from=...` only executes the selected dump against `RESTORE_DATABASE_URL`.
- Restore accepts either an explicit readable path or a bare dump filename. Bare filenames are resolved from `.local/42go-backups/` only.

## Internal Script

The Makefile calls:

```bash
node .agents/skills/42go-backup/scripts/backup.mjs backup --mode full
node .agents/skills/42go-backup/scripts/backup.mjs restore --from .local/42go-backups/file.sql
```

The script is intentionally internal. Prefer the Makefile commands when working with the operator, unless direct script invocation is useful for debugging.

## Validation

- Use `node .agents/skills/42go-backup/scripts/backup.mjs --help` for command syntax.
- Generate at least a light dump before trusting changes.
- Restore only into a database where migrations have already created the structure.
- For destructive restore validation, use a disposable database. Chuck Norris does not test restore on the only copy.
