from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
import json
import os
from pathlib import Path
import random
from typing import Any, Callable
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fortytwogo_cli.events.dependencies import import_duckdb, import_pyarrow
from fortytwogo_cli.events.paths import resolve_data_dir
from fortytwogo_cli.events.pull import parse_utc
from fortytwogo_cli.query.paths import query_output_path, resolve_query_dir
from fortytwogo_cli.users.paths import load_dotenv_value

LINGOCAFE_APP_ID = "lingocafe"
DEFAULT_WHITELIST_EMAIL = "marco.pegoraro@gmail.com"
SEND_TO_ALL_SENTINEL = "send to all"
READ_RECENCY_HOURS = 24
EMAIL_COOLDOWN_HOURS = 72
NEXT_PAGE_THRESHOLD_BPS = 9000
DEFAULT_BASE_URL = "https://read.lingocafe.app"
DEFAULT_FROM = "LingoCafe <marco@lingocafe.app>"
RESEND_EMAILS_URL = "https://api.resend.com/emails"

LEVEL_ORDER = ["a1", "a2", "b1", "b2", "c1", "c2"]

SENT_EMAIL_COLUMNS = [
    "run_id",
    "user_id",
    "recipient_email",
    "sent_at",
    "recommendation_type",
    "reading_tip",
    "book_id",
    "page_id",
    "target_link",
    "subject",
    "body",
    "sender_status",
    "sender_message_id",
    "error",
]


@dataclass(frozen=True)
class ReadTipPaths:
    data_dir: Path
    query_dir: Path
    users_path: Path
    lingocafe_users_path: Path
    books_path: Path
    pages_path: Path
    progress_path: Path
    sent_emails_path: Path
    whitelist_path: Path


@dataclass(frozen=True)
class ReadTipOptions:
    data_dir: Path | None = None
    query_dir: Path | None = None
    whitelist_path: Path | None = None
    sent_emails_path: Path | None = None
    dry_run: bool = True
    send: bool = False
    base_url: str = DEFAULT_BASE_URL
    now: datetime | None = None
    resend_api_key: str | None = None
    from_email: str = DEFAULT_FROM
    random_seed: int = 42
    reset: bool = False
    max_recipients: int = 1


@dataclass(frozen=True)
class Recommendation:
    recommendation_type: str
    reading_tip: str
    book_id: str | None
    page_id: str | None
    target_link: str
    subject: str
    body: str


@dataclass(frozen=True)
class Decision:
    user_id: str
    email: str | None
    status: str
    reason: str
    last_read_at: datetime | None = None
    recommendation: Recommendation | None = None


@dataclass(frozen=True)
class ReadTipResult:
    mode: str
    whitelist_mode: str
    decisions: list[Decision]
    sent_records: list[dict[str, Any]]
    sent_log_path: Path


def utc_now() -> datetime:
    return datetime.now(UTC)


def normalize_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    parsed = parse_utc(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def resolve_paths(options: ReadTipOptions) -> ReadTipPaths:
    data_dir = resolve_data_dir(options.data_dir)
    query_dir = resolve_query_dir(options.query_dir)
    email_root = data_dir / "lingocafe_daily_email"
    return ReadTipPaths(
        data_dir=data_dir,
        query_dir=query_dir,
        users_path=data_dir / "auth" / "users.parquet",
        lingocafe_users_path=query_output_path(["lingocafe", "users"], query_dir),
        books_path=data_dir / "lingocafe" / "books.parquet",
        pages_path=data_dir / "lingocafe" / "books_pages.parquet",
        progress_path=data_dir / "lingocafe" / "books_progress.parquet",
        sent_emails_path=options.sent_emails_path or email_root / "sent_emails.parquet",
        whitelist_path=options.whitelist_path or email_root / "whitelist.txt",
    )


def read_parquet_rows(path: Path, *, required: bool = True) -> list[dict[str, Any]]:
    if not path.exists():
        if required:
            raise RuntimeError(f"Missing required Parquet file: {path}")
        return []
    _pa, pq = import_pyarrow()
    return pq.read_table(path).to_pylist()


def ensure_default_whitelist(path: Path) -> None:
    if path.exists():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(f"{DEFAULT_WHITELIST_EMAIL}\n")


def read_whitelist(path: Path) -> tuple[str, set[str]]:
    ensure_default_whitelist(path)
    lines = [line.strip() for line in path.read_text().splitlines() if line.strip()]
    if len(lines) == 1 and lines[0] == SEND_TO_ALL_SENTINEL:
        return ("send_to_all", set())
    return ("explicit", {line.lower() for line in lines})


def load_env_value(key: str) -> str | None:
    return os.environ.get(key) or load_dotenv_value(Path(".env"), key)


def normalize_base_url(base_url: str) -> str:
    return base_url.rstrip("/")


def reader_link(base_url: str, book_id: str, page_id: str | None = None) -> str:
    root = normalize_base_url(base_url)
    if page_id:
        return f"{root}/books/{book_id}/{page_id}"
    return f"{root}/books/{book_id}"


def group_by_user(rows: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        grouped.setdefault(str(row["user_id"]), []).append(row)
    return grouped


def page_maps(pages: list[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for page in pages:
        grouped.setdefault(str(page["book_id"]), []).append(page)
    for book_pages in grouped.values():
        book_pages.sort(key=lambda row: (int(row["position"]), str(row["id"])))
    return grouped


def book_by_id(books: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {str(book["id"]): book for book in books}


def latest_progress(progress_rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not progress_rows:
        return None
    return max(progress_rows, key=lambda row: normalize_datetime(row.get("updated_at")) or datetime.min.replace(tzinfo=UTC))


def is_complete_progress(progress: dict[str, Any]) -> bool:
    return progress.get("completed_at") is not None or int(progress.get("progress_bps") or 0) >= 10000


def latest_incomplete_progress(progress_rows: list[dict[str, Any]]) -> dict[str, Any] | None:
    incomplete = [row for row in progress_rows if not is_complete_progress(row)]
    return latest_progress(incomplete)


def next_page_id(book_pages: list[dict[str, Any]], page_id: str) -> str | None:
    for index, page in enumerate(book_pages):
        if str(page["id"]) != page_id:
            continue
        if index + 1 < len(book_pages):
            return str(book_pages[index + 1]["id"])
        return None
    return None


def parse_level_index(level: Any) -> int | None:
    if not isinstance(level, str):
        return None
    lowered = level.strip().lower()
    return LEVEL_ORDER.index(lowered) if lowered in LEVEL_ORDER else None


def sort_books_newest(books: list[dict[str, Any]]) -> list[dict[str, Any]]:
    def key(book: dict[str, Any]) -> tuple[float, str]:
        published = normalize_datetime(book.get("published_at")) or datetime.min.replace(tzinfo=UTC)
        return (-published.timestamp(), str(book.get("title") or ""))

    return sorted(books, key=key)


def unread_books_for_user(books: list[dict[str, Any]], progress_rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    read_book_ids = {str(row["book_id"]) for row in progress_rows}
    return [book for book in books if str(book["id"]) not in read_book_ids]


def choose_unread_book(
    *,
    user_profile: dict[str, Any] | None,
    books: list[dict[str, Any]],
    progress_rows: list[dict[str, Any]],
    rng: random.Random,
) -> dict[str, Any] | None:
    unread = unread_books_for_user(books, progress_rows)
    target_lang = (user_profile or {}).get("target_lang")
    target_level = (user_profile or {}).get("target_level")
    if not target_lang:
        return sort_books_newest(unread)[0] if unread else None

    same_lang = [book for book in unread if book.get("lang") == target_lang]
    if not same_lang:
        return None

    same_level = [book for book in same_lang if book.get("level") == target_level]
    if same_level:
        return sort_books_newest(same_level)[0]

    target_index = parse_level_index(target_level)
    if target_index is not None:
        higher = [
            book
            for book in same_lang
            if (book_index := parse_level_index(book.get("level"))) is not None and book_index > target_index
        ]
        if higher:
            return min(
                sort_books_newest(higher),
                key=lambda book: (parse_level_index(book.get("level")) or 999) - target_index,
            )

    return rng.choice(same_lang)


def build_recommendation(
    *,
    user_profile: dict[str, Any] | None,
    user_progress: list[dict[str, Any]],
    books: list[dict[str, Any]],
    pages_by_book: dict[str, list[dict[str, Any]]],
    base_url: str,
    rng: random.Random,
) -> Recommendation | None:
    books_by_id = book_by_id(books)
    active = latest_incomplete_progress(user_progress)
    if active is not None:
        book_id = str(active["book_id"])
        book = books_by_id.get(book_id)
        page_id = str(active["page_id"])
        target_page_id = page_id
        if int(active.get("progress_bps") or 0) >= NEXT_PAGE_THRESHOLD_BPS:
            target_page_id = next_page_id(pages_by_book.get(book_id, []), page_id) or page_id
        title = book.get("title") if book else book_id
        link = reader_link(base_url, book_id, target_page_id)
        tip = f"Continue {title}"
        return Recommendation(
            recommendation_type="continue",
            reading_tip=tip,
            book_id=book_id,
            page_id=target_page_id,
            target_link=link,
            subject=f"Your next page in {title}",
            body=(
                "Hi,\n\n"
                f"You left off in {title}. Here is the page to keep going:\n\n"
                f"{link}\n\n"
                "No pressure. Just one page is enough to keep the habit warm.\n\n"
                "Marco"
            ),
        )

    unread = choose_unread_book(user_profile=user_profile, books=books, progress_rows=user_progress, rng=rng)
    if unread is None:
        return None
    book_id = str(unread["id"])
    title = unread.get("title") or book_id
    link = reader_link(base_url, book_id)
    tip = f"Try {title}"
    return Recommendation(
        recommendation_type="pick_unread",
        reading_tip=tip,
        book_id=book_id,
        page_id=None,
        target_link=link,
        subject=f"A fresh LingoCafe read for you",
        body=(
            "Hi,\n\n"
            f"If you want something new to read, {title} looks like a good next pick:\n\n"
            f"{link}\n\n"
            "No pressure. One short reading session is already a win.\n\n"
            "Marco"
        ),
    )


def sent_recently(sent_rows: list[dict[str, Any]], user_id: str, now: datetime) -> bool:
    cutoff = now - timedelta(hours=EMAIL_COOLDOWN_HOURS)
    for row in sent_rows:
        if str(row.get("user_id")) != user_id:
            continue
        sent_at = normalize_datetime(row.get("sent_at"))
        if sent_at and sent_at >= cutoff and row.get("sender_status") == "sent":
            return True
    return False


def read_recently(progress_rows: list[dict[str, Any]], now: datetime) -> bool:
    latest = latest_progress(progress_rows)
    if latest is None:
        return False
    updated_at = normalize_datetime(latest.get("updated_at"))
    return bool(updated_at and updated_at >= now - timedelta(hours=READ_RECENCY_HOURS))


def build_decisions(
    *,
    users: list[dict[str, Any]],
    lingocafe_users: list[dict[str, Any]],
    books: list[dict[str, Any]],
    pages: list[dict[str, Any]],
    progress: list[dict[str, Any]],
    sent_rows: list[dict[str, Any]],
    whitelist_mode: str,
    whitelist: set[str],
    now: datetime,
    base_url: str,
    random_seed: int,
    ignore_sent_cooldown: bool = False,
    max_recipients: int = 1,
) -> list[Decision]:
    profiles = {str(row["user_id"]): row for row in lingocafe_users}
    progress_by_user = group_by_user(progress)
    pages_by_book = page_maps(pages)
    rng = random.Random(random_seed)
    decisions: list[Decision] = []
    selected_count = 0

    for user in sorted(users, key=lambda row: str(row.get("email") or "")):
        if user.get("app_id") != LINGOCAFE_APP_ID:
            continue
        user_id = str(user["id"])
        email = user.get("email")
        normalized_email = str(email).strip().lower() if email else None
        if not normalized_email:
            decisions.append(Decision(user_id=user_id, email=None, status="skipped", reason="missing_email"))
            continue
        if whitelist_mode != "send_to_all" and normalized_email not in whitelist:
            decisions.append(Decision(user_id=user_id, email=email, status="skipped", reason="not_whitelisted"))
            continue
        user_progress = progress_by_user.get(user_id, [])
        latest = latest_progress(user_progress)
        last_read_at = normalize_datetime(latest.get("updated_at")) if latest else None
        if read_recently(user_progress, now):
            decisions.append(Decision(user_id=user_id, email=email, status="skipped", reason="read_in_last_24h", last_read_at=last_read_at))
            continue
        if not ignore_sent_cooldown and sent_recently(sent_rows, user_id, now):
            decisions.append(Decision(user_id=user_id, email=email, status="skipped", reason="emailed_in_last_72h", last_read_at=last_read_at))
            continue
        recommendation = build_recommendation(
            user_profile=profiles.get(user_id),
            user_progress=user_progress,
            books=books,
            pages_by_book=pages_by_book,
            base_url=base_url,
            rng=rng,
        )
        if recommendation is None:
            decisions.append(Decision(user_id=user_id, email=email, status="skipped", reason="no_eligible_recommendation", last_read_at=last_read_at))
            continue
        if selected_count >= max_recipients:
            decisions.append(Decision(user_id=user_id, email=email, status="skipped", reason="max_recipients_reached", last_read_at=last_read_at))
            continue
        selected_count += 1
        decisions.append(Decision(user_id=user_id, email=email, status="selected", reason="eligible", last_read_at=last_read_at, recommendation=recommendation))

    return decisions


def sent_email_schema(pa: Any) -> Any:
    return pa.schema(
        [
            ("run_id", pa.string()),
            ("user_id", pa.string()),
            ("recipient_email", pa.string()),
            ("sent_at", pa.timestamp("us", tz="UTC")),
            ("recommendation_type", pa.string()),
            ("reading_tip", pa.string()),
            ("book_id", pa.string()),
            ("page_id", pa.string()),
            ("target_link", pa.string()),
            ("subject", pa.string()),
            ("body", pa.string()),
            ("sender_status", pa.string()),
            ("sender_message_id", pa.string()),
            ("error", pa.string()),
        ]
    )


def write_sent_email_log(path: Path, rows: list[dict[str, Any]]) -> None:
    pa, pq = import_pyarrow()
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    table = pa.table({column: [row.get(column) for row in rows] for column in SENT_EMAIL_COLUMNS}, schema=sent_email_schema(pa))
    pq.write_table(table, tmp, compression="zstd")
    tmp.replace(path)
    duckdb = import_duckdb()
    with duckdb.connect(":memory:") as connection:
        count = connection.execute("SELECT count(*) FROM read_parquet(?)", [str(path)]).fetchone()[0]
    if count != len(rows):
        raise RuntimeError(f"Parquet smoke read failed for {path}: expected {len(rows)} rows, read {count}.")


def send_resend_email(*, api_key: str, from_email: str, to: str, subject: str, body: str) -> str | None:
    payload = json.dumps(
        {
            "from": from_email,
            "to": to,
            "subject": subject,
            "text": body,
        }
    ).encode("utf-8")
    request = Request(
        RESEND_EMAILS_URL,
        data=payload,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "42go-cli-lingocafe-read-tip",
        },
    )
    try:
        with urlopen(request, timeout=30) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Resend delivery failed: {error.code} {detail}") from error
    except URLError as error:
        raise RuntimeError(f"Resend delivery failed: {error.reason}") from error
    if not raw:
        return None
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return None
    message_id = parsed.get("id")
    return str(message_id) if message_id else None


SendEmailFn = Callable[[str, str, str], str | None]


def run_read_tip(
    options: ReadTipOptions,
    *,
    send_email: SendEmailFn | None = None,
) -> ReadTipResult:
    if options.send and options.dry_run:
        raise RuntimeError("Use either dry-run mode or send mode, not both.")
    now = normalize_datetime(options.now) if options.now else utc_now()
    if now is None:
        now = utc_now()
    paths = resolve_paths(options)
    whitelist_mode, whitelist = read_whitelist(paths.whitelist_path)
    users = read_parquet_rows(paths.users_path)
    lingocafe_users = read_parquet_rows(paths.lingocafe_users_path)
    books = read_parquet_rows(paths.books_path)
    pages = read_parquet_rows(paths.pages_path)
    progress = read_parquet_rows(paths.progress_path)
    sent_rows = read_parquet_rows(paths.sent_emails_path, required=False)
    decisions = build_decisions(
        users=users,
        lingocafe_users=lingocafe_users,
        books=books,
        pages=pages,
        progress=progress,
        sent_rows=sent_rows,
        whitelist_mode=whitelist_mode,
        whitelist=whitelist,
        now=now,
        base_url=options.base_url,
        random_seed=options.random_seed,
        ignore_sent_cooldown=options.reset,
        max_recipients=options.max_recipients,
    )

    sent_records: list[dict[str, Any]] = []
    if options.send:
        api_key = options.resend_api_key or load_env_value("LC_RESEND_API_KEY")
        if not api_key:
            raise RuntimeError("LC_RESEND_API_KEY is required for send mode.")
        sender = send_email or (
            lambda to, subject, body: send_resend_email(
                api_key=api_key,
                from_email=options.from_email,
                to=to,
                subject=subject,
                body=body,
            )
        )
        run_id = now.strftime("read-tip-%Y%m%dT%H%M%SZ")
        for decision in decisions:
            if decision.status != "selected" or decision.recommendation is None or not decision.email:
                continue
            recommendation = decision.recommendation
            record = {
                "run_id": run_id,
                "user_id": decision.user_id,
                "recipient_email": decision.email,
                "sent_at": now,
                "recommendation_type": recommendation.recommendation_type,
                "reading_tip": recommendation.reading_tip,
                "book_id": recommendation.book_id,
                "page_id": recommendation.page_id,
                "target_link": recommendation.target_link,
                "subject": recommendation.subject,
                "body": recommendation.body,
                "sender_status": "sent",
                "sender_message_id": None,
                "error": None,
            }
            try:
                record["sender_message_id"] = sender(decision.email, recommendation.subject, recommendation.body)
            except Exception as error:  # noqa: BLE001 - failures are per-recipient and logged.
                record["sender_status"] = "failed"
                record["error"] = str(error)
            sent_records.append(record)
        if sent_records:
            write_sent_email_log(paths.sent_emails_path, [*sent_rows, *sent_records])

    return ReadTipResult(
        mode="send" if options.send else "dry-run",
        whitelist_mode=whitelist_mode,
        decisions=decisions,
        sent_records=sent_records,
        sent_log_path=paths.sent_emails_path,
    )


def summarize_result(result: ReadTipResult) -> str:
    selected = [decision for decision in result.decisions if decision.status == "selected"]
    skipped = [decision for decision in result.decisions if decision.status == "skipped"]
    skip_counts: dict[str, int] = {}
    type_counts: dict[str, int] = {}
    for decision in skipped:
        skip_counts[decision.reason] = skip_counts.get(decision.reason, 0) + 1
    for decision in selected:
        recommendation_type = decision.recommendation.recommendation_type if decision.recommendation else "unknown"
        type_counts[recommendation_type] = type_counts.get(recommendation_type, 0) + 1

    lines = [
        "LingoCafe read-tip email",
        f"mode: {result.mode}",
        f"whitelist: {result.whitelist_mode}",
        f"selected: {len(selected)}",
        f"skipped: {len(skipped)}",
        f"sent: {sum(1 for row in result.sent_records if row.get('sender_status') == 'sent')}",
        f"failed: {sum(1 for row in result.sent_records if row.get('sender_status') == 'failed')}",
        f"sent log: {result.sent_log_path}",
    ]
    if type_counts:
        lines.append("recommendations:")
        for key in sorted(type_counts):
            lines.append(f"  {key}: {type_counts[key]}")
    if selected:
        lines.append("planned emails:")
        for decision in selected:
            last_read_at = decision.last_read_at.isoformat() if decision.last_read_at else "never"
            lines.append(f"  {decision.email} | last_read_at: {last_read_at}")
            if decision.recommendation is not None:
                lines.append(f"    subject: {decision.recommendation.subject}")
                lines.append("    body:")
                for body_line in decision.recommendation.body.splitlines():
                    lines.append(f"      {body_line}")
    if skip_counts:
        lines.append("skip reasons:")
        for key in sorted(skip_counts):
            lines.append(f"  {key}: {skip_counts[key]}")
    return "\n".join(lines)
