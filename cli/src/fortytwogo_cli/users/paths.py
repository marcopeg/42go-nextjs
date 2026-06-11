from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from fortytwogo_cli.events.paths import load_dotenv_value

DATABASE_URL_ENV_VAR = "DATABASE_URL"
STATS_DIR_ENV_VAR = "FORTYTWOGO_STATS_DIR"
DEFAULT_STATS_DIR = Path(".local/42go-stats")


@dataclass(frozen=True)
class AuthExportPaths:
    root: Path
    data_dir: Path
    users_parquet: Path
    accounts_parquet: Path
    state: Path


def get_database_url(database_url_env: str = DATABASE_URL_ENV_VAR) -> str:
    value = os.environ.get(database_url_env) or load_dotenv_value(Path(".env"), database_url_env)
    if not value:
        raise RuntimeError(f"{database_url_env} is required.")
    return value


def resolve_stats_dir(stats_dir: str | Path | None = None) -> Path:
    if stats_dir:
        return Path(stats_dir)
    return Path(os.environ.get(STATS_DIR_ENV_VAR, str(DEFAULT_STATS_DIR)))


def resolve_paths(root: str | Path | None = None) -> AuthExportPaths:
    stats_root = resolve_stats_dir(root)
    data_dir = stats_root / "_data"
    return AuthExportPaths(
        root=stats_root,
        data_dir=data_dir,
        users_parquet=data_dir / "auth_users.parquet",
        accounts_parquet=data_dir / "auth_accounts.parquet",
        state=data_dir / "auth_pull_state.json",
    )


def ensure_dirs(paths: AuthExportPaths) -> None:
    paths.data_dir.mkdir(parents=True, exist_ok=True)
