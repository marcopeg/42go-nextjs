from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
import json
from pathlib import Path
from typing import Any, Iterable
from zoneinfo import ZoneInfo

from fortytwogo_cli.events.dependencies import import_duckdb, import_pyarrow
from fortytwogo_cli.events.paths import parquet_files, resolve_paths
from fortytwogo_cli.events.pull import parse_utc
from fortytwogo_cli.query.lingocafe_users import LINGOCAFE_APP_ID, latest_consent_value, read_json_payload, string_value
from fortytwogo_cli.query.paths import query_output_path

BUCKET_TIMEZONE = ZoneInfo("Europe/Rome")
UNKNOWN_TARGET_LANG = "unknown"
ALL_TARGET_LANG = "all"

LINGOCAFE_GROWTH_COLUMNS = [
    "day",
    "target_lang",
    "total_users",
    "total_subscribers",
    "active_users_1d",
    "active_users_7d",
    "active_users_30d",
]


@dataclass(frozen=True)
class QueryLingocafeGrowthOptions:
    data_dir: Path | None = None
    query_dir: Path | None = None


def local_day(value: datetime) -> date:
    return value.astimezone(BUCKET_TIMEZONE).date()


def day_range(start: date, end: date) -> list[date]:
    days: list[date] = []
    cursor = start
    while cursor <= end:
        days.append(cursor)
        cursor += timedelta(days=1)
    return days


def read_general_users(query_dir: Path | None) -> list[dict[str, Any]]:
    users_path = query_output_path(["users"], query_dir)
    if not users_path.exists():
        raise RuntimeError(f"Missing users aggregate: run 42go query users first ({users_path}).")
    _pa, pq = import_pyarrow()
    rows: list[dict[str, Any]] = []
    for row in pq.read_table(users_path).to_pylist():
        if row.get("app_id") != LINGOCAFE_APP_ID:
            continue
        profile = read_json_payload(row.get("profile"))
        consent = read_json_payload(row.get("consent"))
        rows.append(
            {
                "user_id": str(row["user_id"]),
                "created_at": parse_utc(row["created_at"]),
                "fallback_target_lang": string_value(profile.get("targetLang")),
                "fallback_is_subscriber": latest_consent_value(consent, "mkt"),
                "consent": consent,
            }
        )
    return rows


def read_sessions(query_dir: Path | None) -> list[dict[str, Any]]:
    sessions_path = query_output_path(["sessions"], query_dir)
    if not sessions_path.exists():
        raise RuntimeError(f"Missing sessions aggregate: run 42go query sessions first ({sessions_path}).")
    _pa, pq = import_pyarrow()
    rows: list[dict[str, Any]] = []
    for row in pq.read_table(sessions_path).to_pylist():
        if row.get("app_id") != LINGOCAFE_APP_ID:
            continue
        rows.append(
            {
                "user_id": str(row["user_id"]),
                "day": local_day(parse_utc(row["ended_at"])),
            }
        )
    return rows


def read_lingocafe_events(data_dir: Path | None) -> list[dict[str, Any]]:
    paths = resolve_paths(data_dir)
    files = parquet_files(paths)
    if not files:
        return []

    _pa, pq = import_pyarrow()
    rows: list[dict[str, Any]] = []
    for path in files:
        for row in pq.read_table(path, columns=["app_id", "user_id", "event_at", "name", "data"]).to_pylist():
            if row.get("app_id") != LINGOCAFE_APP_ID or not row.get("user_id") or not row.get("event_at"):
                continue
            rows.append(
                {
                    "user_id": str(row["user_id"]),
                    "event_at": parse_utc(row["event_at"]),
                    "name": row.get("name"),
                    "data": row.get("data"),
                }
            )
    return rows


def extract_profile_changes(events: Iterable[dict[str, Any]]) -> dict[str, list[tuple[date, str]]]:
    changes: dict[str, list[tuple[date, str]]] = {}
    for event in events:
        if event.get("name") not in {"user.profile.created", "user.profile.updated"}:
            continue
        payload = read_json_payload(event.get("data"))
        next_profile = payload.get("next")
        if not isinstance(next_profile, dict):
            continue
        target_lang = string_value(next_profile.get("targetLang"))
        if not target_lang:
            continue
        changes.setdefault(event["user_id"], []).append((local_day(event["event_at"]), target_lang))

    for user_changes in changes.values():
        user_changes.sort(key=lambda item: item[0])
    return changes


def changed_at_day(entry: dict[str, Any], fallback: datetime) -> date | None:
    try:
        value = parse_utc(entry.get("changedAt") or fallback)
    except (TypeError, ValueError):
        return None
    return local_day(value)


def extract_consent_choices_from_payload(payload: dict[str, Any], fallback: datetime) -> list[tuple[date, bool]]:
    next_consent = payload.get("next")
    if not isinstance(next_consent, dict):
        return []
    entries = next_consent.get("mkt")
    if not isinstance(entries, list):
        return []

    choices: list[tuple[date, bool]] = []
    for entry in entries:
        if not isinstance(entry, dict) or not isinstance(entry.get("value"), bool):
            continue
        choice_day = changed_at_day(entry, fallback)
        if choice_day is None:
            continue
        choices.append((choice_day, entry["value"]))
    return choices


def extract_consent_changes(events: Iterable[dict[str, Any]], users: Iterable[dict[str, Any]]) -> dict[str, list[tuple[date, bool]]]:
    changes: dict[str, list[tuple[date, bool]]] = {}
    for event in events:
        if event.get("name") not in {"user.consent.created", "user.consent.updated"}:
            continue
        payload = read_json_payload(event.get("data"))
        for choice in extract_consent_choices_from_payload(payload, event["event_at"]):
            changes.setdefault(event["user_id"], []).append(choice)

    for user in users:
        for choice in consent_choices_from_current_user(user):
            changes.setdefault(user["user_id"], []).append(choice)

    for user_changes in changes.values():
        user_changes.sort(key=lambda item: item[0])
    return changes


def consent_choices_from_current_user(user: dict[str, Any]) -> list[tuple[date, bool]]:
    consent = user.get("consent")
    if not isinstance(consent, dict):
        return []
    entries = consent.get("mkt")
    if not isinstance(entries, list):
        return []

    choices: list[tuple[date, bool]] = []
    for entry in entries:
        if not isinstance(entry, dict) or not isinstance(entry.get("value"), bool):
            continue
        changed_at = entry.get("changedAt")
        if not changed_at:
            continue
        try:
            choices.append((local_day(parse_utc(changed_at)), entry["value"]))
        except (TypeError, ValueError):
            continue
    return choices


def value_as_of(changes: list[tuple[date, Any]], day: date, default: Any) -> Any:
    current = default
    for changed_day, value in changes:
        if changed_day > day:
            break
        current = value
    return current


def target_lang_as_of(user: dict[str, Any], changes: dict[str, list[tuple[date, str]]], day: date) -> str:
    user_changes = changes.get(user["user_id"], [])
    if user_changes:
        return value_as_of(user_changes, day, UNKNOWN_TARGET_LANG)
    fallback = user.get("fallback_target_lang")
    return fallback if fallback and local_day(user["created_at"]) <= day else UNKNOWN_TARGET_LANG


def is_subscriber_as_of(user: dict[str, Any], changes: dict[str, list[tuple[date, bool]]], day: date) -> bool:
    user_changes = changes.get(user["user_id"], [])
    if user_changes:
        return bool(value_as_of(user_changes, day, False))
    return bool(user.get("fallback_is_subscriber")) if local_day(user["created_at"]) <= day else False


def active_users_by_day(sessions: Iterable[dict[str, Any]]) -> dict[date, set[str]]:
    active: dict[date, set[str]] = {}
    for session in sessions:
        active.setdefault(session["day"], set()).add(session["user_id"])
    return active


def rolling_active_users(active_by_day: dict[date, set[str]], day: date, window_days: int) -> set[str]:
    users: set[str] = set()
    for offset in range(window_days):
        users.update(active_by_day.get(day - timedelta(days=offset), set()))
    return users


def build_growth_rows(
    users: list[dict[str, Any]],
    sessions: list[dict[str, Any]],
    profile_changes: dict[str, list[tuple[date, str]]],
    consent_changes: dict[str, list[tuple[date, bool]]],
) -> list[dict[str, Any]]:
    if not users:
        return []

    candidate_days = [local_day(user["created_at"]) for user in users]
    candidate_days.extend(session["day"] for session in sessions)
    candidate_days.extend(day for changes in profile_changes.values() for day, _value in changes)
    candidate_days.extend(day for changes in consent_changes.values() for day, _value in changes)
    days = day_range(min(candidate_days), max(candidate_days))
    active_by_day = active_users_by_day(sessions)

    rows: list[dict[str, Any]] = []
    for day in days:
        created_users = [user for user in users if local_day(user["created_at"]) <= day]
        active_1d_all = active_by_day.get(day, set())
        active_7d_all = rolling_active_users(active_by_day, day, 7)
        active_30d_all = rolling_active_users(active_by_day, day, 30)

        user_state: dict[str, tuple[str, bool]] = {}
        for user in created_users:
            user_state[user["user_id"]] = (
                target_lang_as_of(user, profile_changes, day),
                is_subscriber_as_of(user, consent_changes, day),
            )

        target_langs = sorted({target_lang for target_lang, _subscriber in user_state.values()})
        rows.append(
            build_growth_row(
                day,
                ALL_TARGET_LANG,
                user_state,
                active_1d_all,
                active_7d_all,
                active_30d_all,
            )
        )
        for target_lang in target_langs:
            rows.append(
                build_growth_row(
                    day,
                    target_lang,
                    user_state,
                    active_1d_all,
                    active_7d_all,
                    active_30d_all,
                )
            )
    return rows


def build_growth_row(
    day: date,
    target_lang: str,
    user_state: dict[str, tuple[str, bool]],
    active_1d_all: set[str],
    active_7d_all: set[str],
    active_30d_all: set[str],
) -> dict[str, Any]:
    if target_lang == ALL_TARGET_LANG:
        user_ids = set(user_state)
    else:
        user_ids = {
            user_id
            for user_id, (user_target_lang, _subscriber) in user_state.items()
            if user_target_lang == target_lang
        }
    return {
        "day": day,
        "target_lang": target_lang,
        "total_users": len(user_ids),
        "total_subscribers": sum(1 for user_id in user_ids if user_state[user_id][1]),
        "active_users_1d": len(user_ids & active_1d_all),
        "active_users_7d": len(user_ids & active_7d_all),
        "active_users_30d": len(user_ids & active_30d_all),
    }


def write_growth(path: Path, rows: list[dict[str, Any]]) -> None:
    pa, pq = import_pyarrow()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.unlink(missing_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    schema = pa.schema(
        [
            ("day", pa.date32()),
            ("target_lang", pa.string()),
            ("total_users", pa.int64()),
            ("total_subscribers", pa.int64()),
            ("active_users_1d", pa.int64()),
            ("active_users_7d", pa.int64()),
            ("active_users_30d", pa.int64()),
        ]
    )
    table = pa.table({column: [row.get(column) for row in rows] for column in LINGOCAFE_GROWTH_COLUMNS}, schema=schema)
    pq.write_table(table, tmp, compression="zstd")
    tmp.replace(path)


def smoke_read_growth(path: Path, expected_rows: int) -> None:
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        count = connection.execute("SELECT count(*) FROM read_parquet(?)", [str(path)]).fetchone()[0]
    if count != expected_rows:
        raise RuntimeError(f"Parquet smoke read failed: expected {expected_rows} LingoCafe growth rows, read {count}.")


def query_lingocafe_growth(options: QueryLingocafeGrowthOptions) -> dict[str, Any]:
    users = read_general_users(options.query_dir)
    sessions = read_sessions(options.query_dir)
    events = read_lingocafe_events(options.data_dir)
    profile_changes = extract_profile_changes(events)
    consent_changes = extract_consent_changes(events, users)
    rows = build_growth_rows(users, sessions, profile_changes, consent_changes)
    output_path = query_output_path(["lingocafe", "growth"], options.query_dir)
    write_growth(output_path, rows)
    smoke_read_growth(output_path, len(rows))
    return {
        "rows": len(rows),
        "users": len(users),
        "sessions": len(sessions),
        "events": len(events),
        "parquet": str(output_path),
    }
