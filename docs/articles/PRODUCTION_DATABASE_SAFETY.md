# Production database safety

Production data mutations are limited to LingoCafe book content:

```bash
make prod.book.publish file=<committed-book-seed-basename>
```

During an incident recovery, a known Git baseline can release every committed
new edition and verified books-only title metadata update added afterward in
one locked, backup-first batch:

```bash
make prod.books.publish.since base=<baseline-commit>
```

The command requires an interactive confirmation. Its non-interactive target
is intended only for a separately confirmed operator workflow.

Before it performs any other production-database operation, the guarded
publisher:

1. accepts only committed, unmodified language-and-level book seeds and
   title-only metadata seeds;
2. verifies that an edition seed is limited to `lingocafe.books` and
   `lingocafe.books_pages`, while a metadata seed can update only
   `lingocafe.books.title`, `description`, and `updated_at` for an exact
   existing `id`/`project` pair;
3. creates and verifies a full `pg_dump` snapshot under
   `.local/42go-backups/`; and
4. obtains an advisory lock, rejects an already-published direct request, and
   runs only that seed (or, for the recovery batch, only new editions still
   absent from production plus verified metadata updates for existing books).

No production book workflow may write authentication, profiles, consent,
reading progress, completions, quicklist, events, conversations, notes, or any
other application data. It does not delete existing book rows. Page cleanup is
permitted only inside a newly inserted edition's own `books_pages` rows.

The legacy `prod.migrate`, `prod.seed`, `prod.seed.file`, `prod.lc.books`, and
`prod.lc.convs` targets are intentionally disabled. `knexfile.js` also rejects
every direct `.env.prod` or `--env production` Knex command. The guarded
publisher invokes the statically validated book seed itself, so no separate
production Knex command can bypass its table scope and verified-backup check.
Application releases do not execute database migrations or seeds.

Backups are ignored local recovery artifacts. Keep them protected and test a
restore in an isolated database before an incident recovery.
