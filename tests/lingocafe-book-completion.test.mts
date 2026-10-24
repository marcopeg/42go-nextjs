import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { ReaderBook } from "../src/app/(app)/(lingocafe)/books/_components/book-types.ts";
import { buildBookshelfSections } from "../src/app/(app)/(lingocafe)/books/_components/bookshelf.ts";

const readSource = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const makeBook = ({
  id,
  title,
  level = "a2",
  completedAt = null,
  readingUpdatedAt = null,
}: {
  id: string;
  title: string;
  level?: string;
  completedAt?: string | null;
  readingUpdatedAt?: string | null;
}): ReaderBook => ({
  id,
  project: id,
  lang: "en",
  level,
  title,
  author: "Author",
  tags: [],
  info: {},
  cover: null,
  coverFallback: "/placeholder.jpg",
  publishedAt: null,
  createdAt: null,
  updatedAt: null,
  completedAt,
  readingAction: readingUpdatedAt
    ? {
        kind: "resume",
        label: "Continue reading",
        href: `/books/${id}/p01`,
        bookId: id,
        pageId: "p01",
        progressBps: 100,
        updatedAt: readingUpdatedAt,
      }
    : {
        kind: "start",
        label: "Read now",
        href: `/books/${id}/p01`,
        bookId: id,
        pageId: "p01",
        progressBps: null,
        updatedAt: null,
      },
});

test("bookshelf partitions completion independently from reading progress", () => {
  const sections = buildBookshelfSections([
    makeBook({
      id: "reading-old",
      title: "Reading old",
      readingUpdatedAt: "2026-07-01T10:00:00.000Z",
    }),
    makeBook({
      id: "completed-old",
      title: "Completed old",
      completedAt: "2026-07-02T10:00:00.000Z",
      readingUpdatedAt: "2026-07-29T10:00:00.000Z",
    }),
    makeBook({ id: "catalog", title: "Catalog" }),
    makeBook({
      id: "completed-new",
      title: "Completed new",
      completedAt: "2026-07-28T10:00:00.000Z",
    }),
    makeBook({
      id: "reading-new",
      title: "Reading new",
      readingUpdatedAt: "2026-07-20T10:00:00.000Z",
    }),
  ]);

  assert.deepEqual(
    sections.currentlyReading.map((book) => book.id),
    ["reading-new", "reading-old"]
  );
  assert.deepEqual(
    sections.catalog.map((book) => book.id),
    ["catalog"]
  );
  assert.deepEqual(
    sections.completed.map((book) => book.id),
    ["completed-new", "completed-old"]
  );
});

test("migration backfills completion before dropping the progress column", async () => {
  const migration = await readSource(
    "knex/migrations/20260729160000_lingocafe_book_completion.js"
  );
  const backfillAt = migration.indexOf(
    "INSERT INTO lingocafe.books_completed"
  );
  const dropAt = migration.indexOf('table.dropColumn("completed_at")');

  assert.match(migration, /createTable\("books_completed"/);
  assert.match(migration, /primary\(\["user_id", "book_id"\]\)/);
  assert.ok(backfillAt >= 0);
  assert.ok(dropAt > backfillAt);
});

test("completion API exposes both protected mutations and canonical events", async () => {
  const [route, reader] = await Promise.all([
    readSource(
      "src/app/api/(lingocafe)/lingocafe/books/[bookId]/completion/route.ts"
    ),
    readSource("src/app/api/(lingocafe)/lingocafe/_lib/reader.ts"),
  ]);

  assert.match(route, /export const PUT = protectRoute/);
  assert.match(route, /export const DELETE = protectRoute/);
  assert.match(route, /feature: "api:lingocafe", session: true/);
  assert.match(reader, /name: "book\.mark\.read"/);
  assert.match(reader, /name: "book\.mark\.unread"/);
  assert.match(reader, /onConflict\(\["user_id", "book_id"\]\)/);
});

test("bookshelf filters by target level and falls back from a1 to a2 when a1 has no results", () => {
  const books = [
    makeBook({ id: "book-a2", title: "Book A2", level: "a2" }),
    makeBook({ id: "book-b2", title: "Book B2", level: "b2" }),
  ];

  // 1. When targetLevel is "b2", returns only B2 books
  const b2Sections = buildBookshelfSections(books, "b2");
  assert.deepEqual(
    b2Sections.catalog.map((b) => b.id),
    ["book-b2"]
  );

  // 2. When targetLevel is "a2", returns only A2 books
  const a2Sections = buildBookshelfSections(books, "a2");
  assert.deepEqual(
    a2Sections.catalog.map((b) => b.id),
    ["book-a2"]
  );

  // 3. When targetLevel is "a1" and no A1 books exist, automatically falls back to A2
  const a1Sections = buildBookshelfSections(books, "a1");
  assert.deepEqual(
    a1Sections.catalog.map((b) => b.id),
    ["book-a2"]
  );

  // 4. If an actual A1 book exists, it shows A1
  const booksWithA1 = [
    makeBook({ id: "book-a1", title: "Book A1", level: "a1" }),
    ...books,
  ];
  const actualA1Sections = buildBookshelfSections(booksWithA1, "a1");
  assert.deepEqual(
    actualA1Sections.catalog.map((b) => b.id),
    ["book-a1"]
  );
});
