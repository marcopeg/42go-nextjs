import assert from "node:assert/strict";
import test from "node:test";

import { inspectBookSeedSource } from "../scripts/production-book-seed.mjs";

const validSeed = `
const books = [
{
  "id": "an-example-book-en-a2",
  "project": "example",
  "pages": []
}
];

exports.seed = async function (knex) {
  await knex.transaction(async (trx) => {
    for (const book of books) {
      await trx.withSchema('lingocafe').table('books').insert(book).onConflict('id').merge(book);
      await trx.withSchema('lingocafe').table('books_pages').where({ book_id: book.id }).select('id');
      await trx.withSchema('lingocafe').table('books_pages')
        .where({ book_id: book.id })
        .whereNotIn('id', book.pages.map((page) => page.id))
        .del();
    }
  });
};
`;

test("accepts one generated new-book seed limited to the books tables", () => {
  assert.deepEqual(
    inspectBookSeedSource("20261027120000.lingocafe.example-en-a2.js", validSeed),
    { bookIds: ["an-example-book-en-a2"] }
  );
});

test("rejects seed files that touch authentication", () => {
  assert.throws(
    () =>
      inspectBookSeedSource(
        "20261027120000.lingocafe.example-en-a2.js",
        validSeed.replace("lingocafe').table('books')", "auth').table('users')")
      ),
    /blocked/
  );
});

test("does not mistake prose ending in a schema-like word for a database reference", () => {
  assert.deepEqual(
    inspectBookSeedSource(
      "20261027120000.lingocafe.example-en-a2.js",
      validSeed.replace('"pages": []', '"pages": [], "description": "Local events."')
    ),
    { bookIds: ["an-example-book-en-a2"] }
  );
});

test("rejects a destructive seed operation", () => {
  assert.throws(
    () =>
      inspectBookSeedSource(
        "20261027120000.lingocafe.example-en-a2.js",
        `${validSeed}\nawait knex.raw('TRUNCATE auth.users');`
      ),
    /blocked/
  );
});

test("rejects arbitrary raw SQL", () => {
  assert.throws(
    () =>
      inspectBookSeedSource(
        "20261027120000.lingocafe.example-en-a2.js",
        validSeed.replace(
          "for (const book of books) {",
          'for (const book of books) { knex.raw("SELECT * FROM auth.users");'
        )
      ),
    /blocked/
  );
});

test("rejects direct table expressions outside the approved schema chain", () => {
  assert.throws(
    () =>
      inspectBookSeedSource(
        "20261027120000.lingocafe.example-en-a2.js",
        validSeed.replace("trx.withSchema('lingocafe').table('books')", "trx('auth.users')")
      ),
    /blocked/
  );
});

test("rejects a seed that could update an existing book identity", () => {
  assert.throws(
    () =>
      inspectBookSeedSource(
        "20261027120000.lingocafe.example-en-a2.js",
        validSeed.replace('"project": "example"', '"title": "No project field"')
      ),
    /exactly one top-level book id/
  );
});

test("rejects a non-edition filename", () => {
  assert.throws(
    () => inspectBookSeedSource("20261027120000.lingocafe.example-titles.js", validSeed),
    /language-and-level/
  );
});
