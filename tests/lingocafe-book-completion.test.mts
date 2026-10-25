import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import type { ReaderBook } from "../src/app/(app)/(lingocafe)/books/_components/book-types.ts";
import {
  buildBookshelfSections,
  parseBookTitle,
} from "../src/app/(app)/(lingocafe)/books/_components/bookshelf.ts";

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

test("parseBookTitle automatically infers volume 1 badge for -01 series books without explicit volume in title", () => {
  // 1. Figures series: volume 1 has no volume in title, volume 2 has "Del 2"
  const figures01 = parseBookTitle(
    "Bakom myten: 20 historiska personer som förändrade världen",
    "figures-01",
    "sv",
    "bakom-myten-sv-b2"
  );
  assert.equal(figures01.mainTitle, "Bakom myten");
  assert.equal(figures01.volumeLabel, "Del 1");

  const figures02 = parseBookTitle(
    "Bakom myten: 20 historiska personer som förändrade världen, Del 2",
    "figures-02",
    "sv",
    "bakom-myten-2-sv-b2"
  );
  assert.equal(figures02.mainTitle, "Bakom myten");
  assert.equal(figures02.volumeLabel, "Del 2");

  // 2. Discoveries series: volume 1 has (Del 1), volume 2 has (Del 2)
  const discoveries01 = parseBookTitle(
    "Stora upptäckter som förändrade världen (Del 1)",
    "discoveries-01",
    "sv"
  );
  assert.equal(discoveries01.mainTitle, "Stora upptäckter som förändrade världen");
  assert.equal(discoveries01.volumeLabel, "Del 1");

  const discoveries02 = parseBookTitle(
    "Stora upptäckter som förändrade världen (Del 2)",
    "discoveries-02",
    "sv"
  );
  assert.equal(discoveries02.mainTitle, "Stora upptäckter som förändrade världen");
  assert.equal(discoveries02.volumeLabel, "Del 2");

  // 3. Startups series: startups-01 infers Del 1, startups-02 parses Volym 2
  const startups01 = parseBookTitle(
    "Från garage till imperium: 20 startups som förändrade världen",
    "startups-01",
    "sv"
  );
  assert.equal(startups01.mainTitle, "Från garage till imperium");
  assert.equal(startups01.volumeLabel, "Del 1");

  const startups02 = parseBookTitle(
    "Från idé till succé: 20 startup-resor som förändrade världen, Volym 2",
    "startups-02",
    "sv"
  );
  assert.equal(startups02.mainTitle, "Från idé till succé");
  assert.equal(startups02.volumeLabel, "Volym 2");

  // 4. Multilingual volume 1 inference (German, English)
  const figuresEn01 = parseBookTitle(
    "Behind the Myth: 20 Historical Figures Who Changed the World",
    "figures-01",
    "en"
  );
  assert.equal(figuresEn01.mainTitle, "Behind the Myth");
  assert.equal(figuresEn01.volumeLabel, "Vol. 1");

  const figuresDe01 = parseBookTitle(
    "Hinter dem Mythos: 20 historische Persönlichkeiten",
    "figures-01",
    "de"
  );
  assert.equal(figuresDe01.mainTitle, "Hinter dem Mythos");
  assert.equal(figuresDe01.volumeLabel, "Band 1");

  // 5. Standalone non-series books do NOT get a volume badge
  const nemo = parseBookTitle(
    "En världsomsegling under havet: Kapten Nemos hemlighet",
    "nemo",
    "sv"
  );
  assert.equal(nemo.mainTitle, "En världsomsegling under havet");
  assert.equal(nemo.volumeLabel, null);

  const dracula = parseBookTitle("Dracula", "dracula", "sv");
  assert.equal(dracula.mainTitle, "Dracula");
  assert.equal(dracula.volumeLabel, null);
});

test("compareBooksForCatalog sorts bookshelf titles strictly alphabetically while preserving volume order", () => {
  const books = [
    makeBook({ id: "vehicles-02", title: "Machines of Motion: Giants of Water", project: "vehicles-02" }),
    makeBook({ id: "dracula", title: "Dracula", project: "dracula" }),
    makeBook({ id: "vehicles-01", title: "Machines of Motion: Iron Rails & Open Roads", project: "vehicles-01" }),
    makeBook({ id: "crusoe", title: "Robinson Crusoe", project: "crusoe" }),
    makeBook({ id: "home-01", title: "The World at Home: Family, Spaces & Everyday Life", project: "home-01" }),
    makeBook({ id: "cities-01", title: "Cities of Wonder: Ancient Marvels", project: "cities-01" }),
  ];

  const sections = buildBookshelfSections(books);
  const titles = sections.catalog.map((b) => b.title);

  assert.deepEqual(titles, [
    "Cities of Wonder: Ancient Marvels",
    "Dracula",
    "Machines of Motion: Iron Rails & Open Roads",
    "Machines of Motion: Giants of Water",
    "Robinson Crusoe",
    "The World at Home: Family, Spaces & Everyday Life",
  ]);
});


