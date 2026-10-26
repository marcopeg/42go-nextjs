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
  `${timestamp()}.production-before-${seedFiles.length}-new-book-editions.dump`;

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
    .filter((seedFile) => BOOK_SEED_FILENAME.test(seedFile));

  if (files.length === 0) {
    fail("no language-and-level book seeds were added after the requested baseline.");
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
      ...inspectBookSeedSource(seedFile, readFileSync(seedPath, "utf8")),
    };
  });
  const duplicateSeedFiles = new Set();
  const duplicateBookIds = new Set();
  const seenSeedFiles = new Set();
  const seenBookIds = new Set();
  for (const seed of seeds) {
    const [bookId] = seed.bookIds;
    if (seenSeedFiles.has(seed.seedFile)) duplicateSeedFiles.add(seed.seedFile);
    if (seenBookIds.has(bookId)) duplicateBookIds.add(bookId);
    seenSeedFiles.add(seed.seedFile);
    seenBookIds.add(bookId);
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
    if (!baseline && existingBookIds.size > 0) {
      fail(`book id already exists in production: ${[...existingBookIds].join(", ")}`);
    }

    const newSeeds = seeds.filter((seed) => !existingBookIds.has(seed.bookIds[0]));
    if (newSeeds.length === 0) {
      console.log("Every requested book edition is already published; the verified backup was retained and no seed ran.");
      return;
    }

    const bookIds = newSeeds.flatMap((seed) => seed.bookIds);
    for (const seed of newSeeds) {
      await runBookSeed(seed.seedFile, databaseUrl);
    }

    const published = await client.query(
      "SELECT id FROM lingocafe.books WHERE id = ANY($1::text[]) ORDER BY id",
      [bookIds]
    );
    if (published.rowCount !== bookIds.length) {
      fail("the seed completed without creating every expected new book.");
    }

    console.log(`Published ${bookIds.length} new production book editions.`);
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
