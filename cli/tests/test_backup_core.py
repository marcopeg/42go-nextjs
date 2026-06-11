from __future__ import annotations

from pathlib import Path
import shutil

import pytest

from fortytwogo_cli.backup import core


def table(oid: str, schema: str, name: str) -> core.Table:
    return core.Table(oid=oid, schema=schema, name=name, kind="r", columns=("id",), primary_keys=("id",))


def test_select_tables_light_excludes_heavy_tables_and_dependents() -> None:
    users = table("1", "auth", "users")
    books = table("2", "lingocafe", "books")
    pages = table("3", "lingocafe", "books_pages")
    progress = table("4", "lingocafe", "books_progress")
    quicklist = table("5", "quicklist", "projects")
    catalog = core.Catalog(
        tables=(users, books, pages, progress, quicklist),
        foreign_keys=(
            core.ForeignKey(child_oid=pages.oid, parent_oid=books.oid),
            core.ForeignKey(child_oid=progress.oid, parent_oid=pages.oid),
        ),
    )

    selected, excluded = core.select_tables(catalog, "light")

    assert [core.table_key(item) for item in selected] == ["auth.users", "quicklist.projects"]
    assert {item.name for item in excluded} == {
        "lingocafe.books",
        "lingocafe.books_pages",
        "lingocafe.books_progress",
    }


def test_sort_tables_by_dependency_orders_parents_before_children() -> None:
    parent = table("1", "auth", "users")
    child = table("2", "auth", "accounts")

    ordered = core.sort_tables_by_dependency(
        [child, parent],
        [core.ForeignKey(child_oid=child.oid, parent_oid=parent.oid)],
    )

    assert ordered == [parent, child]


def test_resolve_dump_path_uses_bare_filename_from_dumps_dir(tmp_path: Path) -> None:
    dumps_dir = tmp_path / "backups"
    dumps_dir.mkdir()
    dump = dumps_dir / "20260610T120000Z.dump.light.sql"
    dump.write_text("-- dump")

    assert core.resolve_dump_path(dump.name, dumps_dir) == dump


def test_resolve_dump_path_reports_bare_filename_lookup(tmp_path: Path) -> None:
    with pytest.raises(RuntimeError, match="Also tried"):
        core.resolve_dump_path("missing.dump.light.sql", tmp_path)


def test_list_available_backups_sorts_newest_first(tmp_path: Path) -> None:
    older = tmp_path / "20260609T120000Z.dump.full.sql"
    newer = tmp_path / "20260610T120000Z.dump.light.sql"
    ignored = tmp_path / "notes.txt"
    older.write_text("-- old")
    newer.write_text("-- new")
    ignored.write_text("no")

    assert core.list_available_backups(tmp_path) == [newer, older]


def test_anonymize_connection_string_masks_password() -> None:
    value = "postgres://dbuser:super-secret@localhost:5432/app?sslmode=require"

    masked = core.anonymize_connection_string(value)

    assert masked == "postgres://dbuser:***@localhost:5432/app?sslmode=require"
    assert "super-secret" not in masked


def test_strip_dynamic_notes_tables_and_injects_event_partitions(tmp_path: Path) -> None:
    dump = tmp_path / "dump.sql"
    dump.write_text(
        "\n".join(
            [
                "BEGIN;",
                "TRUNCATE TABLE",
                '  "notes"."notes_123",',
                '  "auth"."users"',
                "RESTART IDENTITY CASCADE;",
                "",
                "-- data: notes.notes_123",
                'INSERT INTO "notes"."notes_123" ("id") VALUES (\'1\');',
                "",
                "-- data: events.events",
                'INSERT INTO "events"."events" ("created_at", "id") VALUES (\'2026-06-10 12:00:00+00\', \'1\');',
                "COMMIT;",
                "",
            ]
        )
    )

    prepared = core.strip_dynamic_notes_tables(dump)
    try:
        content = prepared.dump_path.read_text()
    finally:
        if prepared.cleanup_dir:
            shutil.rmtree(prepared.cleanup_dir, ignore_errors=True)

    assert prepared.stripped_tables == 1
    assert prepared.stripped_data_sections == 1
    assert prepared.event_partitions == 1
    assert '"notes"."notes_123"' not in content
    assert 'CREATE TABLE IF NOT EXISTS "events"."events_202606"' in content
