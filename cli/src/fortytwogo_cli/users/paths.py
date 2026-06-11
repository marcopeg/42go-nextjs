from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from fortytwogo_cli.events.paths import load_dotenv_value

DATABASE_URL_ENV_VAR = "DATABASE_URL"
DATA_DIR_ENV_VAR = "FORTYTWOGO_DATA_DIR"
DEFAULT_DATA_DIR = Path(".local/42go-data")


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


def resolve_data_dir(data_dir: str | Path | None = None) -> Path:
    if data_dir:
        return Path(data_dir)
    return Path(os.environ.get(DATA_DIR_ENV_VAR, str(DEFAULT_DATA_DIR)))


def resolve_paths(root: str | Path | None = None) -> AuthExportPaths:
    stats_root = resolve_data_dir(root)
    data_dir = stats_root
    state_dir = stats_root / "_state"
    return AuthExportPaths(
        root=stats_root,
        data_dir=data_dir,
        users_parquet=data_dir / "auth_users.parquet",
        accounts_parquet=data_dir / "auth_accounts.parquet",
        state=state_dir / "auth.json",
    )


def ensure_dirs(paths: AuthExportPaths) -> None:
    paths.data_dir.mkdir(parents=True, exist_ok=True)
    paths.state.parent.mkdir(parents=True, exist_ok=True)
