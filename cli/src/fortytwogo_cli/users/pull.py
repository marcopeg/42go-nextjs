from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable

from fortytwogo_cli.events.dependencies import import_duckdb, import_psycopg, import_pyarrow
from fortytwogo_cli.users.paths import AuthExportPaths, ensure_dirs, get_database_url, resolve_paths

DEFAULT_LIMIT = 10000
USER_COLUMNS = [
    "app_id",
    "id",
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
]
ACCOUNT_COLUMNS = [
    "app_id",
    "account_id",
    "user_id",
    "type",
    "provider",
    "scope",
    "token_type",
    "expires_at",
    "created_at",
    "updated_at",
]


@dataclass(frozen=True)
class PullUsersOptions:
    data_dir: Path | None = None
    limit: int = DEFAULT_LIMIT
    database_url_env: str = "BACKUP_DATABASE_URL"
    reset: bool = False
    dry_run: bool = False


def utc_now() -> datetime:
    return datetime.now(UTC)


def iso_utc(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def parse_utc(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.astimezone(UTC)
    if not isinstance(value, str):
        raise TypeError(f"Expected timestamp string or datetime, got {type(value).__name__}.")
    normalized = value.replace("Z", "+00:00")
    parsed = datetime.fromisoformat(normalized)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def json_payload(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def read_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    return json.loads(path.read_text())


def write_json_atomic(path: Path, data: dict[str, Any]) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n")
    tmp.replace(path)


def cursor_from_row(row: dict[str, Any], keys: list[str]) -> list[str]:
    cursor: list[str] = []
    for key in keys:
        value = row[key]
        if isinstance(value, datetime):
            cursor.append(iso_utc(value))
        else:
            cursor.append(str(value))
    return cursor


def load_state(paths: AuthExportPaths, reset: bool) -> dict[str, Any]:
    if reset:
        return {}
    return read_json(paths.state) or {}


def legacy_auth_paths(paths: AuthExportPaths) -> list[Path]:
    return [
        paths.root / "auth_users.parquet",
        paths.root / "auth_accounts.parquet",
        paths.root / "_state" / "auth.json",
    ]


def normalize_user(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "app_id": row["app_id"],
        "id": str(row["id"]),
        "username": row.get("username"),
        "name": row.get("name"),
        "email": row["email"],
        "email_verified": parse_utc(row.get("email_verified")),
        "image": row.get("image"),
        "profile": json_payload(row.get("profile")),
        "consent": json_payload(row.get("consent")),
        "feature_flags": json_payload(row.get("feature_flags")),
        "created_at": parse_utc(row["created_at"]),
        "updated_at": parse_utc(row["updated_at"]),
    }


def normalize_account(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "app_id": row["app_id"],
        "account_id": str(row["account_id"]),
        "user_id": str(row["user_id"]),
        "type": row["type"],
        "provider": row["provider"],
        "scope": row.get("scope"),
        "token_type": row.get("token_type"),
        "expires_at": row.get("expires_at"),
        "created_at": parse_utc(row["created_at"]),
        "updated_at": parse_utc(row["updated_at"]),
    }


def fetch_users(
    database_url: str,
    cursor: list[str] | None,
    limit: int,
) -> list[dict[str, Any]]:
    if limit <= 0:
        raise RuntimeError("--limit must be greater than zero.")

    psycopg, dict_row = import_psycopg()
    sql = """
        SELECT
          app_id,
          id::text AS id,
          username,
          name,
          email,
          email_verified,
          image,
          profile,
          consent,
          feature_flags,
          created_at,
          updated_at
        FROM auth.users
    """
    params: list[Any] = []
    if cursor:
        sql += " WHERE (created_at, id) > (%s::timestamptz, %s)"
        params.extend(cursor)
    sql += " ORDER BY created_at ASC, id ASC LIMIT %s"
    params.append(limit)

    try:
        with psycopg.connect(database_url, row_factory=dict_row) as connection:
            with connection.cursor() as cursor_obj:
                cursor_obj.execute(sql, params)
                return list(cursor_obj.fetchall())
    except Exception as error:
        raise RuntimeError(f"Failed to fetch users from configured database: {error}") from error


def fetch_accounts(
    database_url: str,
    cursor: list[str] | None,
    limit: int,
) -> list[dict[str, Any]]:
    if limit <= 0:
        raise RuntimeError("--limit must be greater than zero.")

    psycopg, dict_row = import_psycopg()
    sql = """
        SELECT
          app_id,
          account_id,
          user_id,
          type,
          provider,
          scope,
          token_type,
          expires_at,
          created_at,
          updated_at
        FROM auth.accounts
    """
    params: list[Any] = []
    if cursor:
        sql += """
            WHERE (created_at, app_id, account_id)
              > (%s::timestamptz, %s, %s)
        """
        params.extend(cursor)
    sql += " ORDER BY created_at ASC, app_id ASC, account_id ASC LIMIT %s"
    params.append(limit)

    try:
        with psycopg.connect(database_url, row_factory=dict_row) as connection:
            with connection.cursor() as cursor_obj:
                cursor_obj.execute(sql, params)
                return list(cursor_obj.fetchall())
    except Exception as error:
        raise RuntimeError(f"Failed to fetch accounts from configured database: {error}") from error


def read_parquet_rows(path: Path, normalizer: Any) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    _pa, pq = import_pyarrow()
    table = pq.read_table(path)
    return [normalizer(row) for row in table.to_pylist()]


def user_schema(pa: Any) -> Any:
    return pa.schema(
        [
            ("app_id", pa.string()),
            ("id", pa.string()),
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
        ]
    )


def account_schema(pa: Any) -> Any:
    return pa.schema(
        [
            ("app_id", pa.string()),
            ("account_id", pa.string()),
            ("user_id", pa.string()),
            ("type", pa.string()),
            ("provider", pa.string()),
            ("scope", pa.string()),
            ("token_type", pa.string()),
            ("expires_at", pa.int64()),
            ("created_at", pa.timestamp("us", tz="UTC")),
            ("updated_at", pa.timestamp("us", tz="UTC")),
        ]
    )


def write_parquet_file(path: Path, rows: list[dict[str, Any]], columns: list[str], schema_factory: Any) -> None:
    pa, pq = import_pyarrow()
    tmp = path.with_suffix(path.suffix + ".tmp")
    schema = schema_factory(pa)
    table = pa.table({column: [row.get(column) for row in rows] for column in columns}, schema=schema)
    pq.write_table(table, tmp, compression="zstd")
    tmp.replace(path)


def smoke_read_parquet(path: Path, expected_rows: int) -> None:
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        count = connection.execute("SELECT count(*) FROM read_parquet(?)", [str(path)]).fetchone()[0]
    if count != expected_rows:
        raise RuntimeError(f"Parquet smoke read failed for {path}: expected {expected_rows} rows, read {count}.")


def sort_users(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(rows, key=lambda row: (row["created_at"], row["id"]))


def sort_accounts(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(rows, key=lambda row: (row["created_at"], row["app_id"], row["account_id"]))


def merge_rows(
    existing_rows: Iterable[dict[str, Any]],
    changed_rows: Iterable[dict[str, Any]],
    key_fn: Any,
    sort_fn: Any,
) -> list[dict[str, Any]]:
    rows_by_key = {key_fn(row): row for row in existing_rows}
    for row in changed_rows:
        rows_by_key[key_fn(row)] = row
    return sort_fn(rows_by_key.values())


def build_state(users: list[dict[str, Any]], accounts: list[dict[str, Any]]) -> dict[str, Any]:
    state: dict[str, Any] = {
        "version": 1,
        "updated_at": iso_utc(utc_now()),
        "users": {"row_count": len(users)},
        "accounts": {"row_count": len(accounts)},
    }
    if users:
        state["users"]["cursor"] = cursor_from_row(users[-1], ["created_at", "id"])
    if accounts:
        state["accounts"]["cursor"] = cursor_from_row(accounts[-1], ["created_at", "app_id", "account_id"])
    return state


def pull_users(options: PullUsersOptions) -> dict[str, Any]:
    database_url = get_database_url(options.database_url_env)
    paths = resolve_paths(options.data_dir)
    ensure_dirs(paths)
    state = load_state(paths, options.reset)
    if options.reset and not options.dry_run:
        paths.users_parquet.unlink(missing_ok=True)
        paths.accounts_parquet.unlink(missing_ok=True)
        paths.state.unlink(missing_ok=True)
        for path in legacy_auth_paths(paths):
            path.unlink(missing_ok=True)
    users_cursor = None if options.reset else state.get("users", {}).get("cursor")
    accounts_cursor = None if options.reset else state.get("accounts", {}).get("cursor")

    raw_users = fetch_users(database_url, users_cursor, options.limit)
    raw_accounts = fetch_accounts(database_url, accounts_cursor, options.limit)
    changed_users = [normalize_user(row) for row in raw_users]
    changed_accounts = [normalize_account(row) for row in raw_accounts]

    existing_users = [] if options.reset else read_parquet_rows(paths.users_parquet, normalize_user)
    existing_accounts = [] if options.reset else read_parquet_rows(paths.accounts_parquet, normalize_account)
    merged_users = merge_rows(existing_users, changed_users, lambda row: row["id"], sort_users)
    merged_accounts = merge_rows(
        existing_accounts,
        changed_accounts,
        lambda row: (row["app_id"], row["account_id"], row["provider"]),
        sort_accounts,
    )

    if options.dry_run:
        return {
            "users_changed": len(changed_users),
            "accounts_changed": len(changed_accounts),
            "users_total": len(merged_users),
            "accounts_total": len(merged_accounts),
            "would_write": bool(options.reset or changed_users or changed_accounts),
        }

    if options.reset or changed_users or not paths.users_parquet.exists():
        write_parquet_file(paths.users_parquet, merged_users, USER_COLUMNS, user_schema)
        smoke_read_parquet(paths.users_parquet, len(merged_users))
    if options.reset or changed_accounts or not paths.accounts_parquet.exists():
        write_parquet_file(paths.accounts_parquet, merged_accounts, ACCOUNT_COLUMNS, account_schema)
        smoke_read_parquet(paths.accounts_parquet, len(merged_accounts))

    write_json_atomic(paths.state, build_state(merged_users, merged_accounts))

    return {
        "users_changed": len(changed_users),
        "accounts_changed": len(changed_accounts),
        "users_total": len(merged_users),
        "accounts_total": len(merged_accounts),
        "users_parquet": str(paths.users_parquet),
        "accounts_parquet": str(paths.accounts_parquet),
        "state": str(paths.state),
        "reset": options.reset,
    }
