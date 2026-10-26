# Production database safety

Production data mutations are limited to publishing brand-new LingoCafe book
editions:

```bash
make prod.book.publish file=<committed-book-seed-basename>
```

During an incident recovery, a known Git baseline can release every committed
new edition added afterward in one locked, backup-first batch:

```bash
make prod.books.publish.since base=<baseline-commit>
```

The command requires an interactive confirmation. Its non-interactive target
is intended only for a separately confirmed operator workflow.

Before it performs any other production-database operation, the guarded
publisher:

1. accepts only committed, unmodified language-and-level book seeds;
2. verifies that its code is limited to `lingocafe.books` and
   `lingocafe.books_pages`;
3. creates and verifies a full `pg_dump` snapshot under
   `.local/42go-backups/`; and
4. obtains an advisory lock, rejects an already-published direct request, and
   runs only that seed (or, for the recovery batch, only the new editions that
   are still absent from production).

The legacy `prod.migrate`, `prod.seed`, `prod.seed.file`, `prod.lc.books`, and
`prod.lc.convs` targets are intentionally disabled. `knexfile.js` also rejects
direct `.env.prod` Knex commands unless they carry the guarded publisher's
verified-backup capability. Application releases do not execute database
migrations or seeds.

Backups are ignored local recovery artifacts. Keep them protected and test a
restore in an isolated database before an incident recovery.
