from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from fortytwogo_cli.events.dependencies import import_duckdb, import_pyarrow
from fortytwogo_cli.events.reads import (
    DEFAULT_COMPLETION_THRESHOLD_BPS,
    load_event_reads,
    stats_book_completion_path,
)
from fortytwogo_cli.events.sessions import load_event_sessions, stats_sessions_path
from fortytwogo_cli.events.users_growth import (
    DEFAULT_STATS_ROOT,
    SourceFileFingerprint,
    parse_datetime,
    safe_app_id,
    source_fingerprints,
)
from fortytwogo_cli.users.paths import resolve_paths as resolve_auth_paths


SUBSCRIBERS_SCHEMA_VERSION = 1
DEFAULT_SUBSCRIBERS_APP_ID = "lingocafe"
DEFAULT_SUBSCRIBERS_LIMIT = 100


@dataclass(frozen=True)
class SubscriberUser:
    app_id: str
    id: str
    name: str | None
    username: str | None
    mail: str
    created_at: str
    own_lang: str | None
    target_lang: str | None
    target_level: str | None
    is_active_7: bool
    is_active_30: bool
    last_session_at: str | None
    last_session_duration: int | None
    total_read_books: int
    total_read_pages: int


@dataclass(frozen=True)
class SubscribersResult:
    archive_dir: Path
    stats_root: Path
    app_id: str
    cache_dir: Path
    users_path: Path
    state_path: Path
    cache_status: str
    source_files: list[SourceFileFingerprint]
    users: list[SubscriberUser]
    total_subscribers: int
    limit: int
    as_of: str
    completion_threshold_bps: int


def stats_cache_dir(stats_root: Path, app_id: str) -> Path:
    return stats_root / safe_app_id(app_id)


def stats_subscribers_users_path(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "query_lingocafe_subscribers_users.parquet"


def stats_subscribers_state_path(stats_root: Path, app_id: str) -> Path:
    return stats_cache_dir(stats_root, app_id) / "query_lingocafe_subscribers_state.parquet"


def _json_object(data: str | None) -> dict[str, Any]:
    if not data:
        return {}
    try:
        payload = json.loads(data)
    except json.JSONDecodeError:
        return {}
    return payload if isinstance(payload, dict) else {}


def _latest_mkt_value(consent: str | None) -> bool:
    payload = _json_object(consent)
    value = payload.get("mkt")
    if isinstance(value, bool):
        return value
    if not isinstance(value, list):
        return False

    choices: list[tuple[datetime, int, bool]] = []
    for index, entry in enumerate(value):
        if not isinstance(entry, dict) or "value" not in entry:
            continue
        changed_at = parse_datetime(entry.get("changedAt")) or datetime.fromtimestamp(index, tz=timezone.utc)
        choices.append((changed_at, index, bool(entry.get("value"))))
    if not choices:
        return False
    return max(choices, key=lambda item: (item[0], item[1]))[2]


def _profile_value(profile: str | None, key: str) -> str | None:
    value = _json_object(profile).get(key)
    if value is None:
        return None
    return str(value)


def _state_matches(state_path: Path, fingerprints: list[SourceFileFingerprint], completion_threshold_bps: int) -> bool:
    if not state_path.exists():
        return False
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        rows = connection.execute(
            """
            SELECT subscribers_schema_version, completion_threshold_bps, source_path, source_size, source_mtime_ns
            FROM read_parquet(?)
            ORDER BY source_path
            """,
            [str(state_path)],
        ).fetchall()
    if not rows:
        return False
    source_files = [
        {
            "path": str(row[2]),
            "size": int(row[3]),
            "mtime_ns": int(row[4]),
        }
        for row in rows
    ]
    return (
        all(int(row[0]) == SUBSCRIBERS_SCHEMA_VERSION and int(row[1]) == completion_threshold_bps for row in rows)
        and source_files == [asdict(fingerprint) for fingerprint in sorted(fingerprints, key=lambda item: item.path)]
    )


def _write_state(
    state_path: Path,
    app_id: str,
    fingerprints: list[SourceFileFingerprint],
    users: list[SubscriberUser],
    as_of: datetime,
    completion_threshold_bps: int,
) -> None:
    pa, pq = import_pyarrow()
    state_path.parent.mkdir(parents=True, exist_ok=True)
    generated_at = datetime.now(timezone.utc).isoformat()
    rows = [
        {
            "subscribers_schema_version": SUBSCRIBERS_SCHEMA_VERSION,
            "app_id": app_id,
            "generated_at": generated_at,
            "as_of": as_of.isoformat(),
            "source_path": fingerprint.path,
            "source_size": fingerprint.size,
            "source_mtime_ns": fingerprint.mtime_ns,
            "subscribers": len(users),
            "completion_threshold_bps": completion_threshold_bps,
        }
        for fingerprint in fingerprints
    ]
    schema = pa.schema(
        [
            ("subscribers_schema_version", pa.int64()),
            ("app_id", pa.string()),
            ("generated_at", pa.string()),
            ("as_of", pa.string()),
            ("source_path", pa.string()),
            ("source_size", pa.int64()),
            ("source_mtime_ns", pa.int64()),
            ("subscribers", pa.int64()),
            ("completion_threshold_bps", pa.int64()),
        ]
    )
    pq.write_table(pa.Table.from_pylist(rows, schema=schema), state_path)


def _write_users(path: Path, rows: list[SubscriberUser]) -> None:
    pa, pq = import_pyarrow()
    path.parent.mkdir(parents=True, exist_ok=True)
    schema = pa.schema(
        [
            ("app_id", pa.string()),
            ("id", pa.string()),
            ("name", pa.string()),
            ("username", pa.string()),
            ("mail", pa.string()),
            ("created_at", pa.string()),
            ("own_lang", pa.string()),
            ("target_lang", pa.string()),
            ("target_level", pa.string()),
            ("is_active_7", pa.bool_()),
            ("is_active_30", pa.bool_()),
            ("last_session_at", pa.string()),
            ("last_session_duration", pa.int64()),
            ("total_read_books", pa.int64()),
            ("total_read_pages", pa.int64()),
        ]
    )
    pq.write_table(pa.Table.from_pylist([asdict(row) for row in rows], schema=schema), path)


def _load_cached_users(path: Path) -> list[SubscriberUser]:
    if not path.exists():
        return []
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        rows = connection.execute(
            """
            SELECT
              app_id,
              id,
              name,
              username,
              mail,
              created_at,
              own_lang,
              target_lang,
              target_level,
              is_active_7,
              is_active_30,
              last_session_at,
              last_session_duration,
              total_read_books,
              total_read_pages
            FROM read_parquet(?)
            ORDER BY created_at DESC, id
            """,
            [str(path)],
        ).fetchall()
    return [
        SubscriberUser(
            app_id=str(row[0]),
            id=str(row[1]),
            name=None if row[2] is None else str(row[2]),
            username=None if row[3] is None else str(row[3]),
            mail=str(row[4]),
            created_at=str(row[5]),
            own_lang=None if row[6] is None else str(row[6]),
            target_lang=None if row[7] is None else str(row[7]),
            target_level=None if row[8] is None else str(row[8]),
            is_active_7=bool(row[9]),
            is_active_30=bool(row[10]),
            last_session_at=None if row[11] is None else str(row[11]),
            last_session_duration=None if row[12] is None else int(row[12]),
            total_read_books=int(row[13]),
            total_read_pages=int(row[14]),
        )
        for row in rows
    ]


def _fetch_subscriber_auth_users(path: Path, app_id: str) -> list[dict[str, Any]]:
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        rows = connection.execute(
            """
            SELECT app_id, id, name, username, email, created_at, profile, consent
            FROM read_parquet(?)
            WHERE app_id = ?
              AND id IS NOT NULL
              AND email IS NOT NULL
              AND created_at IS NOT NULL
            ORDER BY created_at DESC, id
            """,
            [str(path), app_id],
        ).fetchall()
    return [
        {
            "app_id": str(row[0]),
            "id": str(row[1]),
            "name": None if row[2] is None else str(row[2]),
            "username": None if row[3] is None else str(row[3]),
            "mail": str(row[4]),
            "created_at": str(row[5]),
            "profile": None if row[6] is None else str(row[6]),
            "consent": None if row[7] is None else str(row[7]),
        }
        for row in rows
        if _latest_mkt_value(None if row[7] is None else str(row[7]))
    ]


def _fetch_last_sessions(path: Path | None) -> dict[str, tuple[str, int]]:
    if path is None or not path.exists():
        return {}
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        rows = connection.execute(
            """
            WITH ranked AS (
              SELECT
                user_id,
                end_at,
                duration,
                row_number() OVER (PARTITION BY user_id ORDER BY end_at DESC, id DESC) AS rn
              FROM read_parquet(?)
            )
            SELECT user_id, end_at, duration
            FROM ranked
            WHERE rn = 1
            """,
            [str(path)],
        ).fetchall()
    return {str(user_id): (str(end_at), int(duration)) for user_id, end_at, duration in rows}


def _fetch_read_totals(path: Path | None) -> dict[str, tuple[int, int]]:
    if path is None or not path.exists():
        return {}
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        rows = connection.execute(
            """
            SELECT
              user_id,
              count(DISTINCT CASE WHEN opened_pages > 0 THEN book_id END) AS total_read_books,
              coalesce(sum(opened_pages), 0) AS total_read_pages
            FROM read_parquet(?)
            GROUP BY user_id
            """,
            [str(path)],
        ).fetchall()
    return {str(user_id): (int(total_books), int(total_pages)) for user_id, total_books, total_pages in rows}


def _compute_as_of(last_sessions: dict[str, tuple[str, int]]) -> datetime:
    parsed = [parse_datetime(value[0]) for value in last_sessions.values()]
    parsed = [value for value in parsed if value is not None]
    if parsed:
        return max(parsed)
    return datetime.now(timezone.utc)


def _compute_users(
    auth_user_path: Path,
    sessions_path: Path | None,
    read_completion_path: Path | None,
    app_id: str,
) -> tuple[list[SubscriberUser], datetime]:
    auth_users = _fetch_subscriber_auth_users(auth_user_path, app_id)
    last_sessions = _fetch_last_sessions(sessions_path)
    read_totals = _fetch_read_totals(read_completion_path)
    as_of = _compute_as_of(last_sessions)
    active_7_start = as_of - timedelta(days=7)
    active_30_start = as_of - timedelta(days=30)

    rows: list[SubscriberUser] = []
    for user in auth_users:
        last_session = last_sessions.get(user["id"])
        last_session_at = last_session[0] if last_session else None
        last_session_duration = last_session[1] if last_session else None
        parsed_last_session_at = parse_datetime(last_session_at)
        total_read_books, total_read_pages = read_totals.get(user["id"], (0, 0))
        rows.append(
            SubscriberUser(
                app_id=user["app_id"],
                id=user["id"],
                name=user["name"],
                username=user["username"],
                mail=user["mail"],
                created_at=user["created_at"],
                own_lang=_profile_value(user["profile"], "ownLang"),
                target_lang=_profile_value(user["profile"], "targetLang"),
                target_level=_profile_value(user["profile"], "targetLevel"),
                is_active_7=parsed_last_session_at is not None and active_7_start <= parsed_last_session_at <= as_of,
                is_active_30=parsed_last_session_at is not None and active_30_start <= parsed_last_session_at <= as_of,
                last_session_at=last_session_at,
                last_session_duration=last_session_duration,
                total_read_books=total_read_books,
                total_read_pages=total_read_pages,
            )
        )
    return sorted(rows, key=lambda item: (item.created_at, item.id), reverse=True), as_of


def load_lingocafe_subscribers(
    archive_dir: Path | None = None,
    stats_root: Path | None = None,
    limit: int = DEFAULT_SUBSCRIBERS_LIMIT,
    reset: bool = False,
    completion_threshold_bps: int = DEFAULT_COMPLETION_THRESHOLD_BPS,
) -> SubscribersResult | None:
    if limit < 1:
        raise RuntimeError("--limit must be greater than 0")

    app_id = DEFAULT_SUBSCRIBERS_APP_ID
    auth_user_path = resolve_auth_paths(archive_dir).users_parquet
    if not auth_user_path.exists():
        return None

    root = stats_root or DEFAULT_STATS_ROOT
    session_result = load_event_sessions(archive_dir=archive_dir, stats_root=root, app_id_filter=app_id, limit=1, reset=reset)
    reads_result = load_event_reads(
        archive_dir=archive_dir,
        stats_root=root,
        app_id_filter=app_id,
        limit=1,
        completion_threshold_bps=completion_threshold_bps,
        reset=reset,
    )

    cache_dir = stats_cache_dir(root, app_id)
    users_path = stats_subscribers_users_path(root, app_id)
    state_path = stats_subscribers_state_path(root, app_id)
    session_path = stats_sessions_path(root, app_id)
    read_completion_path = stats_book_completion_path(root, app_id)
    has_session_cache = session_result is not None and any(app.app_id == app_id for app in session_result.apps)
    has_read_cache = reads_result is not None and any(app.app_id == app_id for app in reads_result.apps)
    current_session_path = session_path if has_session_cache and session_path.exists() else None
    current_read_completion_path = read_completion_path if has_read_cache and read_completion_path.exists() else None
    source_paths = [
        auth_user_path,
        *[path for path in [current_session_path, current_read_completion_path] if path is not None],
    ]
    fingerprints = source_fingerprints(source_paths)

    if reset:
        users_path.unlink(missing_ok=True)
        state_path.unlink(missing_ok=True)

    cache_status = "rebuilt"
    if not reset and _state_matches(state_path, fingerprints, completion_threshold_bps) and users_path.exists():
        users = _load_cached_users(users_path)
        as_of = _compute_as_of(_fetch_last_sessions(current_session_path))
        cache_status = "cached"
    else:
        users, as_of = _compute_users(auth_user_path, current_session_path, current_read_completion_path, app_id)
        _write_users(users_path, users)
        _write_state(state_path, app_id, fingerprints, users, as_of, completion_threshold_bps)

    return SubscribersResult(
        archive_dir=resolve_auth_paths(archive_dir).root,
        stats_root=root,
        app_id=app_id,
        cache_dir=cache_dir,
        users_path=users_path,
        state_path=state_path,
        cache_status=cache_status,
        source_files=fingerprints,
        users=users[:limit],
        total_subscribers=len(users),
        limit=limit,
        as_of=as_of.isoformat(),
        completion_threshold_bps=completion_threshold_bps,
    )


def lingocafe_subscribers_to_dict(result: SubscribersResult) -> dict[str, Any]:
    return {
        "archive_dir": str(result.archive_dir),
        "stats_root": str(result.stats_root),
        "app_id": result.app_id,
        "cache_dir": str(result.cache_dir),
        "users_path": str(result.users_path),
        "state_path": str(result.state_path),
        "cache_status": result.cache_status,
        "source_files": [asdict(fingerprint) for fingerprint in result.source_files],
        "total_subscribers": result.total_subscribers,
        "limit": result.limit,
        "as_of": result.as_of,
        "completion_threshold_bps": result.completion_threshold_bps,
        "users": [asdict(user) for user in result.users],
    }


def format_lingocafe_subscribers(result: SubscribersResult) -> str:
    lines = [
        "42Go LingoCafe Subscribers",
        "",
        f"Data root: {result.archive_dir}",
        f"Stats root: {result.stats_root}",
        f"App: {result.app_id} ({result.cache_status})",
        f"Cache: {result.cache_dir}",
        f"Cached subscribers: {result.total_subscribers}",
        f"Visible subscriber limit: {result.limit}",
        f"As of: {result.as_of}",
        f"Completion threshold: {result.completion_threshold_bps} bps",
    ]
    if not result.users:
        lines.extend(["", "No active subscribers."])
        return "\n".join(lines)

    headers = [
        "id",
        "name",
        "username",
        "mail",
        "created_at",
        "own_lang",
        "target_lang",
        "target_level",
        "is_active_7",
        "is_active_30",
        "last_session_at",
        "last_session_duration",
        "total_read_books",
        "total_read_pages",
    ]
    lines.extend(["", "\t".join(headers)])
    for user in result.users:
        lines.append(
            "\t".join(
                [
                    user.id,
                    user.name or "",
                    user.username or "",
                    user.mail,
                    user.created_at,
                    user.own_lang or "",
                    user.target_lang or "",
                    user.target_level or "",
                    str(user.is_active_7).lower(),
                    str(user.is_active_30).lower(),
                    user.last_session_at or "",
                    "" if user.last_session_duration is None else str(user.last_session_duration),
                    str(user.total_read_books),
                    str(user.total_read_pages),
                ]
            )
        )
    return "\n".join(lines)


def no_lingocafe_subscribers_message(archive_dir: Path | None = None) -> str:
    auth_user_path = resolve_auth_paths(archive_dir).users_parquet
    return f"No auth users Parquet file found at {auth_user_path}. Run 42go pull auth first."
