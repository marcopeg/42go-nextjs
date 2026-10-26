import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import pg from "pg";

const { Client } = pg;
const require = createRequire(import.meta.url);
const createKnex = require("knex");
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const seedsDirectory = resolve(projectRoot, "knex/seeds");
const backupDirectory = resolve(projectRoot, ".local/42go-backups");
const productionEnvPath = resolve(projectRoot, ".env.prod");

const BOOK_SEED_FILENAME = /^\d{14}\.lingocafe\.[a-z0-9]+(?:-[a-z0-9]+)*-[a-z]{2,3}-(?:a[12]|b[12])\.js$/;
const BOOK_TITLE_METADATA_SEED_FILENAME = /^\d{14}\.lingocafe\.[a-z0-9]+(?:-[a-z0-9]+)*-titles\.js$/;
const BOOK_CATALOG_PUBLICATION_SEED_FILENAME = /^\d{14}\.lingocafe\.catalog-publication\.js$/;
const FORBIDDEN_SEED_OPERATIONS = [
  /\.(?:delete)\s*\(/i,
  /(?:knex|trx)\s*\(/,
  /(?:knex|trx)\.schema\b/i,
  /^\s*import\s/m,
  /^\s*(?:const|let|var)\s+\w+\s*=\s*require\s*\(/m,
];

const fail = (message) => {
  throw new Error(`Production book publish blocked: ${message}`);
};

const getArguments = (name) =>
  process.argv.flatMap((argument, index) => (argument === name ? [process.argv[index + 1]] : [])).filter(Boolean);

const run = (command, args, options = {}) => {
  execFileSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    ...options,
  });
};

const timestamp = () => new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

const backupNameFor = (seedFiles) =>
  `${timestamp()}.production-before-${seedFiles.length}-book-publication-operations.dump`;

const parseBookIds = (source) => {
  const matches = [
    ...source.matchAll(/^\s{2}"id":\s*"([^"]+)",\r?\n\s{2}"project":\s*"[^"]+"/gm),
  ];
  const ids = matches.map((match) => match[1]);

  if (ids.length !== 1) {
    fail("a production book seed must declare exactly one top-level book id.");
  }

  return ids;
};

export const inspectBookSeedSource = (seedFile, source) => {
  if (!BOOK_SEED_FILENAME.test(seedFile)) {
    fail("the seed filename must identify one language-and-level book edition.");
  }

  if (FORBIDDEN_SEED_OPERATIONS.some((pattern) => pattern.test(source))) {
    fail("the seed contains a forbidden destructive operation or non-book schema reference.");
  }

  const rawCalls = source.match(/(?:knex|trx)\.raw\s*\(/g) || [];
  const safeTagArrayRawCalls = source.match(
    /knex\.raw\(\s*"ARRAY\[\?\]::text\[\]"\s*,\s*\[bookData\.tags\]\s*\)/g
  ) || [];
  if (rawCalls.length !== safeTagArrayRawCalls.length) {
    fail("the seed may use knex.raw only for the generated tags text-array value.");
  }

  const tableCalls = [...source.matchAll(/\.table\(\s*([^)]*?)\s*\)/g)];
  if (tableCalls.some((match) => !/^["'][^"']+["']$/.test(match[1]))) {
    fail("table names must be static string literals.");
  }
  const tableNames = tableCalls.map((match) => match[1].slice(1, -1));
  const allowedTables = new Set(["books", "books_pages"]);

  if (
    tableNames.length === 0 ||
    tableNames.some((tableName) => !allowedTables.has(tableName)) ||
    !tableNames.includes("books") ||
    !tableNames.includes("books_pages")
  ) {
    fail("the seed may write only lingocafe.books and lingocafe.books_pages.");
  }

  const schemaCalls = [...source.matchAll(/\.withSchema\(\s*([^)]*?)\s*\)/g)];
  if (schemaCalls.some((match) => !/^["'][^"']+["']$/.test(match[1]))) {
    fail("schema names must be static string literals.");
  }
  const schemaNames = schemaCalls.map((match) => match[1].slice(1, -1));
  if (schemaNames.length === 0 || schemaNames.some((schema) => schema !== "lingocafe")) {
    fail("the seed may use only the lingocafe schema.");
  }

  const pageDeletes = source.match(/\.del\(\s*\)/g) || [];
  const guardedPageDelete = /withSchema\(\s*["']lingocafe["']\s*\)\.table\(\s*["']books_pages["']\s*\)[\s\S]*?\.where\(\s*\{\s*book_id:\s*book\.id\s*\}\s*\)[\s\S]*?\.whereNotIn\(\s*["']id["'][\s\S]*?\.del\(\s*\)/.test(
    source
  );
  if (pageDeletes.length !== 1 || !guardedPageDelete) {
    fail("page cleanup must be the single generated books_pages cleanup scoped to the new book id.");
  }

  return { bookIds: parseBookIds(source) };
};

const parseTitleMetadataUpdates = (source) => {
  const declaration = source.match(/const updates = (\[[\s\S]*?\n\])\s*;?\s*\n\s*exports\.seed/m);
  if (!declaration) {
    fail("a title metadata seed must declare a JSON updates array.");
  }

  let updates;
  try {
    updates = JSON.parse(declaration[1]);
  } catch {
    fail("the title metadata updates array must be valid JSON.");
  }

  if (!Array.isArray(updates) || updates.length === 0) {
    fail("a title metadata seed must contain at least one update.");
  }

  const ids = new Set();
  for (const update of updates) {
    const keys = Object.keys(update || {}).sort().join(",");
    if (
      keys !== "description,id,project,title" ||
      !["id", "project", "title", "description"].every(
        (key) => typeof update[key] === "string" && update[key].trim().length > 0
      ) ||
      ids.has(update.id)
    ) {
      fail("each title metadata update must have one unique id plus project, title, and description strings.");
    }
    ids.add(update.id);
  }

  return updates;
};

export const inspectBookTitleMetadataSeedSource = (seedFile, source) => {
  if (!BOOK_TITLE_METADATA_SEED_FILENAME.test(seedFile)) {
    fail("the metadata seed filename must end in -titles.js.");
  }

  if (
    FORBIDDEN_SEED_OPERATIONS.some((pattern) => pattern.test(source)) ||
    /(?:knex|trx)\.raw\s*\(/i.test(source) ||
    /\.(?:insert|del|delete|onConflict)\s*\(/i.test(source)
  ) {
    fail("the title metadata seed contains a forbidden database operation.");
  }

  const tableCalls = [...source.matchAll(/\.table\(\s*([^)]*?)\s*\)/g)];
  const schemaCalls = [...source.matchAll(/\.withSchema\(\s*([^)]*?)\s*\)/g)];
  if (
    tableCalls.length === 0 ||
    tableCalls.some((match) => match[1] !== "'books'" && match[1] !== '"books"') ||
    schemaCalls.length === 0 ||
    schemaCalls.some((match) => match[1] !== "'lingocafe'" && match[1] !== '"lingocafe"')
  ) {
    fail("the title metadata seed may write only lingocafe.books.");
  }

  const updates = parseTitleMetadataUpdates(source);
  const updateCalls = source.match(/\.update\s*\(/g) || [];
  const isBoundedUpdate =
    /withSchema\(\s*["']lingocafe["']\s*\)\.table\(\s*["']books["']\s*\)[\s\S]*?\.where\(\s*\{\s*id:\s*book\.id\s*,\s*project:\s*book\.project\s*\}\s*\)[\s\S]*?\.update\(\s*\{\s*title:\s*book\.title\s*,\s*description:\s*book\.description\s*,\s*updated_at:\s*knex\.fn\.now\(\)\s*\}\s*\)/.test(
      source
    );
  if (updateCalls.length !== 1 || !isBoundedUpdate) {
    fail("title metadata updates must update only title, description, and updated_at for the exact id/project pair.");
  }

  return {
    bookIds: updates.map((update) => update.id),
    metadataUpdates: updates,
  };
};

export const inspectBookCatalogPublicationSeedSource = (seedFile, source) => {
  if (!BOOK_CATALOG_PUBLICATION_SEED_FILENAME.test(seedFile)) {
    fail("the catalog publication seed filename must end in .lingocafe.catalog-publication.js.");
  }

  if (
    FORBIDDEN_SEED_OPERATIONS.some((pattern) => pattern.test(source)) ||
    /(?:knex|trx)\.raw\s*\(/i.test(source) ||
    /\.(?:insert|del|delete|onConflict)\s*\(/i.test(source)
  ) {
    fail("the catalog publication seed contains a forbidden database operation.");
  }

  const declaration = source.match(/const publication = (\{[\s\S]*?\})\s*;?\s*\n\s*exports\.seed/m);
  if (!declaration) {
    fail("the catalog publication seed must declare a JSON publication object.");
  }

  let publication;
  try {
    publication = JSON.parse(declaration[1]);
  } catch {
    fail("the catalog publication object must be valid JSON.");
  }
  if (
    Object.keys(publication || {}).sort().join(",") !== "publishedAt" ||
    typeof publication.publishedAt !== "string" ||
    new Date(publication.publishedAt).toISOString() !== publication.publishedAt
  ) {
    fail("the catalog publication seed must contain one exact ISO publishedAt timestamp.");
  }

  const tableCalls = [...source.matchAll(/\.table\(\s*([^)]*?)\s*\)/g)];
  const schemaCalls = [...source.matchAll(/\.withSchema\(\s*([^)]*?)\s*\)/g)];
  if (
    tableCalls.length === 0 ||
    tableCalls.some((match) => match[1] !== "'books'" && match[1] !== '"books"') ||
    schemaCalls.length === 0 ||
    schemaCalls.some((match) => match[1] !== "'lingocafe'" && match[1] !== '"lingocafe"')
  ) {
    fail("the catalog publication seed may write only lingocafe.books.");
  }

  const updateCalls = source.match(/\.update\s*\(/g) || [];
  const isBoundedUpdate =
    /withSchema\(\s*["']lingocafe["']\s*\)\s*\.table\(\s*["']books["']\s*\)[\s\S]*?\.whereNull\(\s*["']published_at["']\s*\)[\s\S]*?\.update\(\s*\{\s*published_at:\s*publication\.publishedAt\s*,\s*updated_at:\s*knex\.fn\.now\(\)\s*,?\s*\}\s*\)/.test(
      source
    );
  if (updateCalls.length !== 1 || !isBoundedUpdate) {
    fail("catalog publication must only set published_at and updated_at for books that are not yet published.");
  }

  return { bookIds: [], publicationAt: publication.publishedAt };
};

const inspectProductionBookSeedSource = (seedFile, source) => {
  if (BOOK_SEED_FILENAME.test(seedFile)) {
    return { kind: "new-edition", ...inspectBookSeedSource(seedFile, source) };
  }
  if (BOOK_TITLE_METADATA_SEED_FILENAME.test(seedFile)) {
    return { kind: "title-metadata", ...inspectBookTitleMetadataSeedSource(seedFile, source) };
  }
  if (BOOK_CATALOG_PUBLICATION_SEED_FILENAME.test(seedFile)) {
    return {
      kind: "catalog-publication",
      ...inspectBookCatalogPublicationSeedSource(seedFile, source),
    };
  }
  fail("the seed is not an approved book edition or title metadata operation.");
};

const resolveSeed = (requestedFile) => {
  if (!requestedFile || basename(requestedFile) !== requestedFile) {
    fail("pass one committed seed basename with --file.");
  }

  const seedPath = resolve(seedsDirectory, requestedFile);
  if (!seedPath.startsWith(`${seedsDirectory}/`) || !existsSync(seedPath)) {
    fail("the requested seed does not exist under knex/seeds.");
  }

  try {
    run("git", ["ls-files", "--error-unmatch", "--", relative(projectRoot, seedPath)], {
      stdio: "ignore",
    });
    run("git", ["diff", "--quiet", "--", relative(projectRoot, seedPath)], { stdio: "ignore" });
    run("git", ["diff", "--cached", "--quiet", "--", relative(projectRoot, seedPath)], {
      stdio: "ignore",
    });
  } catch {
    fail("the requested seed must be committed and have no staged or unstaged changes.");
  }

  return seedPath;
};

const resolveSeedsSince = (baseRef) => {
  if (!/^[0-9a-f]{40}$/i.test(baseRef || "")) {
    fail("pass an exact 40-character baseline commit with --all-new-since.");
  }

  let output;
  try {
    run("git", ["merge-base", "--is-ancestor", baseRef, "HEAD"], { stdio: "ignore" });
    output = execFileSync(
      "git",
      ["diff", "--name-only", "--diff-filter=A", `${baseRef}..HEAD`, "--", "knex/seeds"],
      { cwd: projectRoot, encoding: "utf8" }
    );
  } catch {
    fail("the baseline commit must resolve to an ancestor of HEAD.");
  }

  const files = output
    .split("\n")
    .filter(Boolean)
    .map((entry) => basename(entry))
    .filter(
      (seedFile) =>
        BOOK_SEED_FILENAME.test(seedFile) ||
        BOOK_TITLE_METADATA_SEED_FILENAME.test(seedFile) ||
        BOOK_CATALOG_PUBLICATION_SEED_FILENAME.test(seedFile)
    );

  if (files.length === 0) {
    fail("no approved book publication seeds were added after the requested baseline.");
  }

  return files.map(resolveSeed);
};

const loadProductionDatabaseUrl = () => {
  if (!existsSync(productionEnvPath)) {
    fail(".env.prod is required.");
  }

  const parsed = dotenv.parse(readFileSync(productionEnvPath));
  if (!parsed.DATABASE_URL) {
    fail(".env.prod must define DATABASE_URL.");
  }

  return parsed.DATABASE_URL;
};

const createVerifiedBackup = (databaseUrl, seedFiles) => {
  mkdirSync(backupDirectory, { recursive: true });
  const outputPath = resolve(backupDirectory, backupNameFor(seedFiles));

  run("pg_dump", [
    "--format=custom",
    "--no-owner",
    "--no-privileges",
    "--file",
    outputPath,
    databaseUrl,
  ]);
  run("pg_restore", ["--list", outputPath], { stdio: "ignore" });

  console.log(`Verified production backup: ${relative(projectRoot, outputPath)}`);
  return outputPath;
};

const getExistingBookIds = async (client, bookIds) => {
  const result = await client.query(
    "SELECT id FROM lingocafe.books WHERE id = ANY($1::text[]) ORDER BY id",
    [bookIds]
  );

  return new Set(result.rows.map((row) => row.id));
};

const assertMetadataBooksExist = async (client, metadataSeeds) => {
  const updates = metadataSeeds.flatMap((seed) => seed.metadataUpdates);
  if (updates.length === 0) return;

  const result = await client.query(
    "SELECT id, project FROM lingocafe.books WHERE id = ANY($1::text[])",
    [updates.map((update) => update.id)]
  );
  const existingById = new Map(result.rows.map((row) => [row.id, row.project]));
  if (
    existingById.size !== updates.length ||
    updates.some((update) => existingById.get(update.id) !== update.project)
  ) {
    fail("every title metadata update must match one existing production book id and project before any seed runs.");
  }
};

const assertMetadataWasPublished = async (client, metadataSeeds) => {
  const updates = metadataSeeds.flatMap((seed) => seed.metadataUpdates);
  if (updates.length === 0) return;

  const result = await client.query(
    "SELECT id, project, title, description FROM lingocafe.books WHERE id = ANY($1::text[])",
    [updates.map((update) => update.id)]
  );
  const publishedById = new Map(result.rows.map((row) => [row.id, row]));
  if (
    publishedById.size !== updates.length ||
    updates.some((update) => {
      const published = publishedById.get(update.id);
      return (
        !published ||
        published.project !== update.project ||
        published.title !== update.title ||
        published.description !== update.description
      );
    })
  ) {
    fail("the title metadata seed completed without applying every expected books-only update.");
  }
};

const assertCatalogWasPublished = async (client, catalogPublicationSeeds) => {
  if (catalogPublicationSeeds.length === 0) return;

  const result = await client.query(
    "SELECT count(*)::int AS unpublished FROM lingocafe.books WHERE published_at IS NULL"
  );
  if (result.rows[0].unpublished !== 0) {
    fail("the catalog publication seed completed while unpublished books still remain.");
  }
};

const runBookSeed = async (seedFile, databaseUrl) => {
  const seedPath = resolve(seedsDirectory, seedFile);
  const seedModule = require(seedPath);
  if (typeof seedModule.seed !== "function") {
    fail(`${seedFile} does not export a Knex seed function.`);
  }

  const knex = createKnex({
    client: "pg",
    connection: databaseUrl,
    pool: { min: 0, max: 1 },
  });
  try {
    await seedModule.seed(knex);
  } finally {
    await knex.destroy();
  }
};

export const publishProductionBooks = async ({ requestedFiles, baseline }) => {
  if (baseline && requestedFiles.length > 0) {
    fail("use either --file or --all-new-since, never both.");
  }
  const requestedSeedPaths = baseline
    ? resolveSeedsSince(baseline)
    : requestedFiles.map(resolveSeed);
  if (requestedSeedPaths.length === 0) {
    fail("pass at least one seed basename with --file.");
  }

  const seeds = requestedSeedPaths.map((seedPath) => {
    const seedFile = basename(seedPath);
    return {
      seedFile,
      ...inspectProductionBookSeedSource(seedFile, readFileSync(seedPath, "utf8")),
    };
  });
  const duplicateSeedFiles = new Set();
  const duplicateBookIds = new Set();
  const seenSeedFiles = new Set();
  const seenBookIds = new Set();
  for (const seed of seeds) {
    if (seenSeedFiles.has(seed.seedFile)) duplicateSeedFiles.add(seed.seedFile);
    seenSeedFiles.add(seed.seedFile);
    for (const bookId of seed.bookIds) {
      if (seenBookIds.has(bookId)) duplicateBookIds.add(bookId);
      seenBookIds.add(bookId);
    }
  }
  if (duplicateSeedFiles.size > 0 || duplicateBookIds.size > 0) {
    fail("every production publication batch must contain unique seed files and book ids.");
  }

  const databaseUrl = loadProductionDatabaseUrl();
  // The snapshot is deliberately the first production-database operation in
  // this workflow, including before the read that determines which editions
  // are already present. A no-op batch therefore still leaves a fresh,
  // verified recovery point.
  createVerifiedBackup(databaseUrl, seeds.map((seed) => seed.seedFile));
  const client = new Client({ connectionString: databaseUrl });

  await client.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('lingocafe-production-book-publish'))");
    const existingBookIds = await getExistingBookIds(client, seeds.flatMap((seed) => seed.bookIds));
    const metadataSeeds = seeds.filter((seed) => seed.kind === "title-metadata");
    const catalogPublicationSeeds = seeds.filter((seed) => seed.kind === "catalog-publication");
    await assertMetadataBooksExist(client, metadataSeeds);
    if (!baseline && existingBookIds.size > 0) {
      fail(`book id already exists in production: ${[...existingBookIds].join(", ")}`);
    }

    const newSeeds = seeds.filter(
      (seed) => seed.kind === "new-edition" && !existingBookIds.has(seed.bookIds[0])
    );
    if (newSeeds.length === 0 && metadataSeeds.length === 0 && catalogPublicationSeeds.length === 0) {
      console.log("Every requested book edition is already published; the verified backup was retained and no seed ran.");
      return;
    }

    const bookIds = newSeeds.flatMap((seed) => seed.bookIds);
    for (const seed of metadataSeeds) {
      await runBookSeed(seed.seedFile, databaseUrl);
    }
    await assertMetadataWasPublished(client, metadataSeeds);

    for (const seed of newSeeds) {
      await runBookSeed(seed.seedFile, databaseUrl);
    }

    for (const seed of catalogPublicationSeeds) {
      await runBookSeed(seed.seedFile, databaseUrl);
    }
    await assertCatalogWasPublished(client, catalogPublicationSeeds);

    const published = await client.query(
      "SELECT id FROM lingocafe.books WHERE id = ANY($1::text[]) ORDER BY id",
      [bookIds]
    );
    if (published.rowCount !== bookIds.length) {
      fail("the seed completed without creating every expected new book.");
    }

    console.log(`Published ${bookIds.length} new production book editions.`);
    if (catalogPublicationSeeds.length > 0) {
      console.log("Published every book in the production catalog.");
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext('lingocafe-production-book-publish'))").catch(() => {});
    await client.end();
  }
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  publishProductionBooks({
    requestedFiles: getArguments("--file"),
    baseline: getArguments("--all-new-since")[0],
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
