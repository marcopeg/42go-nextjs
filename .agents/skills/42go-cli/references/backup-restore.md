# 42Go Backup And Restore

Use this reference for operator-facing database dump and restore work.

## Commands

Create a full data-only SQL dump:

```bash
42go backup --full
```

Create a light data-only SQL dump:

```bash
42go backup --light
```

Prompt for backup mode:

```bash
42go backup
```

Restore an explicit dump path:

```bash
42go restore --from .local/42go-backups/20260509T161705Z.dump.light.sql
```

Restore a bare dump filename from `.local/42go-backups/`:

```bash
42go restore --from 20260509T161705Z.dump.light.sql
```

Prompt for a dump from newest to oldest:

```bash
42go restore
```

The interactive restore prompt shows only the newest 10 available backups. The list is rendered as a table with the file path, readable UTC timestamp, and readable file size.

Makefile wrappers call the CLI:

```bash
make backup mode=full
make backup mode=light
make restore from=.local/42go-backups/<dump>.sql
```

## Environment

- `BACKUP_DATABASE_URL` is required for backup source.
- `RESTORE_DATABASE_URL` is required for restore target.

## Behavior

- Dumps are data-only SQL text files.
- Output path: `.local/42go-backups/{utc-timestamp}.dump.{mode}.sql`.
- Dumps exclude schema DDL, ownership, grants, and migration metadata rows.
- Restore assumes migrations have already created database structure.
- Restore prints the target database with credentials redacted and asks for confirmation.
- Bare restore filenames resolve only under `.local/42go-backups/`.

## Full Mode

`42go backup --full` dumps application tables in every non-system schema, excluding migration bookkeeping tables.

Full dumps with `events.events` data include partition creation statements for event months present in the dump, because migrations only prepare a rolling set of event partitions.

## Light Mode

`42go backup --light` skips heavy or derived tables:

- `events.events*`
- `lingocafe.translation_cache`
- `lingocafe.books`
- `lingocafe.books_pages`
- obsolete `lingocafe.events*`
- dynamic `notes.notes_*`
- tables that cannot restore cleanly without excluded parent data

Restore strips dynamic `notes.notes_*` entries from older dumps before running `psql`.

## Safety

- Do not restore into the only valuable database when validating changes.
- Run migrations manually before restore.
- Do not add new backup logic outside `cli/src/fortytwogo_cli/backup/`.
