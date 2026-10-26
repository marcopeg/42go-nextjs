import assert from "node:assert/strict";
import test from "node:test";

import {
  inspectBookCatalogPublicationSeedSource,
  inspectBookSeedSource,
  inspectBookTitleMetadataSeedSource,
} from "../scripts/production-book-seed.mjs";

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

const validTitleMetadataSeed = `
const updates = [
  {
    "project": "startups-01",
    "id": "an-existing-startup-en-a2",
    "title": "Startups That Changed the World — Vol. 1",
    "description": "A safe title-only update."
  }
];

exports.seed = async function (knex) {
  await knex.transaction(async (trx) => {
    for (const book of updates) {
      await trx.withSchema('lingocafe').table('books')
        .where({ id: book.id, project: book.project })
        .update({
          title: book.title,
          description: book.description,
          updated_at: knex.fn.now()
        })
    }
  })
}
`;

const validCatalogPublicationSeed = `
const publication = {
  "publishedAt": "2026-10-26T17:45:00.000Z"
};

exports.seed = async function (knex) {
  await knex.transaction(async (trx) => {
    await trx.withSchema('lingocafe').table('books')
      .whereNull('published_at')
      .update({
        published_at: publication.publishedAt,
        updated_at: knex.fn.now(),
      });
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

test("accepts a books-only title metadata update", () => {
  assert.deepEqual(
    inspectBookTitleMetadataSeedSource(
      "20261027120000.lingocafe.startups-titles.js",
      validTitleMetadataSeed
    ),
    {
      bookIds: ["an-existing-startup-en-a2"],
      metadataUpdates: [
        {
          project: "startups-01",
          id: "an-existing-startup-en-a2",
          title: "Startups That Changed the World — Vol. 1",
          description: "A safe title-only update.",
        },
      ],
    }
  );
});

test("rejects a title metadata update that touches book pages", () => {
  assert.throws(
    () =>
      inspectBookTitleMetadataSeedSource(
        "20261027120000.lingocafe.startups-titles.js",
        validTitleMetadataSeed.replace(".table('books')", ".table('books_pages')")
      ),
    /books/
  );
});

test("accepts the bounded books-only catalog publication update", () => {
  assert.deepEqual(
    inspectBookCatalogPublicationSeedSource(
      "20261026190000.lingocafe.catalog-publication.js",
      validCatalogPublicationSeed
    ),
    { bookIds: [], publicationAt: "2026-10-26T17:45:00.000Z" }
  );
});

test("rejects a catalog publication update that touches reader pages", () => {
  assert.throws(
    () =>
      inspectBookCatalogPublicationSeedSource(
        "20261026190000.lingocafe.catalog-publication.js",
        validCatalogPublicationSeed.replace(".table('books')", ".table('books_pages')")
      ),
    /books/
  );
});
