from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

DATABASE_URL_ENV_VAR = "EVENTS_DATABASE_URL"
ARCHIVE_DIR_ENV_VAR = "EVENTS_ANALYTICS_DIR"
DEFAULT_ARCHIVE_DIR = Path(".local/42go-events")


@dataclass(frozen=True)
class ArchivePaths:
    root: Path
    events: Path
    csv_dir: Path
    parquet_dir: Path
    state: Path
    manifest: Path
    inflight: Path


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


def get_database_url() -> str:
    value = os.environ.get(DATABASE_URL_ENV_VAR) or load_dotenv_value(Path(".env"), DATABASE_URL_ENV_VAR)
    if not value:
        raise RuntimeError(f"{DATABASE_URL_ENV_VAR} is required.")
    return value


def resolve_archive_dir(archive_dir: str | Path | None = None) -> Path:
    if archive_dir:
        return Path(archive_dir)
    return Path(os.environ.get(ARCHIVE_DIR_ENV_VAR, str(DEFAULT_ARCHIVE_DIR)))


def resolve_paths(root: str | Path | None = None) -> ArchivePaths:
    archive_root = resolve_archive_dir(root)
    events = archive_root / "events"
    return ArchivePaths(
        root=archive_root,
        events=events,
        csv_dir=events / "csv",
        parquet_dir=events / "parquet",
        state=events / "state.json",
        manifest=events / "manifest.jsonl",
        inflight=events / "inflight.json",
    )


def ensure_dirs(paths: ArchivePaths) -> None:
    paths.csv_dir.mkdir(parents=True, exist_ok=True)
    paths.parquet_dir.mkdir(parents=True, exist_ok=True)


def parquet_files(paths: ArchivePaths) -> list[Path]:
    if not paths.parquet_dir.exists():
        return []
    return sorted(paths.parquet_dir.glob("*.parquet"))


def parquet_glob(paths: ArchivePaths) -> str:
    return str(paths.parquet_dir / "*.parquet")
