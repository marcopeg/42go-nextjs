#!/usr/bin/env node

import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env", quiet: true });

const VALID_MODES = new Set(["full", "light"]);
const DUMPS_DIR = path.join(".local", "42go-backups");
const KNEX_TABLES = new Set(["knex_migrations", "knex_migrations_lock"]);

const usage = () => `Usage:
  node .agents/skills/42go-backup/scripts/backup.mjs backup --mode <full|light>
  node .agents/skills/42go-backup/scripts/backup.mjs restore --from <dump.sql>
`;

const fail = (message) => {
  console.error(message);
  console.error("");
  console.error(usage().trimEnd());
  process.exit(1);
};

const parseArgs = (argv) => {
  const args = [...argv];
  const command = args.shift();
  const parsed = { command };

  while (args.length > 0) {
    const key = args.shift();
    const value = args.shift();
    if (!key?.startsWith("--") || value === undefined) {
      fail(`Invalid argument: ${key ?? ""}`);
    }
    parsed[key.slice(2)] = value;
  }

  return parsed;
};

const quoteIdent = (value) => `"${String(value).replaceAll('"', '""')}"`;

const tableKey = (table) => `${table.schema}.${table.name}`;

const tableIdent = (table) => `${quoteIdent(table.schema)}.${quoteIdent(table.name)}`;

const isSystemSchema = (schema) =>
  schema === "pg_catalog" ||
  schema === "information_schema" ||
  schema === "pg_toast" ||
  schema.startsWith("pg_temp_") ||
  schema.startsWith("pg_toast_temp_");

const isBaseLightExclusion = (table) => {
  if (table.schema === "events") {
    return table.name === "events" || table.name.startsWith("events_");
  }

  if (table.schema !== "lingocafe") {
    return false;
  }

  return (
    table.name === "translation_cache" ||
    table.name === "books" ||
    table.name === "books_pages"
  );
};

const isObsoleteLingocafeEventsTable = (table) =>
  table.schema === "lingocafe" &&
  (table.name === "events" || table.name.startsWith("events_"));

const isNonMigrationBackedTable = (table) =>
  table.schema === "notes" && /^notes_\d+$/.test(table.name);

const getBackupDatabaseUrl = () => {
  const value = process.env.BACKUP_DATABASE_URL;
  if (!value) {
    fail("BACKUP_DATABASE_URL is required.");
  }
  return value;
};

const getRestoreDatabaseUrl = () => {
  const value = process.env.RESTORE_DATABASE_URL;
  if (!value) {
    fail("RESTORE_DATABASE_URL is required.");
  }
  return value;
};

const getUtcTimestamp = () =>
  new Date()
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "Z");

const getMonthBounds = (yearMonth) => {
  const [year, month] = yearMonth.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const format = (value) => value.toISOString().slice(0, 10);

  return {
    partitionName: `events_${year}${String(month).padStart(2, "0")}`,
    startDate: format(start),
    endDate: format(end),
  };
};

const renderEventPartitionStatements = (yearMonths) =>
  [...new Set(yearMonths)].sort().map((yearMonth) => {
    const { partitionName, startDate, endDate } = getMonthBounds(yearMonth);
    return `CREATE TABLE IF NOT EXISTS ${quoteIdent("events")}.${quoteIdent(partitionName)} PARTITION OF ${quoteIdent("events")}.${quoteIdent("events")} FOR VALUES FROM ('${startDate} 00:00:00+00') TO ('${endDate} 00:00:00+00');`;
  });

const getEventPartitionMonthsFromDump = (content) => {
  const yearMonths = new Set();
  const eventInsertPattern =
    /^INSERT INTO "events"\."events" \("created_at",.*?\) VALUES \('(\d{4})-(\d{2})-/gm;
  let match = eventInsertPattern.exec(content);

  while (match) {
    yearMonths.add(`${match[1]}-${match[2]}`);
    match = eventInsertPattern.exec(content);
  }

  return [...yearMonths].sort();
};

const loadCatalog = async (client) => {
  const tablesResult = await client.query(`
    SELECT
      c.oid::text AS oid,
      n.nspname AS schema,
      c.relname AS name,
      c.relkind AS kind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p')
      AND c.relispartition = false
      AND n.nspname NOT LIKE 'pg_%'
      AND n.nspname <> 'information_schema'
      AND n.nspname <> 'pg_toast'
    ORDER BY n.nspname, c.relname
  `);

  const columnsResult = await client.query(`
    SELECT
      c.oid::text AS table_oid,
      a.attname AS name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_attribute a ON a.attrelid = c.oid
    WHERE c.relkind IN ('r', 'p')
      AND c.relispartition = false
      AND a.attnum > 0
      AND NOT a.attisdropped
      AND n.nspname NOT LIKE 'pg_%'
      AND n.nspname <> 'information_schema'
      AND n.nspname <> 'pg_toast'
    ORDER BY c.oid::text, a.attnum
  `);

  const primaryKeysResult = await client.query(`
    SELECT
      i.indrelid::text AS table_oid,
      a.attname AS name
    FROM pg_index i
    JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS key_order(attnum, ordinality) ON true
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = key_order.attnum
    WHERE i.indisprimary
    ORDER BY i.indrelid::text, key_order.ordinality
  `);

  const foreignKeysResult = await client.query(`
    SELECT
      conrelid::text AS child_oid,
      confrelid::text AS parent_oid
    FROM pg_constraint
    WHERE contype = 'f'
  `);

  const columnsByOid = new Map();
  for (const row of columnsResult.rows) {
    const columns = columnsByOid.get(row.table_oid) ?? [];
    columns.push(row.name);
    columnsByOid.set(row.table_oid, columns);
  }

  const primaryKeysByOid = new Map();
  for (const row of primaryKeysResult.rows) {
    const primaryKeys = primaryKeysByOid.get(row.table_oid) ?? [];
    primaryKeys.push(row.name);
    primaryKeysByOid.set(row.table_oid, primaryKeys);
  }

  const tables = tablesResult.rows
    .filter((row) => !isSystemSchema(row.schema))
    .map((row) => ({
      oid: row.oid,
      schema: row.schema,
      name: row.name,
      kind: row.kind,
      columns: columnsByOid.get(row.oid) ?? [],
      primaryKeys: primaryKeysByOid.get(row.oid) ?? [],
    }))
    .filter((table) => table.columns.length > 0);

  return {
    tables,
    foreignKeys: foreignKeysResult.rows.map((row) => ({
      childOid: row.child_oid,
      parentOid: row.parent_oid,
    })),
  };
};

const selectTables = ({ tables, foreignKeys }, mode) => {
  const byOid = new Map(tables.map((table) => [table.oid, table]));
  const excluded = new Set();
  const exclusionReasons = new Map();

  for (const table of tables) {
    const key = tableKey(table);
    if (table.schema === "public" && KNEX_TABLES.has(table.name)) {
      excluded.add(table.oid);
      exclusionReasons.set(key, "knex migration metadata");
    } else if (isObsoleteLingocafeEventsTable(table)) {
      excluded.add(table.oid);
      exclusionReasons.set(key, "obsolete LingoCafe event table");
    } else if (isNonMigrationBackedTable(table)) {
      excluded.add(table.oid);
      exclusionReasons.set(key, "not created by migrations");
    } else if (mode === "light" && isBaseLightExclusion(table)) {
      excluded.add(table.oid);
      exclusionReasons.set(key, "light mode exclusion");
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const foreignKey of foreignKeys) {
      if (excluded.has(foreignKey.parentOid) && !excluded.has(foreignKey.childOid)) {
        const child = byOid.get(foreignKey.childOid);
        const parent = byOid.get(foreignKey.parentOid);
        if (child && parent) {
          excluded.add(child.oid);
          exclusionReasons.set(
            tableKey(child),
            `depends on excluded table ${tableKey(parent)}`,
          );
          changed = true;
        }
      }
    }
  }

  return {
    selected: tables.filter((table) => !excluded.has(table.oid)),
    excluded: [...exclusionReasons.entries()]
      .map(([name, reason]) => ({ name, reason }))
      .sort((left, right) => left.name.localeCompare(right.name)),
  };
};

const sortTablesByDependency = (tables, foreignKeys) => {
  const selectedByOid = new Map(tables.map((table) => [table.oid, table]));
  const inDegree = new Map(tables.map((table) => [table.oid, 0]));
  const childrenByParent = new Map(tables.map((table) => [table.oid, []]));

  for (const foreignKey of foreignKeys) {
    if (!selectedByOid.has(foreignKey.childOid) || !selectedByOid.has(foreignKey.parentOid)) {
      continue;
    }
    childrenByParent.get(foreignKey.parentOid).push(foreignKey.childOid);
    inDegree.set(foreignKey.childOid, inDegree.get(foreignKey.childOid) + 1);
  }

  const queue = tables
    .filter((table) => inDegree.get(table.oid) === 0)
    .sort((left, right) => tableKey(left).localeCompare(tableKey(right)));
  const ordered = [];

  while (queue.length > 0) {
    const table = queue.shift();
    ordered.push(table);

    const children = childrenByParent
      .get(table.oid)
      .map((oid) => selectedByOid.get(oid))
      .sort((left, right) => tableKey(left).localeCompare(tableKey(right)));

    for (const child of children) {
      const nextDegree = inDegree.get(child.oid) - 1;
      inDegree.set(child.oid, nextDegree);
      if (nextDegree === 0) {
        queue.push(child);
        queue.sort((left, right) => tableKey(left).localeCompare(tableKey(right)));
      }
    }
  }

  if (ordered.length !== tables.length) {
    const unresolved = tables
      .filter((table) => !ordered.includes(table))
      .map(tableKey)
      .sort()
      .join(", ");
    throw new Error(`Cannot build dependency-safe table order. Cycle or unresolved dependency: ${unresolved}`);
  }

  return ordered;
};

const buildInsertStatements = async (client, table) => {
  const columnList = table.columns.map(quoteIdent).join(", ");
  const valuesExpression = table.columns
    .map((column) => `quote_nullable(${quoteIdent(column)})`)
    .join(", ");
  const orderBy =
    table.primaryKeys.length > 0
      ? ` ORDER BY ${table.primaryKeys.map(quoteIdent).join(", ")}`
      : "";

  const result = await client.query(`
    SELECT
      'INSERT INTO ${tableIdent(table)} (${columnList}) VALUES (' ||
      concat_ws(', ', ${valuesExpression}) ||
      ');' AS statement
    FROM ${tableIdent(table)}
    ${orderBy}
  `);

  return result.rows.map((row) => row.statement);
};

const renderDump = async ({ client, mode, orderedTables, excluded }) => {
  const generatedAt = new Date().toISOString();
  const eventsTable = orderedTables.find(
    (table) => table.schema === "events" && table.name === "events",
  );
  const eventPartitionStatements = [];
  if (eventsTable) {
    const eventMonths = await client.query(`
      SELECT DISTINCT to_char(date_trunc('month', created_at), 'YYYY-MM') AS year_month
      FROM ${tableIdent(eventsTable)}
      ORDER BY year_month
    `);
    eventPartitionStatements.push(
      ...renderEventPartitionStatements(eventMonths.rows.map((row) => row.year_month)),
    );
  }

  const lines = [
    "-- 42go data-only dump",
    `-- generated_at_utc: ${generatedAt}`,
    `-- mode: ${mode}`,
    "-- restore_target: run migrations before executing this file",
    "-- contains: transaction, dependency-safe truncate, dependency-ordered inserts",
    "",
  ];

  if (excluded.length > 0) {
    lines.push("-- excluded tables:");
    for (const item of excluded) {
      lines.push(`-- - ${item.name}: ${item.reason}`);
    }
    lines.push("");
  }

  lines.push("BEGIN;");
  lines.push("");

  if (eventPartitionStatements.length > 0) {
    lines.push("-- event partitions required by dumped event rows");
    lines.push(...eventPartitionStatements);
    lines.push("");
  }

  if (orderedTables.length > 0) {
    lines.push("TRUNCATE TABLE");
    const truncateTables = [...orderedTables].reverse();
    truncateTables.forEach((table, index) => {
      const suffix = index === truncateTables.length - 1 ? "" : ",";
      lines.push(`  ${tableIdent(table)}${suffix}`);
    });
    lines.push("RESTART IDENTITY CASCADE;");
    lines.push("");
  }

  for (const table of orderedTables) {
    lines.push(`-- data: ${tableKey(table)}`);
    const statements = await buildInsertStatements(client, table);
    if (statements.length === 0) {
      lines.push(`-- empty: ${tableKey(table)}`);
    } else {
      lines.push(...statements);
    }
    lines.push("");
  }

  lines.push("COMMIT;");
  lines.push("");

  return lines.join("\n");
};

const backup = async (mode) => {
  if (!VALID_MODES.has(mode)) {
    fail("Backup requires --mode full or --mode light.");
  }

  const client = new Client({ connectionString: getBackupDatabaseUrl() });
  await client.connect();

  try {
    const catalog = await loadCatalog(client);
    const { selected, excluded } = selectTables(catalog, mode);
    const orderedTables = sortTablesByDependency(selected, catalog.foreignKeys);
    const dump = await renderDump({ client, mode, orderedTables, excluded });
    const timestamp = getUtcTimestamp();
    const outputPath = path.join(DUMPS_DIR, `${timestamp}.dump.${mode}.sql`);

    await mkdir(DUMPS_DIR, { recursive: true });
    await writeFile(outputPath, dump, "utf8");

    console.log(`Created ${outputPath}`);
    console.log(`Tables dumped: ${orderedTables.length}`);
    if (excluded.length > 0) {
      console.log(`Tables excluded: ${excluded.length}`);
    }
  } finally {
    await client.end();
  }
};

const canRead = async (filePath) => {
  try {
    await access(filePath, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
};

const resolveDumpPath = async (from) => {
  if (await canRead(from)) {
    return from;
  }

  const shouldTryDumpsDir = !path.isAbsolute(from) && path.dirname(from) === ".";
  if (shouldTryDumpsDir) {
    const dumpsPath = path.join(DUMPS_DIR, from);
    if (await canRead(dumpsPath)) {
      return dumpsPath;
    }

    fail(`Dump file is not readable: ${from}. Also tried ${dumpsPath}.`);
  }

  fail(`Dump file is not readable: ${from}`);
};

const stripDynamicNotesTables = async (dumpPath) => {
  const content = await readFile(dumpPath, "utf8");
  const eventPartitionStatements = renderEventPartitionStatements(
    getEventPartitionMonthsFromDump(content),
  );
  const lines = content.split("\n");
  const output = [];
  let strippedTables = 0;
  let strippedDataSections = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line === "BEGIN;" && eventPartitionStatements.length > 0) {
      output.push(line);
      output.push("");
      output.push("-- event partitions required by dumped event rows");
      output.push(...eventPartitionStatements);
      continue;
    }

    if (line === "TRUNCATE TABLE") {
      const tableLines = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("RESTART IDENTITY")) {
        tableLines.push(lines[index]);
        index += 1;
      }

      const keptTableLines = tableLines.filter((tableLine) => {
        const shouldStrip = /^\s*"notes"\."notes_\d+"[,]?\s*$/.test(tableLine);
        if (shouldStrip) {
          strippedTables += 1;
        }
        return !shouldStrip;
      });

      if (keptTableLines.length > 0) {
        output.push(line);
        keptTableLines.forEach((tableLine, tableIndex) => {
          const normalized = tableLine.replace(/,\s*$/, "");
          const suffix = tableIndex === keptTableLines.length - 1 ? "" : ",";
          output.push(`${normalized}${suffix}`);
        });
        output.push(lines[index]);
      }
      continue;
    }

    if (/^-- data: notes\.notes_\d+$/.test(line)) {
      strippedDataSections += 1;
      index += 1;
      while (
        index < lines.length &&
        !lines[index].startsWith("-- data: ") &&
        lines[index] !== "COMMIT;"
      ) {
        index += 1;
      }
      index -= 1;
      continue;
    }

    output.push(line);
  }

  if (
    strippedTables === 0 &&
    strippedDataSections === 0 &&
    eventPartitionStatements.length === 0
  ) {
    return {
      dumpPath,
      cleanup: async () => {},
      strippedTables,
      strippedDataSections,
      eventPartitions: 0,
    };
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "42go-restore-"));
  const filteredDumpPath = path.join(tempDir, path.basename(dumpPath));
  await writeFile(filteredDumpPath, output.join("\n"), "utf8");

  return {
    dumpPath: filteredDumpPath,
    cleanup: async () => {
      await rm(tempDir, { recursive: true, force: true });
    },
    strippedTables,
    strippedDataSections,
    eventPartitions: eventPartitionStatements.length,
  };
};

const restore = async (from) => {
  if (!from) {
    fail("Restore requires --from <dump.sql>.");
  }
  const restoreDatabaseUrl = getRestoreDatabaseUrl();
  const dumpPath = await resolveDumpPath(from);
  console.log(`Restoring from ${dumpPath}`);
  const preparedDump = await stripDynamicNotesTables(dumpPath);
  if (preparedDump.strippedTables > 0 || preparedDump.strippedDataSections > 0) {
    console.log(
      `Skipping temporary notes tables: ${preparedDump.strippedTables} truncate entries, ${preparedDump.strippedDataSections} data sections`,
    );
  }
  if (preparedDump.eventPartitions > 0) {
    console.log(`Ensuring event partitions: ${preparedDump.eventPartitions}`);
  }

  try {
    await new Promise((resolve, reject) => {
      const child = spawn(
        "psql",
        ["--set", "ON_ERROR_STOP=1", restoreDatabaseUrl, "--file", preparedDump.dumpPath],
        { stdio: "inherit" },
      );
      child.on("error", reject);
      child.on("exit", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`psql exited with code ${code}`));
        }
      });
    });
  } finally {
    await preparedDump.cleanup();
  }
};

const main = async () => {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage().trimEnd());
    return;
  }

  const args = parseArgs(process.argv.slice(2));
  if (args.command === "backup") {
    await backup(args.mode);
    return;
  }

  if (args.command === "restore") {
    await restore(args.from);
    return;
  }

  fail("Expected command: backup or restore.");
};

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
