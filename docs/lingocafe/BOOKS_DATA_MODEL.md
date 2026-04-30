# LingoCafe Books Data Model

This document is a standalone contract for a content-export application.

The export application reads book metadata, book structure, chapter titles, summaries, and markdown page content from the LingoCafe content repository. It then generates SQL, usually named `content-export.sql`, that inserts or updates that content in the LingoCafe reader database.

The export must be surgical:

- It may create books that are present in the export payload.
- It may update books that are present in the export payload.
- It may create, update, reorder, and delete pages for books present in the export payload.
- It must not delete a target book only because that book is missing from the current export payload.
- It must not touch pages for books that are not present in the current export payload.
- It must not rewrite user profiles, reader progress, or event history except through the database's page-delete cascade.

## Target Schema

The target database uses PostgreSQL.

The relevant schema is `lingocafe`.

The content-export application writes content into:

- `lingocafe.books`
- `lingocafe.books_pages`

The content-export application must understand but not directly own:

- `lingocafe.books_progress`
- `lingocafe.events`
- `lingocafe.profiles`

The target application migration is the source of truth for the live schema. This document describes the schema contract that the export application needs in order to generate SQL safely.

## Source Content Model

The content repository can organize books however it wants internally, but the export must normalize that content into this shape:

```ts
type ExportBook = {
  id: string;
  project: string;
  lang: string;
  level: string;
  title: string;
  description: string;
  author: string;
  tags: string[];
  info: Record<string, unknown>;
  publishedAt: string | null;
  pages: ExportBookPage[];
};

type ExportBookPage = {
  id: string;
  position: number;
  kind: string;
  prefix: string | null;
  title: string;
  summary: string | null;
  content: string | null;
};
```

Typical source files may include:

- A YAML file with book-level metadata: `id`, `project`, `lang`, `level`, `title`, `description`, `author`, `tags`, `info`, and `publishedAt`.
- A YAML file with book structure: parts, sections, chapters, titles, summaries, and source markdown paths.
- Markdown files with the actual readable content for each exported page.

The export application is responsible for turning those source files into SQL rows.

Cover assets are not persisted in `lingocafe.books`. The reader resolves covers through the deterministic public path `/images/lingocafe/<book-id>.jpg` and falls back to `/images/lingocafe/placeholder.jpg` when the book-specific asset is missing.

## Ownership Boundaries

| Table | Export ownership | Meaning |
| --- | --- | --- |
| `lingocafe.books` | Owned by content export | Book catalog metadata. |
| `lingocafe.books_pages` | Owned by content export | Ordered readable pages for each book. |
| `lingocafe.books_progress` | User state | Current reading position. Not owned by content export. |
| `lingocafe.events` | Runtime telemetry | Historical reader events. Not owned by content export. |
| `lingocafe.profiles` | User state | Reader language preferences. Not owned by content export. |

The content export owns the canonical page set only for the books included in the current export payload.

## `lingocafe.books`

`lingocafe.books` stores one row per book available in the reader catalog.

### Columns

| Column | Type | Required | Source mapping |
| --- | --- | --- | --- |
| `id` | `text` | yes | Stable book ID from the content repository. |
| `project` | `text` | yes | Source project or export project that owns the book. |
| `lang` | `text` | yes | Book language code, such as `en`, `sv`, `de`, `it`, or `es`. |
| `level` | `text` | yes | Reading level, such as `a2`, `b1`, or `b2`. |
| `title` | `text` | yes | Book display title from metadata. |
| `description` | `text` | yes | Full book description from metadata. |
| `author` | `text` | yes | Author or adaptation credit from metadata. |
| `tags` | `text[]` | yes | Tag list from metadata. Use an empty array when there are no tags. |
| `info` | `jsonb` | yes | Flexible book metadata object. Use `{}` when there is no extra metadata. |
| `published_at` | `timestamp` | no | Optional publication timestamp for the reader inventory. |
| `created_at` | `timestamp` | yes | Set by SQL on insert. |
| `updated_at` | `timestamp` | yes | Refresh on every export update. |

### Keys And Constraints

- Primary key: `id`
- `lingocafe.books_pages.book_id` references `lingocafe.books(id)` with `ON DELETE CASCADE`
- `lingocafe.books_progress.book_id` references `lingocafe.books(id)` with `ON DELETE CASCADE`

### Book ID Rules

`books.id` is the stable identity of a logical book.

The content repository owns this value. The export application must not generate a new book ID on every export.

Keep the same book ID when the same logical book is re-exported. If the book metadata, chapter structure, or markdown content changes, update the existing row.

Changing a book ID creates a new book from the target database point of view. Existing pages and reader progress under the old book ID will not automatically move.

## `lingocafe.books_pages`

`lingocafe.books_pages` stores the ordered readable units of a book.

A page can represent a chapter, a section intro, a part marker, or another unit that should appear in the reader navigation.

### Columns

| Column | Type | Required | Source mapping |
| --- | --- | --- | --- |
| `book_id` | `text` | yes | Parent `ExportBook.id`. |
| `id` | `text` | yes | Stable page ID from the content structure. Scoped to the book. |
| `position` | `integer` | yes | 1-based or otherwise consistently increasing page order inside the book. |
| `kind` | `text` | yes | Page kind, such as `chapter`, `part`, `section`, or `other`. Defaults to `chapter` when the source has no explicit kind. |
| `prefix` | `text` | no | Optional visible prefix, such as `Part 1`, `Chapter 1`, `Del 1`, or `Kapitel 1`. |
| `title` | `text` | yes | Page title from structure metadata or markdown frontmatter. |
| `summary` | `text` | no | Optional summary from structure metadata or markdown frontmatter. |
| `content` | `text` | no | Markdown body exported as text. Use null for structural pages with no body. |

### Keys And Constraints

- Primary key: `(book_id, id)`
- Unique ordering constraint: `(book_id, position)`
- Foreign key: `book_id` references `lingocafe.books(id)` with `ON DELETE CASCADE`

The page primary key is composite. Page ID `p01` in one book is different from page ID `p01` in another book.

The `position` value must be unique inside a book. Duplicate page positions for the same `book_id` must fail export generation before SQL is produced.

### Page ID Rules

`books_pages.id` is stable within a book.

Keep the same page ID when the logical page remains the same and only its title, summary, markdown body, prefix, kind, or position changes.

Use a new page ID when the content has been structurally reflowed and a reader's old page position should no longer be treated as valid.

If a page ID disappears from an exported book's current page list, the target page is stale for that book and should be deleted.

## `lingocafe.books_progress`

`lingocafe.books_progress` stores one current reading position per user and book.

The export application does not own this table.

### Columns

| Column | Type | Required | Meaning |
| --- | --- | --- | --- |
| `user_id` | `text` | yes | Reader user ID. |
| `book_id` | `text` | yes | Book being read. |
| `page_id` | `text` | yes | Current page for this user and book. |
| `progress_bps` | `integer` | yes | Scroll progress inside the page, from `0` to `10000`. |
| `created_at` | `timestamp` | yes | Progress row creation timestamp. |
| `updated_at` | `timestamp` | yes | Last progress update timestamp. |
| `completed_at` | `timestamp` | no | Optional completion timestamp. |

### Keys And Constraints

- Unique key: `(user_id, book_id)`
- Foreign key: `book_id` references `lingocafe.books(id)` with `ON DELETE CASCADE`
- Foreign key: `(book_id, page_id)` references `lingocafe.books_pages(book_id, id)` with `ON DELETE CASCADE`
- Check constraint: `progress_bps >= 0 AND progress_bps <= 10000`
- Index: `(user_id, updated_at DESC)`

The unique `(user_id, book_id)` rule means a user has one saved reading position per book.

### Progress Cleanup

When the export deletes a stale page from `lingocafe.books_pages`, PostgreSQL automatically deletes any `lingocafe.books_progress` rows that point to that deleted `(book_id, page_id)`.

This happens because the target schema defines the progress-to-page foreign key with `ON DELETE CASCADE`.

The export SQL should normally delete stale pages and let the cascade clean stale progress.

Only add explicit progress deletes if the target schema changes in the future and no longer has the page-progress cascade.

## `lingocafe.events`

`lingocafe.events` stores historical reader telemetry.

The export application must not rewrite this table as part of content replacement.

Events may contain `book_id` and `page_id` text values, but they are not foreign-keyed to the content tables. This is intentional. Historical events can survive content reflows and page deletion.

## `lingocafe.profiles`

`lingocafe.profiles` stores reader preferences such as native language, target language, and target reading level.

The export application must not write this table.

## Runtime Assumptions The Export Must Preserve

The reader expects:

- A book can be found by `lingocafe.books.id`.
- Pages for a book are ordered by `lingocafe.books_pages.position`.
- The first readable page is the lowest `position` for that `book_id`.
- A resume link uses `books_progress.book_id`, `books_progress.page_id`, and `books_progress.progress_bps`.
- A reader URL contains both book ID and page ID: `/books/[bookId]/[pageId]`.
- `progress_bps` is a basis-point percentage from `0` to `10000`.

If page IDs remain stable, reader progress remains usable. If a page ID is deleted during a reflow, the progress row pointing to it is removed by cascade.

## Export Contract

For every book included in an export payload, the payload is authoritative for:

- the `lingocafe.books` row with that `id`
- the full current page set for that `book_id`

The payload is not authoritative for:

- books missing from the export payload
- pages belonging to books missing from the export payload
- user profiles
- reader progress except stale progress removed through page deletion cascade
- event history

## Required Export Flow

Run the export in a transaction.

For each exported book:

1. Upsert the `lingocafe.books` row.
2. Move existing page positions for that exported book into a temporary negative range.
3. Upsert all exported `lingocafe.books_pages` rows for that book using final exported positions.
4. Delete stale `lingocafe.books_pages` rows for that book where the target page ID is not present in the exported page ID list.
5. Let `ON DELETE CASCADE` remove any stale `lingocafe.books_progress` rows pointing to deleted pages.

The temporary position shift is required because `lingocafe.books_pages` has an immediate `UNIQUE (book_id, position)` constraint. Reordering pages directly can fail when two pages swap positions, even when the final state is valid.

## SQL Template For One Book

This example shows the shape a generator can produce for one exported book.

```sql
BEGIN;

WITH exported_book AS (
  SELECT
    'nils-holgersson-sv-a2'::text AS id,
    'nils-holgersson'::text AS project,
    'sv'::text AS lang,
    'a2'::text AS level,
    'Nils Holgerssons underbara resa'::text AS title,
    'A Swedish reader edition.'::text AS description,
    'LingoCafe Content'::text AS author,
    ARRAY['resa', 'sverige']::text[] AS tags,
    '{"words_count": 12400, "chapters_count": 18}'::jsonb AS info,
    '2026-01-12 09:00:00'::timestamp AS published_at
)
INSERT INTO lingocafe.books (
  id,
  project,
  lang,
  level,
  title,
  description,
  author,
  tags,
  info,
  published_at,
  created_at,
  updated_at
)
SELECT
  id,
  project,
  lang,
  level,
  title,
  description,
  author,
  tags,
  info,
  published_at,
  now(),
  now()
FROM exported_book
ON CONFLICT (id) DO UPDATE
SET
  project = EXCLUDED.project,
  lang = EXCLUDED.lang,
  level = EXCLUDED.level,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  author = EXCLUDED.author,
  tags = EXCLUDED.tags,
  info = EXCLUDED.info,
  published_at = EXCLUDED.published_at,
  updated_at = now();

UPDATE lingocafe.books_pages AS target_page
SET position = shifted.temporary_position
FROM (
  SELECT
    book_id,
    id,
    -1000000 - row_number() OVER (ORDER BY book_id, id) AS temporary_position
  FROM lingocafe.books_pages
  WHERE book_id = 'nils-holgersson-sv-a2'
) AS shifted
WHERE target_page.book_id = shifted.book_id
  AND target_page.id = shifted.id;

WITH exported_pages AS (
  SELECT *
  FROM (
    VALUES
      (
        'nils-holgersson-sv-a2'::text,
        'p01'::text,
        1::integer,
        'chapter'::text,
        'Kapitel 1'::text,
        'En ny morgon'::text,
        'Nils vaknar till en stilla morgon.'::text,
        'Markdown content for page one.'::text
      ),
      (
        'nils-holgersson-sv-a2'::text,
        'p02'::text,
        2::integer,
        'chapter'::text,
        'Kapitel 2'::text,
        'Over akern'::text,
        'Resan borjar med enkla steg.'::text,
        'Markdown content for page two.'::text
      )
  ) AS page_data (
    book_id,
    id,
    position,
    kind,
    prefix,
    title,
    summary,
    content
  )
)
INSERT INTO lingocafe.books_pages (
  book_id,
  id,
  position,
  kind,
  prefix,
  title,
  summary,
  content
)
SELECT
  book_id,
  id,
  position,
  kind,
  prefix,
  title,
  summary,
  content
FROM exported_pages
ON CONFLICT (book_id, id) DO UPDATE
SET
  position = EXCLUDED.position,
  kind = EXCLUDED.kind,
  prefix = EXCLUDED.prefix,
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  content = EXCLUDED.content;

WITH exported_page_ids AS (
  SELECT *
  FROM (
    VALUES
      ('nils-holgersson-sv-a2'::text, 'p01'::text),
      ('nils-holgersson-sv-a2'::text, 'p02'::text)
  ) AS page_ids (book_id, id)
)
DELETE FROM lingocafe.books_pages AS target_page
WHERE target_page.book_id = 'nils-holgersson-sv-a2'
  AND NOT EXISTS (
    SELECT 1
    FROM exported_page_ids AS exported_page
    WHERE exported_page.book_id = target_page.book_id
      AND exported_page.id = target_page.id
  );

COMMIT;
```

## SQL Template For Multiple Books

For multiple books, use the same phases, but scope position shifts and stale-page deletes to the exported book ID set.

```sql
BEGIN;

WITH exported_books AS (
  SELECT *
  FROM (
    VALUES
      (
        'book-a'::text,
        'project-a'::text,
        'en'::text,
        'a2'::text,
        'Book A'::text,
        'Book A description.'::text,
        'LingoCafe Content'::text,
        ARRAY['demo']::text[],
        '{}'::jsonb,
        NULL::timestamp
      ),
      (
        'book-b'::text,
        'project-b'::text,
        'sv'::text,
        'b1'::text,
        'Book B'::text,
        'Book B description.'::text,
        'LingoCafe Content'::text,
        ARRAY['demo']::text[],
        '{"words_count": 9800}'::jsonb,
        NULL::timestamp
      )
  ) AS book_data (
    id,
    project,
    lang,
    level,
    title,
    description,
    author,
    tags,
    info,
    published_at
  )
)
INSERT INTO lingocafe.books (
  id,
  project,
  lang,
  level,
  title,
  description,
  author,
  tags,
  info,
  published_at,
  created_at,
  updated_at
)
SELECT
  id,
  project,
  lang,
  level,
  title,
  description,
  author,
  tags,
  info,
  published_at,
  now(),
  now()
FROM exported_books
ON CONFLICT (id) DO UPDATE
SET
  project = EXCLUDED.project,
  lang = EXCLUDED.lang,
  level = EXCLUDED.level,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  author = EXCLUDED.author,
  tags = EXCLUDED.tags,
  info = EXCLUDED.info,
  published_at = EXCLUDED.published_at,
  updated_at = now();

WITH exported_book_ids AS (
  SELECT *
  FROM (
    VALUES
      ('book-a'::text),
      ('book-b'::text)
  ) AS ids (id)
)
UPDATE lingocafe.books_pages AS target_page
SET position = shifted.temporary_position
FROM (
  SELECT
    target_page.book_id,
    target_page.id,
    -1000000 - row_number() OVER (
      ORDER BY target_page.book_id, target_page.id
    ) AS temporary_position
  FROM lingocafe.books_pages AS target_page
  WHERE target_page.book_id IN (SELECT id FROM exported_book_ids)
) AS shifted
WHERE target_page.book_id = shifted.book_id
  AND target_page.id = shifted.id;

WITH exported_pages AS (
  SELECT *
  FROM (
    VALUES
      ('book-a'::text, 'p01'::text, 1::integer, 'chapter'::text, 'Chapter 1'::text, 'Start'::text, NULL::text, 'Markdown A1'::text),
      ('book-a'::text, 'p02'::text, 2::integer, 'chapter'::text, 'Chapter 2'::text, 'Next'::text, NULL::text, 'Markdown A2'::text),
      ('book-b'::text, 'p01'::text, 1::integer, 'chapter'::text, 'Kapitel 1'::text, 'Start'::text, NULL::text, 'Markdown B1'::text)
  ) AS page_data (
    book_id,
    id,
    position,
    kind,
    prefix,
    title,
    summary,
    content
  )
)
INSERT INTO lingocafe.books_pages (
  book_id,
  id,
  position,
  kind,
  prefix,
  title,
  summary,
  content
)
SELECT
  book_id,
  id,
  position,
  kind,
  prefix,
  title,
  summary,
  content
FROM exported_pages
ON CONFLICT (book_id, id) DO UPDATE
SET
  position = EXCLUDED.position,
  kind = EXCLUDED.kind,
  prefix = EXCLUDED.prefix,
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  content = EXCLUDED.content;

WITH exported_pages AS (
  SELECT *
  FROM (
    VALUES
      ('book-a'::text, 'p01'::text),
      ('book-a'::text, 'p02'::text),
      ('book-b'::text, 'p01'::text)
  ) AS page_ids (book_id, id)
),
exported_book_ids AS (
  SELECT DISTINCT book_id AS id
  FROM exported_pages
)
DELETE FROM lingocafe.books_pages AS target_page
WHERE target_page.book_id IN (SELECT id FROM exported_book_ids)
  AND NOT EXISTS (
    SELECT 1
    FROM exported_pages AS exported_page
    WHERE exported_page.book_id = target_page.book_id
      AND exported_page.id = target_page.id
  );

COMMIT;
```

The important stale-page guard is:

```sql
WHERE target_page.book_id IN (SELECT id FROM exported_book_ids)
```

That guard prevents the export from touching books outside the current payload.

## Mapping Markdown And YAML To Rows

Recommended mapping:

| Source concept | Target table | Target column |
| --- | --- | --- |
| Book slug or canonical ID | `lingocafe.books` | `id` |
| Source project | `lingocafe.books` | `project` |
| Book language | `lingocafe.books` | `lang` |
| Book CEFR level | `lingocafe.books` | `level` |
| Book title | `lingocafe.books` | `title` |
| Book description | `lingocafe.books` | `description` |
| Book author/adaptation credit | `lingocafe.books` | `author` |
| Book tags | `lingocafe.books` | `tags` |
| Generic book metadata | `lingocafe.books` | `info` |
| Publication timestamp | `lingocafe.books` | `published_at` |
| Chapter/section ID | `lingocafe.books_pages` | `id` |
| Chapter/section order | `lingocafe.books_pages` | `position` |
| Chapter/section type | `lingocafe.books_pages` | `kind` |
| Display prefix | `lingocafe.books_pages` | `prefix` |
| Chapter/section title | `lingocafe.books_pages` | `title` |
| Chapter/section summary | `lingocafe.books_pages` | `summary` |
| Markdown body | `lingocafe.books_pages` | `content` |

If the source has nested parts and chapters, flatten them into a single ordered page list. Use `kind`, `prefix`, `title`, and `summary` to preserve the structure that the reader should display.

## Common Export Cases

### New Book

Insert the book row. Insert all page rows. The stale-page delete finds no existing target pages.

### Existing Book With Metadata Changes

Update the book row by `books.id`. Page rows are handled separately.

### Existing Page With Markdown Changes

Update the page row by `(book_id, id)`. Keep the page ID stable. Reader progress remains valid.

### Reordered Pages

Move existing page positions into a temporary negative range, then write final exported positions.

The exported positions must be unique inside the book.

### Reflowed Book With Removed Pages

Delete target pages for the exported `book_id` when their IDs are absent from the exported page list.

Progress rows pointing to deleted pages are removed by cascade.

Historical events are not removed.

### Book Missing From Current Export

Do nothing.

The export payload is not a global catalog replacement. A missing book is outside the current export scope.

### Intentional Book Deletion

Out of scope for this contract.

If full-book deletion becomes necessary, define a separate explicit deletion contract.

## Generator Validation Rules

Before producing SQL, the export generator should fail if:

- two exported books have the same `id`
- two pages in the same book have the same `id`
- two pages in the same book have the same `position`
- a page references a book that is missing from the export payload
- a required book field is missing
- a required page field is missing
- generated SQL would touch a book outside the export payload

The generator should not produce or modify `progress_bps`. That value is runtime reader state.

## Safety Checklist

Before shipping `content-export.sql`, verify:

- No `TRUNCATE lingocafe.books`.
- No `TRUNCATE lingocafe.books_pages`.
- No broad `DELETE FROM lingocafe.books`.
- No broad `DELETE FROM lingocafe.books_pages`.
- Every stale-page delete is guarded by exported `book_id`.
- Every page row has a stable `(book_id, id)`.
- Every page position is unique inside its book.
- Book upserts refresh `updated_at`.
- Stale progress cleanup relies on the page-progress `ON DELETE CASCADE`.
- `lingocafe.events` is not rewritten.
- `lingocafe.profiles` is not rewritten.
