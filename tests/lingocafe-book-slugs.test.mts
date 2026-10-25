import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { decodeReaderSlug } from "../src/lib/lingocafe/slug.ts";

const readSource = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("decodeReaderSlug decodes raw, single-encoded, and double-encoded slugs", () => {
  assert.equal(decodeReaderSlug(null), "");
  assert.equal(decodeReaderSlug(undefined), "");
  assert.equal(decodeReaderSlug(""), "");

  // Plain ASCII
  assert.equal(
    decodeReaderSlug("the-world-at-home-family-spaces-everyday-life-en-b2"),
    "the-world-at-home-family-spaces-everyday-life-en-b2"
  );

  // Swedish slug with 'ä'
  const rawSwedish = "hemmets-värld-familj-rum-och-vardagsliv-sv-b2";
  const encodedSwedish = "hemmets-v%C3%A4rld-familj-rum-och-vardagsliv-sv-b2";
  const doubleEncodedSwedish =
    "hemmets-v%25C3%25A4rld-familj-rum-och-vardagsliv-sv-b2";

  assert.equal(decodeReaderSlug(rawSwedish), rawSwedish);
  assert.equal(decodeReaderSlug(encodedSwedish), rawSwedish);
  assert.equal(decodeReaderSlug(doubleEncodedSwedish), rawSwedish);

  // Array format from Next.js useParams
  assert.equal(decodeReaderSlug([encodedSwedish]), rawSwedish);

  // German slug with 'ä'
  const rawGerman = "die-welt-des-zuhauses-familie-räume-und-alltag-de-b2";
  const encodedGerman =
    "die-welt-des-zuhauses-familie-r%C3%A4ume-und-alltag-de-b2";
  assert.equal(decodeReaderSlug(rawGerman), rawGerman);
  assert.equal(decodeReaderSlug(encodedGerman), rawGerman);

  // Malformed percent doesn't throw
  assert.equal(decodeReaderSlug("test%slug"), "test%slug");
});

test("route handlers and reader helpers import decodeReaderSlug and decode slugs", async () => {
  const [readerSource, bookRouteSource, pageRouteSource, readerPageSource] =
    await Promise.all([
      readSource("src/app/api/(lingocafe)/lingocafe/_lib/reader.ts"),
      readSource("src/app/api/(lingocafe)/lingocafe/books/[bookId]/route.ts"),
      readSource(
        "src/app/api/(lingocafe)/lingocafe/books/[bookId]/pages/[pageId]/route.ts"
      ),
      readSource(
        "src/app/(app)/(lingocafe)/books/_components/BookReaderPage.tsx"
      ),
    ]);

  assert.match(readerSource, /decodeReaderSlug/);
  assert.match(bookRouteSource, /decodeReaderSlug/);
  assert.match(pageRouteSource, /decodeReaderSlug/);
  assert.match(readerPageSource, /decodeReaderSlug/);
});
