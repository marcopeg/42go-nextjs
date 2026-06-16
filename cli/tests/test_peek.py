from __future__ import annotations

from pathlib import Path
from typing import Any

import pyarrow as pa
import pyarrow.parquet as pq
from typer.testing import CliRunner

from fortytwogo_cli import peek as peek_module
from fortytwogo_cli.cli import app


runner = CliRunner()


def write_parquet(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pq.write_table(pa.Table.from_pylist(rows), path)


def test_peek_help_is_available() -> None:
    result = runner.invoke(app, ["peek", "--help"])

    assert result.exit_code == 0
    assert "Stream local raw Parquet data through a pager." in result.output
    assert "--data-dir" in result.output
    assert "--pager" in result.output
    assert "-f" in result.output
    assert "-rmc" in result.output


def test_peek_without_args_prompts_folder_and_file(monkeypatch, tmp_path: Path) -> None:
    data_dir = tmp_path / "42go-data"
    users_path = data_dir / "auth" / "users.parquet"
    write_parquet(users_path, [{"id": "u1"}])
    seen: list[Path] = []

    monkeypatch.setattr(peek_module, "stream_parquet_to_pager", lambda path, **kwargs: seen.append(path))

    result = runner.invoke(app, ["peek", "--data-dir", str(data_dir)], input="1\n1\n")

    assert result.exit_code == 0
    assert "Choose data folder" in result.output
    assert "1. auth" in result.output
    assert "Choose Parquet file" in result.output
    assert "1. users" in result.output
    assert seen == [users_path]


def test_peek_folder_prompts_parquet_file(monkeypatch, tmp_path: Path) -> None:
    data_dir = tmp_path / "42go-data"
    accounts_path = data_dir / "auth" / "accounts.parquet"
    write_parquet(accounts_path, [{"account_id": "a1"}])
    seen: list[Path] = []

    monkeypatch.setattr(peek_module, "stream_parquet_to_pager", lambda path, **kwargs: seen.append(path))

    result = runner.invoke(app, ["peek", "--data-dir", str(data_dir), "auth"], input="1\n")

    assert result.exit_code == 0
    assert "Choose Parquet file" in result.output
    assert seen == [accounts_path]


def test_peek_folder_and_table_is_complete_command(monkeypatch, tmp_path: Path) -> None:
    data_dir = tmp_path / "42go-data"
    users_path = data_dir / "auth" / "users.parquet"
    write_parquet(users_path, [{"id": "u1"}])
    seen: list[tuple[Path, str, list[str] | None, str | None]] = []

    monkeypatch.setattr(
        peek_module,
        "stream_parquet_to_pager",
        lambda path, pager="more", filters=None, remove_columns=None: seen.append((path, pager, filters, remove_columns)),
    )

    result = runner.invoke(
        app,
        [
            "peek",
            "--data-dir",
            str(data_dir),
            "--pager",
            "cat",
            "auth",
            "users",
            "-f",
            "app_id=lingocafe",
            "-rmc",
            "image",
        ],
    )

    assert result.exit_code == 0
    assert "Choose" not in result.output
    assert seen == [(users_path, "cat", ["app_id=lingocafe"], "image")]


def test_peek_accepts_explicit_parquet_path(monkeypatch, tmp_path: Path) -> None:
    users_path = tmp_path / "users.parquet"
    write_parquet(users_path, [{"id": "u1"}])
    seen: list[Path] = []

    monkeypatch.setattr(peek_module, "stream_parquet_to_pager", lambda path, **kwargs: seen.append(path))

    result = runner.invoke(app, ["peek", str(users_path)])

    assert result.exit_code == 0
    assert seen == [users_path]


def test_iter_parquet_table_lines_adapts_to_terminal_width(tmp_path: Path) -> None:
    users_path = tmp_path / "users.parquet"
    write_parquet(
        users_path,
        [
            {
                "id": "user-with-a-long-id",
                "name": "John",
                "email": "john.long.email@example.com",
            }
        ],
    )

    lines = list(peek_module.iter_parquet_table_lines(users_path, terminal_width=32))

    assert lines[0].startswith("id")
    assert "name" in lines[0]
    assert "email" in lines[0]
    assert set(lines[1].replace(" | ", "").strip()) == {"-"}
    assert "user-" in lines[2]
    assert "..." in lines[2]
    assert "John" in lines[2]
    assert "john" in lines[2]
    assert all(len(line.rstrip("\n")) <= 32 for line in lines)


def test_iter_parquet_table_lines_filters_and_removes_columns(tmp_path: Path) -> None:
    users_path = tmp_path / "users.parquet"
    write_parquet(
        users_path,
        [
            {"app_id": "lingocafe", "email": "john@gmail.com", "image": "avatar-1", "name": "John"},
            {"app_id": "lingocafe", "email": "jane@example.com", "image": "avatar-2", "name": "Jane"},
            {"app_id": "default", "email": "admin@gmail.com", "image": "avatar-3", "name": "Admin"},
        ],
    )

    lines = list(
        peek_module.iter_parquet_table_lines(
            users_path,
            terminal_width=80,
            filters=["app_id=lingocafe", "email=%@gmail.com"],
            remove_columns="app_id,image",
        )
    )

    output = "".join(lines)
    assert "email" in lines[0]
    assert "name" in lines[0]
    assert "app_id" not in lines[0]
    assert "image" not in lines[0]
    assert "john@gmail.com" in output
    assert "John" in output
    assert "jane@example.com" not in output
    assert "admin@gmail.com" not in output


def test_iter_parquet_table_lines_rejects_unknown_filter_column(tmp_path: Path) -> None:
    users_path = tmp_path / "users.parquet"
    write_parquet(users_path, [{"id": "u1"}])

    try:
        list(peek_module.iter_parquet_table_lines(users_path, filters=["missing=x"]))
    except RuntimeError as error:
        assert "Unknown filter column" in str(error)
    else:
        raise AssertionError("Unknown filter column should fail.")


def test_iter_parquet_table_lines_rejects_unknown_removed_column(tmp_path: Path) -> None:
    users_path = tmp_path / "users.parquet"
    write_parquet(users_path, [{"id": "u1"}])

    try:
        list(peek_module.iter_parquet_table_lines(users_path, remove_columns="missing"))
    except RuntimeError as error:
        assert "Unknown column" in str(error)
    else:
        raise AssertionError("Unknown removed column should fail.")


def test_stream_parquet_to_pager_writes_table_lines(monkeypatch, tmp_path: Path) -> None:
    users_path = tmp_path / "users.parquet"
    write_parquet(users_path, [{"id": "u1", "name": "John"}, {"id": "u2", "name": "Jane"}])
    output: list[str] = []
    commands: list[list[str]] = []

    class FakeStdin:
        def write(self, value: str) -> None:
            output.append(value)

        def close(self) -> None:
            output.append("<closed>")

    class FakeProcess:
        stdin = FakeStdin()

        def __enter__(self) -> "FakeProcess":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def wait(self) -> int:
            return 0

    def fake_popen(command: list[str], **kwargs: object) -> FakeProcess:
        commands.append(command)
        assert kwargs["text"] is True
        return FakeProcess()

    monkeypatch.setattr(peek_module.subprocess, "Popen", fake_popen)

    peek_module.stream_parquet_to_pager(users_path, pager="more")

    assert commands == [["more"]]
    assert any(line.startswith("id") and "name" in line for line in output)
    assert any("u1" in line and "John" in line for line in output)
    assert any("u2" in line and "Jane" in line for line in output)
    assert output[-1] == "<closed>"
