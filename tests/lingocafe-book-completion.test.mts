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
  completedAt = null,
  readingUpdatedAt = null,
}: {
  id: string;
  title: string;
  completedAt?: string | null;
  readingUpdatedAt?: string | null;
}): ReaderBook => ({
  id,
  project: id,
  lang: "en",
  level: "a2",
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
