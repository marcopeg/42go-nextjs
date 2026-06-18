from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
import json
from pathlib import Path
from typing import Any, Iterable

from fortytwogo_cli.events.dependencies import import_duckdb, import_pyarrow
from fortytwogo_cli.events.pull import parse_utc
from fortytwogo_cli.query.paths import query_output_path

LINGOCAFE_APP_ID = "lingocafe"

LINGOCAFE_USERS_COLUMNS = [
    "user_id",
    "email",
    "own_lang",
    "target_lang",
    "target_level",
    "is_subscriber",
    "is_active_7d",
    "is_active_30d",
    "last_session_at",
    "total_sessions",
    "session_length_total",
    "session_length_avg",
    "created_at",
]


@dataclass(frozen=True)
class QueryLingocafeUsersOptions:
    query_dir: Path | None = None


def read_json_payload(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if not isinstance(value, str) or not value.strip():
        return {}
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def string_value(value: Any) -> str | None:
    return value if isinstance(value, str) and value else None


def parse_optional_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    try:
        return parse_utc(value)
    except (TypeError, ValueError):
        return None


def latest_consent_value(consent: dict[str, Any], key: str) -> bool:
    entries = consent.get(key)
    if not isinstance(entries, list):
        return False

    choices: list[tuple[datetime, bool]] = []
    for entry in entries:
        if not isinstance(entry, dict) or not isinstance(entry.get("value"), bool):
            continue
        changed_at = parse_optional_datetime(entry.get("changedAt"))
        if changed_at is None:
            continue
        choices.append((changed_at, entry["value"]))
    if not choices:
        return False
    return max(choices, key=lambda choice: choice[0])[1]


def normalize_general_user(row: dict[str, Any]) -> dict[str, Any] | None:
    if row.get("app_id") != LINGOCAFE_APP_ID:
        return None
    profile = read_json_payload(row.get("profile"))
    consent = read_json_payload(row.get("consent"))
    return {
        "user_id": str(row["user_id"]),
        "email": row.get("email"),
        "own_lang": string_value(profile.get("ownLang")),
        "target_lang": string_value(profile.get("targetLang")),
        "target_level": string_value(profile.get("targetLevel")),
        "is_subscriber": latest_consent_value(consent, "mkt"),
        "created_at": parse_optional_datetime(row.get("created_at")),
    }


def read_general_users(query_dir: Path | None) -> list[dict[str, Any]]:
    users_path = query_output_path(["users"], query_dir)
    if not users_path.exists():
        raise RuntimeError(f"Missing users aggregate: run 42go query users first ({users_path}).")
    _pa, pq = import_pyarrow()
    rows: list[dict[str, Any]] = []
    for row in pq.read_table(users_path).to_pylist():
        normalized = normalize_general_user(row)
        if normalized is not None:
            rows.append(normalized)
    return rows


def normalize_session(row: dict[str, Any]) -> dict[str, Any] | None:
    if row.get("app_id") != LINGOCAFE_APP_ID:
        return None
    return {
        "user_id": str(row["user_id"]),
        "ended_at": parse_utc(row["ended_at"]),
        "duration_seconds": int(row["duration_seconds"]),
    }


def read_sessions(query_dir: Path | None) -> list[dict[str, Any]]:
    sessions_path = query_output_path(["sessions"], query_dir)
    if not sessions_path.exists():
        raise RuntimeError(f"Missing sessions aggregate: run 42go query sessions first ({sessions_path}).")
    _pa, pq = import_pyarrow()
    rows: list[dict[str, Any]] = []
    for row in pq.read_table(sessions_path).to_pylist():
        normalized = normalize_session(row)
        if normalized is not None:
            rows.append(normalized)
    return rows


def group_sessions(sessions: Iterable[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for session in sessions:
        grouped.setdefault(session["user_id"], []).append(session)
    return grouped


def build_session_metrics(sessions: list[dict[str, Any]], anchor: datetime | None) -> dict[str, Any]:
    if not sessions or anchor is None:
        return {
            "is_active_7d": False,
            "is_active_30d": False,
            "last_session_at": None,
            "total_sessions": 0,
            "session_length_total": 0,
            "session_length_avg": None,
        }

    last_session_at = max(session["ended_at"] for session in sessions)
    durations = [int(session["duration_seconds"]) for session in sessions]
    sessions_30d = [
        session
        for session in sessions
        if session["ended_at"] >= anchor - timedelta(days=30)
    ]
    durations_30d = [int(session["duration_seconds"]) for session in sessions_30d]
    return {
        "is_active_7d": any(session["ended_at"] >= anchor - timedelta(days=7) for session in sessions),
        "is_active_30d": any(session["ended_at"] >= anchor - timedelta(days=30) for session in sessions),
        "last_session_at": last_session_at,
        "total_sessions": len(sessions),
        "session_length_total": sum(durations),
        "session_length_avg": (sum(durations_30d) / len(durations_30d)) if durations_30d else None,
    }


def build_lingocafe_users(general_users: list[dict[str, Any]], sessions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sessions_by_user = group_sessions(sessions)
    anchor = max((session["ended_at"] for session in sessions), default=None)
    rows: list[dict[str, Any]] = []
    for user in sorted(general_users, key=lambda row: row["user_id"]):
        row = user.copy()
        row.update(build_session_metrics(sessions_by_user.get(row["user_id"], []), anchor))
        rows.append(row)
    return rows


def write_lingocafe_users(path: Path, rows: list[dict[str, Any]]) -> None:
    pa, pq = import_pyarrow()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.unlink(missing_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    schema = pa.schema(
        [
            ("user_id", pa.string()),
            ("email", pa.string()),
            ("own_lang", pa.string()),
            ("target_lang", pa.string()),
            ("target_level", pa.string()),
            ("is_subscriber", pa.bool_()),
            ("is_active_7d", pa.bool_()),
            ("is_active_30d", pa.bool_()),
            ("last_session_at", pa.timestamp("us", tz="UTC")),
            ("total_sessions", pa.int64()),
            ("session_length_total", pa.int64()),
            ("session_length_avg", pa.float64()),
            ("created_at", pa.timestamp("us", tz="UTC")),
        ]
    )
    table = pa.table({column: [row.get(column) for row in rows] for column in LINGOCAFE_USERS_COLUMNS}, schema=schema)
    pq.write_table(table, tmp, compression="zstd")
    tmp.replace(path)


def smoke_read_lingocafe_users(path: Path, expected_rows: int) -> None:
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        count = connection.execute("SELECT count(*) FROM read_parquet(?)", [str(path)]).fetchone()[0]
    if count != expected_rows:
        raise RuntimeError(f"Parquet smoke read failed: expected {expected_rows} LingoCafe users, read {count}.")


def query_lingocafe_users(options: QueryLingocafeUsersOptions) -> dict[str, Any]:
    users = read_general_users(options.query_dir)
    sessions = read_sessions(options.query_dir)
    rows = build_lingocafe_users(users, sessions)
    output_path = query_output_path(["lingocafe", "users"], options.query_dir)
    write_lingocafe_users(output_path, rows)
    smoke_read_lingocafe_users(output_path, len(rows))
    return {
        "users": len(rows),
        "general_users": len(users),
        "sessions": len(sessions),
        "parquet": str(output_path),
    }
