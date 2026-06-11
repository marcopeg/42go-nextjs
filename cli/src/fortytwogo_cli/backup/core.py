from __future__ import annotations

import os
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Iterable, Literal
from urllib.parse import urlsplit, urlunsplit

import psycopg
from psycopg.rows import dict_row

BackupMode = Literal["full", "light"]

BACKUP_DATABASE_URL_ENV_VAR = "BACKUP_DATABASE_URL"
RESTORE_DATABASE_URL_ENV_VAR = "RESTORE_DATABASE_URL"
DUMPS_DIR = Path(".local/42go-backups")
VALID_MODES: set[str] = {"full", "light"}
KNEX_TABLES = {"knex_migrations", "knex_migrations_lock"}


@dataclass(frozen=True)
class Table:
    oid: str
    schema: str
    name: str
    kind: str
    columns: tuple[str, ...]
    primary_keys: tuple[str, ...]


@dataclass(frozen=True)
class ForeignKey:
    child_oid: str
    parent_oid: str


@dataclass(frozen=True)
class Catalog:
    tables: tuple[Table, ...]
    foreign_keys: tuple[ForeignKey, ...]


@dataclass(frozen=True)
class ExcludedTable:
    name: str
    reason: str


@dataclass(frozen=True)
class BackupResult:
    output_path: Path
    tables_dumped: int
    tables_excluded: int


@dataclass(frozen=True)
class PreparedDump:
    dump_path: Path
    cleanup_dir: Path | None
    stripped_tables: int
    stripped_data_sections: int
    event_partitions: int


@dataclass(frozen=True)
class RestoreResult:
    dump_path: Path
    stripped_tables: int
    stripped_data_sections: int
    event_partitions: int


def load_dotenv_value(path: Path, key: str) -> str | None:
    if not path.exists():
        return None
    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        if name.strip() != key:
            continue
        value = value.strip().strip('"').strip("'")
        return value or None
    return None


def get_env_value(key: str) -> str:
    value = os.environ.get(key) or load_dotenv_value(Path(".env"), key)
    if not value:
        raise RuntimeError(f"{key} is required.")
    return value


def get_backup_database_url() -> str:
    return get_env_value(BACKUP_DATABASE_URL_ENV_VAR)


def get_restore_database_url() -> str:
    return get_env_value(RESTORE_DATABASE_URL_ENV_VAR)


def anonymize_connection_string(value: str) -> str:
    try:
        parsed = urlsplit(value)
    except ValueError:
        return re.sub(r"(://[^:/@]+:)[^@]+@", r"\1***@", value, count=1)

    if not parsed.netloc or "@" not in parsed.netloc:
        return value

    userinfo, hostinfo = parsed.netloc.rsplit("@", 1)
    if ":" not in userinfo:
        return value

    username, _password = userinfo.split(":", 1)
    return urlunsplit(
        (
            parsed.scheme,
            f"{username}:***@{hostinfo}",
            parsed.path,
            parsed.query,
            parsed.fragment,
        )
    )


def get_utc_timestamp() -> str:
    return datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")


def quote_ident(value: str) -> str:
    return f'"{str(value).replace(chr(34), chr(34) + chr(34))}"'


def table_key(table: Table) -> str:
    return f"{table.schema}.{table.name}"


def table_ident(table: Table) -> str:
    return f"{quote_ident(table.schema)}.{quote_ident(table.name)}"


def is_system_schema(schema: str) -> bool:
    return (
        schema in {"pg_catalog", "information_schema", "pg_toast"}
        or schema.startswith("pg_temp_")
        or schema.startswith("pg_toast_temp_")
    )


def is_base_light_exclusion(table: Table) -> bool:
    if table.schema == "events":
        return table.name == "events" or table.name.startswith("events_")
    if table.schema != "lingocafe":
        return False
    return table.name in {"translation_cache", "books", "books_pages"}


def is_obsolete_lingocafe_events_table(table: Table) -> bool:
    return table.schema == "lingocafe" and (table.name == "events" or table.name.startswith("events_"))


def is_non_migration_backed_table(table: Table) -> bool:
    return table.schema == "notes" and re.fullmatch(r"notes_\d+", table.name) is not None


def get_month_bounds(year_month: str) -> tuple[str, str, str]:
    year_text, month_text = year_month.split("-", 1)
    year = int(year_text)
    month = int(month_text)
    start = datetime(year, month, 1, tzinfo=UTC)
    end = datetime(year + 1, 1, 1, tzinfo=UTC) if month == 12 else datetime(year, month + 1, 1, tzinfo=UTC)
    return f"events_{year}{month:02d}", start.date().isoformat(), end.date().isoformat()


def render_event_partition_statements(year_months: Iterable[str]) -> list[str]:
    statements = []
    for year_month in sorted(set(year_months)):
        partition_name, start_date, end_date = get_month_bounds(year_month)
        statements.append(
            f"CREATE TABLE IF NOT EXISTS {quote_ident('events')}.{quote_ident(partition_name)} "
            f"PARTITION OF {quote_ident('events')}.{quote_ident('events')} "
            f"FOR VALUES FROM ('{start_date} 00:00:00+00') TO ('{end_date} 00:00:00+00');"
        )
    return statements


def get_event_partition_months_from_dump(content: str) -> list[str]:
    months = {
        f"{match.group(1)}-{match.group(2)}"
        for match in re.finditer(
            r'^INSERT INTO "events"\."events" \("created_at",.*?\) VALUES \(\'(\d{4})-(\d{2})-',
            content,
            flags=re.MULTILINE,
        )
    }
    return sorted(months)


def load_catalog(connection: psycopg.Connection) -> Catalog:
    tables_rows = connection.execute(
        """
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
        """
    ).fetchall()
    columns_rows = connection.execute(
        """
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
        """
    ).fetchall()
    primary_key_rows = connection.execute(
        """
        SELECT
          i.indrelid::text AS table_oid,
          a.attname AS name
        FROM pg_index i
        JOIN LATERAL unnest(i.indkey) WITH ORDINALITY AS key_order(attnum, ordinality) ON true
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = key_order.attnum
        WHERE i.indisprimary
        ORDER BY i.indrelid::text, key_order.ordinality
        """
    ).fetchall()
    foreign_key_rows = connection.execute(
        """
        SELECT
          conrelid::text AS child_oid,
          confrelid::text AS parent_oid
        FROM pg_constraint
        WHERE contype = 'f'
        """
    ).fetchall()

    columns_by_oid: dict[str, list[str]] = {}
    for row in columns_rows:
        columns_by_oid.setdefault(row["table_oid"], []).append(row["name"])

    primary_keys_by_oid: dict[str, list[str]] = {}
    for row in primary_key_rows:
        primary_keys_by_oid.setdefault(row["table_oid"], []).append(row["name"])

    tables = tuple(
        Table(
            oid=row["oid"],
            schema=row["schema"],
            name=row["name"],
            kind=row["kind"],
            columns=tuple(columns_by_oid.get(row["oid"], [])),
            primary_keys=tuple(primary_keys_by_oid.get(row["oid"], [])),
        )
        for row in tables_rows
        if not is_system_schema(row["schema"]) and columns_by_oid.get(row["oid"])
    )
    foreign_keys = tuple(ForeignKey(child_oid=row["child_oid"], parent_oid=row["parent_oid"]) for row in foreign_key_rows)
    return Catalog(tables=tables, foreign_keys=foreign_keys)


def select_tables(catalog: Catalog, mode: BackupMode) -> tuple[list[Table], list[ExcludedTable]]:
    tables_by_oid = {table.oid: table for table in catalog.tables}
    excluded: set[str] = set()
    exclusion_reasons: dict[str, str] = {}

    for table in catalog.tables:
        key = table_key(table)
        if table.schema == "public" and table.name in KNEX_TABLES:
            excluded.add(table.oid)
            exclusion_reasons[key] = "knex migration metadata"
        elif is_obsolete_lingocafe_events_table(table):
            excluded.add(table.oid)
            exclusion_reasons[key] = "obsolete LingoCafe event table"
        elif is_non_migration_backed_table(table):
            excluded.add(table.oid)
            exclusion_reasons[key] = "not created by migrations"
        elif mode == "light" and is_base_light_exclusion(table):
            excluded.add(table.oid)
            exclusion_reasons[key] = "light mode exclusion"

    changed = True
    while changed:
        changed = False
        for foreign_key in catalog.foreign_keys:
            if foreign_key.parent_oid in excluded and foreign_key.child_oid not in excluded:
                child = tables_by_oid.get(foreign_key.child_oid)
                parent = tables_by_oid.get(foreign_key.parent_oid)
                if child and parent:
                    excluded.add(child.oid)
                    exclusion_reasons[table_key(child)] = f"depends on excluded table {table_key(parent)}"
                    changed = True

    selected = [table for table in catalog.tables if table.oid not in excluded]
    excluded_tables = [ExcludedTable(name=name, reason=reason) for name, reason in sorted(exclusion_reasons.items())]
    return selected, excluded_tables


def sort_tables_by_dependency(tables: list[Table], foreign_keys: Iterable[ForeignKey]) -> list[Table]:
    selected_by_oid = {table.oid: table for table in tables}
    in_degree = {table.oid: 0 for table in tables}
    children_by_parent = {table.oid: [] for table in tables}

    for foreign_key in foreign_keys:
        if foreign_key.child_oid not in selected_by_oid or foreign_key.parent_oid not in selected_by_oid:
            continue
        children_by_parent[foreign_key.parent_oid].append(foreign_key.child_oid)
        in_degree[foreign_key.child_oid] += 1

    queue = sorted((table for table in tables if in_degree[table.oid] == 0), key=table_key)
    ordered: list[Table] = []

    while queue:
        table = queue.pop(0)
        ordered.append(table)
        children = sorted((selected_by_oid[oid] for oid in children_by_parent[table.oid]), key=table_key)
        for child in children:
            in_degree[child.oid] -= 1
            if in_degree[child.oid] == 0:
                queue.append(child)
                queue.sort(key=table_key)

    if len(ordered) != len(tables):
        unresolved = ", ".join(sorted(table_key(table) for table in tables if table not in ordered))
        raise RuntimeError(f"Cannot build dependency-safe table order. Cycle or unresolved dependency: {unresolved}")
    return ordered


def build_insert_statements(connection: psycopg.Connection, table: Table) -> list[str]:
    column_list = ", ".join(quote_ident(column) for column in table.columns)
    values_expression = ", ".join(f"quote_nullable({quote_ident(column)})" for column in table.columns)
    order_by = f" ORDER BY {', '.join(quote_ident(column) for column in table.primary_keys)}" if table.primary_keys else ""
    query = f"""
        SELECT
          'INSERT INTO {table_ident(table)} ({column_list}) VALUES (' ||
          concat_ws(', ', {values_expression}) ||
          ');' AS statement
        FROM {table_ident(table)}
        {order_by}
    """
    return [row["statement"] for row in connection.execute(query).fetchall()]


def render_dump(
    connection: psycopg.Connection,
    mode: BackupMode,
    ordered_tables: list[Table],
    excluded: list[ExcludedTable],
) -> str:
    generated_at = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    event_partition_statements: list[str] = []
    events_table = next((table for table in ordered_tables if table.schema == "events" and table.name == "events"), None)
    if events_table:
        rows = connection.execute(
            f"""
            SELECT DISTINCT to_char(date_trunc('month', created_at), 'YYYY-MM') AS year_month
            FROM {table_ident(events_table)}
            ORDER BY year_month
            """
        ).fetchall()
        event_partition_statements.extend(render_event_partition_statements(row["year_month"] for row in rows))

    lines = [
        "-- 42go data-only dump",
        f"-- generated_at_utc: {generated_at}",
        f"-- mode: {mode}",
        "-- restore_target: run migrations before executing this file",
        "-- contains: transaction, dependency-safe truncate, dependency-ordered inserts",
        "",
    ]

    if excluded:
        lines.append("-- excluded tables:")
        for item in excluded:
            lines.append(f"-- - {item.name}: {item.reason}")
        lines.append("")

    lines.extend(["BEGIN;", ""])

    if event_partition_statements:
        lines.append("-- event partitions required by dumped event rows")
        lines.extend(event_partition_statements)
        lines.append("")

    if ordered_tables:
        lines.append("TRUNCATE TABLE")
        truncate_tables = list(reversed(ordered_tables))
        for index, table in enumerate(truncate_tables):
            suffix = "" if index == len(truncate_tables) - 1 else ","
            lines.append(f"  {table_ident(table)}{suffix}")
        lines.extend(["RESTART IDENTITY CASCADE;", ""])

    for table in ordered_tables:
        lines.append(f"-- data: {table_key(table)}")
        statements = build_insert_statements(connection, table)
        if statements:
            lines.extend(statements)
        else:
            lines.append(f"-- empty: {table_key(table)}")
        lines.append("")

    lines.extend(["COMMIT;", ""])
    return "\n".join(lines)


def run_backup(mode: BackupMode, dumps_dir: Path = DUMPS_DIR) -> BackupResult:
    if mode not in VALID_MODES:
        raise RuntimeError("Backup mode must be full or light.")

    with psycopg.connect(get_backup_database_url(), row_factory=dict_row) as connection:
        catalog = load_catalog(connection)
        selected, excluded = select_tables(catalog, mode)
        ordered_tables = sort_tables_by_dependency(selected, catalog.foreign_keys)
        dump = render_dump(connection, mode, ordered_tables, excluded)

    timestamp = get_utc_timestamp()
    output_path = dumps_dir / f"{timestamp}.dump.{mode}.sql"
    dumps_dir.mkdir(parents=True, exist_ok=True)
    output_path.write_text(dump)
    return BackupResult(output_path=output_path, tables_dumped=len(ordered_tables), tables_excluded=len(excluded))


def can_read(path: Path) -> bool:
    return path.is_file() and os.access(path, os.R_OK)


def resolve_dump_path(from_value: str | Path, dumps_dir: Path = DUMPS_DIR) -> Path:
    path = Path(from_value)
    if can_read(path):
        return path
    if not path.is_absolute() and path.parent == Path("."):
        dumps_path = dumps_dir / path
        if can_read(dumps_path):
            return dumps_path
        raise RuntimeError(f"Dump file is not readable: {path}. Also tried {dumps_path}.")
    raise RuntimeError(f"Dump file is not readable: {path}")


def list_available_backups(dumps_dir: Path = DUMPS_DIR) -> list[Path]:
    if not dumps_dir.exists():
        return []
    backups = [path for path in dumps_dir.glob("*.dump.*.sql") if path.is_file()]

    def sort_key(path: Path) -> tuple[str, float]:
        match = re.match(r"^(\d{8}T\d{6}Z)\.dump\.(?:full|light)\.sql$", path.name)
        timestamp = match.group(1) if match else ""
        return timestamp, path.stat().st_mtime

    return sorted(backups, key=sort_key, reverse=True)


def strip_dynamic_notes_tables(dump_path: Path) -> PreparedDump:
    content = dump_path.read_text()
    event_partition_statements = render_event_partition_statements(get_event_partition_months_from_dump(content))
    lines = content.split("\n")
    output: list[str] = []
    stripped_tables = 0
    stripped_data_sections = 0
    index = 0

    while index < len(lines):
        line = lines[index]

        if line == "BEGIN;" and event_partition_statements:
            output.append(line)
            output.append("")
            output.append("-- event partitions required by dumped event rows")
            output.extend(event_partition_statements)
            index += 1
            continue

        if line == "TRUNCATE TABLE":
            table_lines: list[str] = []
            index += 1
            while index < len(lines) and not lines[index].startswith("RESTART IDENTITY"):
                table_lines.append(lines[index])
                index += 1

            kept_table_lines = []
            for table_line in table_lines:
                should_strip = re.match(r'^\s*"notes"\."notes_\d+"[,]?\s*$', table_line) is not None
                if should_strip:
                    stripped_tables += 1
                else:
                    kept_table_lines.append(table_line)

            if kept_table_lines:
                output.append(line)
                for table_index, table_line in enumerate(kept_table_lines):
                    normalized = re.sub(r",\s*$", "", table_line)
                    suffix = "" if table_index == len(kept_table_lines) - 1 else ","
                    output.append(f"{normalized}{suffix}")
                if index < len(lines):
                    output.append(lines[index])
            index += 1
            continue

        if re.match(r"^-- data: notes\.notes_\d+$", line):
            stripped_data_sections += 1
            index += 1
            while index < len(lines) and not lines[index].startswith("-- data: ") and lines[index] != "COMMIT;":
                index += 1
            continue

        output.append(line)
        index += 1

    if stripped_tables == 0 and stripped_data_sections == 0 and not event_partition_statements:
        return PreparedDump(
            dump_path=dump_path,
            cleanup_dir=None,
            stripped_tables=stripped_tables,
            stripped_data_sections=stripped_data_sections,
            event_partitions=0,
        )

    cleanup_dir = Path(tempfile.mkdtemp(prefix="42go-restore-"))
    filtered_dump_path = cleanup_dir / dump_path.name
    filtered_dump_path.write_text("\n".join(output))
    return PreparedDump(
        dump_path=filtered_dump_path,
        cleanup_dir=cleanup_dir,
        stripped_tables=stripped_tables,
        stripped_data_sections=stripped_data_sections,
        event_partitions=len(event_partition_statements),
    )


def run_psql_restore(restore_database_url: str, dump_path: Path) -> None:
    result = subprocess.run(
        ["psql", "--set", "ON_ERROR_STOP=1", restore_database_url, "--file", str(dump_path)],
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"psql exited with code {result.returncode}")


def run_restore(from_value: str | Path, dumps_dir: Path = DUMPS_DIR) -> RestoreResult:
    restore_database_url = get_restore_database_url()
    dump_path = resolve_dump_path(from_value, dumps_dir)
    prepared_dump = strip_dynamic_notes_tables(dump_path)

    try:
        run_psql_restore(restore_database_url, prepared_dump.dump_path)
    finally:
        if prepared_dump.cleanup_dir:
            shutil.rmtree(prepared_dump.cleanup_dir, ignore_errors=True)

    return RestoreResult(
        dump_path=dump_path,
        stripped_tables=prepared_dump.stripped_tables,
        stripped_data_sections=prepared_dump.stripped_data_sections,
        event_partitions=prepared_dump.event_partitions,
    )
