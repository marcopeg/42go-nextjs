from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any, Iterable

from fortytwogo_cli.events.dependencies import import_duckdb, import_pyarrow
from fortytwogo_cli.events.pull import parse_utc
from fortytwogo_cli.query.paths import query_output_path
from fortytwogo_cli.users.paths import resolve_paths as resolve_auth_paths
from fortytwogo_cli.users.pull import normalize_user

USER_OUTPUT_COLUMNS = [
    "app_id",
    "user_id",
    "username",
    "name",
    "email",
    "email_verified",
    "image",
    "profile",
    "consent",
    "feature_flags",
    "created_at",
    "updated_at",
    "active_1d",
    "active_7d",
    "active_30d",
    "session_count",
    "session_avg_seconds",
    "session_min_seconds",
    "session_max_seconds",
]


@dataclass(frozen=True)
class QueryUsersOptions:
    data_dir: Path | None = None
    query_dir: Path | None = None


def normalize_auth_user(row: dict[str, Any]) -> dict[str, Any]:
    normalized = normalize_user(row)
    return {
        "app_id": normalized["app_id"],
        "user_id": normalized["id"],
        "username": normalized.get("username"),
        "name": normalized.get("name"),
        "email": normalized.get("email"),
        "email_verified": normalized.get("email_verified"),
        "image": normalized.get("image"),
        "profile": normalized.get("profile"),
        "consent": normalized.get("consent"),
        "feature_flags": normalized.get("feature_flags"),
        "created_at": normalized.get("created_at"),
        "updated_at": normalized.get("updated_at"),
    }


def read_auth_users(data_dir: Path | None) -> list[dict[str, Any]]:
    users_path = resolve_auth_paths(data_dir).users_parquet
    if not users_path.exists():
        return []
    _pa, pq = import_pyarrow()
    return [normalize_auth_user(row) for row in pq.read_table(users_path).to_pylist()]


def normalize_session(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "app_id": str(row["app_id"]),
        "user_id": str(row["user_id"]),
        "ended_at": parse_utc(row["ended_at"]),
        "duration_seconds": int(row["duration_seconds"]),
    }


def read_sessions(query_dir: Path | None) -> list[dict[str, Any]]:
    sessions_path = query_output_path(["sessions"], query_dir)
    if not sessions_path.exists():
        raise RuntimeError(f"Missing sessions aggregate: run 42go query sessions first ({sessions_path}).")
    _pa, pq = import_pyarrow()
    return [normalize_session(row) for row in pq.read_table(sessions_path).to_pylist()]


def group_sessions(sessions: Iterable[dict[str, Any]]) -> dict[tuple[str, str], list[dict[str, Any]]]:
    grouped: dict[tuple[str, str], list[dict[str, Any]]] = {}
    for session in sessions:
        grouped.setdefault((session["app_id"], session["user_id"]), []).append(session)
    return grouped


def build_activity_metrics(sessions: list[dict[str, Any]], anchor: datetime | None) -> dict[str, Any]:
    if not sessions or anchor is None:
        return {
            "active_1d": False,
            "active_7d": False,
            "active_30d": False,
            "session_count": 0,
            "session_avg_seconds": None,
            "session_min_seconds": None,
            "session_max_seconds": None,
        }

    durations = [int(session["duration_seconds"]) for session in sessions]
    return {
        "active_1d": any(session["ended_at"] >= anchor - timedelta(days=1) for session in sessions),
        "active_7d": any(session["ended_at"] >= anchor - timedelta(days=7) for session in sessions),
        "active_30d": any(session["ended_at"] >= anchor - timedelta(days=30) for session in sessions),
        "session_count": len(sessions),
        "session_avg_seconds": sum(durations) / len(durations),
        "session_min_seconds": min(durations),
        "session_max_seconds": max(durations),
    }


def merge_users_and_sessions(users: list[dict[str, Any]], sessions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sessions_by_user = group_sessions(sessions)
    users_by_key = {(user["app_id"], user["user_id"]): user for user in users}
    anchor = max((session["ended_at"] for session in sessions), default=None)

    rows: list[dict[str, Any]] = []
    for app_id, user_id in sorted(users_by_key):
        base = users_by_key[(app_id, user_id)].copy()
        base.update(build_activity_metrics(sessions_by_user.get((app_id, user_id), []), anchor))
        rows.append(base)
    return rows


def write_users(path: Path, rows: list[dict[str, Any]]) -> None:
    pa, pq = import_pyarrow()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.unlink(missing_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    schema = pa.schema(
        [
            ("app_id", pa.string()),
            ("user_id", pa.string()),
            ("username", pa.string()),
            ("name", pa.string()),
            ("email", pa.string()),
            ("email_verified", pa.timestamp("us", tz="UTC")),
            ("image", pa.string()),
            ("profile", pa.string()),
            ("consent", pa.string()),
            ("feature_flags", pa.string()),
            ("created_at", pa.timestamp("us", tz="UTC")),
            ("updated_at", pa.timestamp("us", tz="UTC")),
            ("active_1d", pa.bool_()),
            ("active_7d", pa.bool_()),
            ("active_30d", pa.bool_()),
            ("session_count", pa.int64()),
            ("session_avg_seconds", pa.float64()),
            ("session_min_seconds", pa.int64()),
            ("session_max_seconds", pa.int64()),
        ]
    )
    table = pa.table({column: [row.get(column) for row in rows] for column in USER_OUTPUT_COLUMNS}, schema=schema)
    pq.write_table(table, tmp, compression="zstd")
    tmp.replace(path)


def smoke_read_users(path: Path, expected_rows: int) -> None:
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        count = connection.execute("SELECT count(*) FROM read_parquet(?)", [str(path)]).fetchone()[0]
    if count != expected_rows:
        raise RuntimeError(f"Parquet smoke read failed: expected {expected_rows} users, read {count}.")


def query_users(options: QueryUsersOptions) -> dict[str, Any]:
    users = read_auth_users(options.data_dir)
    sessions = read_sessions(options.query_dir)
    rows = merge_users_and_sessions(users, sessions)
    output_path = query_output_path(["users"], options.query_dir)
    write_users(output_path, rows)
    smoke_read_users(output_path, len(rows))
    return {
        "users": len(rows),
        "auth_users": len(users),
        "sessions": len(sessions),
        "parquet": str(output_path),
    }
