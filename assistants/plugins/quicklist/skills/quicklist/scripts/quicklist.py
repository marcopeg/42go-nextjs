#!/usr/bin/env python3
"""Safe, dependency-free command line client for the QuickList personal API."""

from __future__ import annotations

import argparse
import base64
import getpass
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen

UUID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$", re.I)
TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]+$")
CONNECTION_CODE_PREFIX = "qlc1_"
CONNECTION_CODE_MAX_LENGTH = 8192
DEFAULT_CREDENTIALS = Path("~/.config/quicklist/credentials.json").expanduser()


class QuickListError(RuntimeError):
    pass


def _git_root() -> Path | None:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            check=True,
            capture_output=True,
            text=True,
        )
        return Path(result.stdout.strip()).resolve()
    except (OSError, subprocess.CalledProcessError):
        return None


def scope_key(explicit: str | None = None) -> str:
    if explicit:
        return "_global" if explicit == "_global" else str(Path(explicit).expanduser().resolve())
    root = _git_root()
    skill_root = Path(__file__).resolve().parent.parent
    if root:
        try:
            skill_root.relative_to(root)
            return str(root)
        except ValueError:
            pass
    return "_global"


def credentials_path() -> Path:
    value = os.environ.get("QUICKLIST_CREDENTIALS_FILE")
    return Path(value).expanduser() if value else DEFAULT_CREDENTIALS


def _read_credentials(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"credentials": {}}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise QuickListError(f"Cannot read credential file {path}: {exc}") from exc
    if not isinstance(data, dict) or not isinstance(data.get("credentials"), dict):
        raise QuickListError(f"Credential file {path} has an invalid structure")
    return data


def _write_credentials(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    handle, temp_name = tempfile.mkstemp(prefix=".credentials-", dir=path.parent, text=True)
    try:
        with os.fdopen(handle, "w", encoding="utf-8") as stream:
            json.dump(data, stream, indent=2, sort_keys=True)
            stream.write("\n")
        os.chmod(temp_name, 0o600)
        os.replace(temp_name, path)
        os.chmod(path, 0o600)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)


def decode_connection_code(value: str) -> tuple[str, str]:
    code = value.strip()
    if not code.startswith(CONNECTION_CODE_PREFIX):
        raise QuickListError("Connection code has an unsupported format")
    if len(code) > CONNECTION_CODE_MAX_LENGTH:
        raise QuickListError("Connection code is too long")

    encoded = code.removeprefix(CONNECTION_CODE_PREFIX)
    if not encoded:
        raise QuickListError("Connection code is incomplete")
    padding = "=" * (-len(encoded) % 4)
    try:
        raw = base64.b64decode(encoded + padding, altchars=b"-_", validate=True)
        payload = json.loads(raw.decode("utf-8"))
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise QuickListError("Connection code is invalid") from exc

    if not isinstance(payload, dict) or payload.get("v") != 1:
        raise QuickListError("Connection code version is unsupported")
    base_url = payload.get("baseUrl")
    token = payload.get("token")
    if not isinstance(base_url, str) or not isinstance(token, str):
        raise QuickListError("Connection code is missing its URL or token")

    parsed = urlsplit(base_url.strip())
    if (
        parsed.scheme not in ("http", "https")
        or not parsed.netloc
        or parsed.username is not None
        or parsed.password is not None
        or parsed.path not in ("", "/")
        or parsed.query
        or parsed.fragment
    ):
        raise QuickListError("Connection code must contain an HTTP(S) origin without credentials or a path")
    token = token.strip()
    if not token or not TOKEN_RE.fullmatch(token):
        raise QuickListError("Connection code contains an invalid token")
    return f"{parsed.scheme}://{parsed.netloc}", token


def configure(scope: str | None, supplied_code: str | None = None) -> dict[str, Any]:
    key = scope_key(scope)
    code = supplied_code or getpass.getpass("QuickList connection code: ")
    base_url, token = decode_connection_code(code)
    path = credentials_path()
    data = _read_credentials(path)
    data["credentials"][key] = {"baseUrl": base_url, "token": token}
    _write_credentials(path, data)
    return {"configured": True, "scope": key, "credentialsFile": str(path)}


def read_connection_code_from_stdin() -> str:
    if not sys.stdin.isatty():
        return sys.stdin.readline()

    try:
        import termios
    except ImportError:
        return sys.stdin.readline()

    file_descriptor = sys.stdin.fileno()
    previous = termios.tcgetattr(file_descriptor)
    hidden = previous.copy()
    hidden[3] &= ~termios.ECHO
    try:
        termios.tcsetattr(file_descriptor, termios.TCSADRAIN, hidden)
        return sys.stdin.readline()
    finally:
        termios.tcsetattr(file_descriptor, termios.TCSADRAIN, previous)


def load_credential(scope: str | None) -> tuple[str, str]:
    env_url = os.environ.get("QUICKLIST_API_BASE_URL")
    env_token = os.environ.get("QUICKLIST_API_TOKEN")
    if env_url or env_token:
        if not env_url or not env_token:
            raise QuickListError("QUICKLIST_API_BASE_URL and QUICKLIST_API_TOKEN must be set together")
        return env_url.rstrip("/"), env_token
    key = scope_key(scope)
    entry = _read_credentials(credentials_path())["credentials"].get(key)
    if not isinstance(entry, dict) or not entry.get("baseUrl") or not entry.get("token"):
        command = f"python3 {Path(__file__).resolve()} configure"
        raise QuickListError(f"No QuickList credential for scope {key}. Run in your terminal: {command}")
    return str(entry["baseUrl"]).rstrip("/"), str(entry["token"])


class Client:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.token = token

    def request(
        self,
        method: str,
        path: str,
        body: Any = None,
        query: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        include_etag: bool = False,
    ) -> Any:
        url = f"{self.base_url}/api/quicklists/v1{path}"
        if query:
            url += "?" + urlencode({key: value for key, value in query.items() if value is not None})
        payload = json.dumps(body).encode("utf-8") if body is not None else None
        request_headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if headers:
            request_headers.update(headers)
        request = Request(
            url,
            data=payload,
            method=method,
            headers=request_headers,
        )
        try:
            with urlopen(request, timeout=30) as response:
                content = response.read()
                result = json.loads(content) if content else {"ok": True}
                if include_etag:
                    etag = response.headers.get("ETag")
                    if not etag:
                        raise QuickListError("QuickList reorder response did not include an ETag")
                    if not isinstance(result, dict):
                        raise QuickListError("QuickList reorder response has an invalid shape")
                    result = {**result, "etag": etag}
                return result
        except HTTPError as exc:
            content = exc.read().decode("utf-8", errors="replace")
            try:
                parsed = json.loads(content)
                error = parsed.get("error") if isinstance(parsed, dict) else None
                if isinstance(error, dict):
                    message = error.get("message") or content
                elif isinstance(parsed, dict):
                    message = parsed.get("message") or error or content
                else:
                    message = content
            except json.JSONDecodeError:
                message = content or exc.reason
            if exc.code == 409 and path.endswith("/reorder"):
                raise QuickListError(
                    "Reorder context is stale. Run reorder-context again, reason over the fresh list, "
                    "then submit a new order."
                ) from exc
            raise QuickListError(f"QuickList API returned {exc.code}: {message}") from exc
        except URLError as exc:
            raise QuickListError(f"Cannot reach QuickList: {exc.reason}") from exc

    def lists(self) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        cursor = None
        while True:
            page = self.request("GET", "", query={"limit": 100, "cursor": cursor})
            rows.extend(page.get("lists", []))
            cursor = page.get("nextCursor")
            if not cursor:
                return rows

    def resolve_list(self, value: str) -> str:
        if UUID_RE.fullmatch(value):
            return value
        matches = [row for row in self.lists() if str(row.get("title", "")).casefold() == value.casefold()]
        if len(matches) == 1:
            return str(matches[0]["id"])
        if not matches:
            raise QuickListError(f'No API-enabled list has the exact name "{value}"')
        choices = ", ".join(f'{row.get("title")} ({row.get("id")})' for row in matches)
        raise QuickListError(f'List name "{value}" is ambiguous: {choices}')


def parse_position_items(values: list[str]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    seen_positions: set[int] = set()
    for value in values:
        item_id, separator, raw_position = value.rpartition(":")
        if not separator or not UUID_RE.fullmatch(item_id):
            raise QuickListError(
                f'Invalid reorder item "{value}". Use ITEM_UUID:POSITION.'
            )
        try:
            position = int(raw_position)
        except ValueError as exc:
            raise QuickListError(
                f'Invalid reorder item "{value}". Position must be an integer.'
            ) from exc
        normalized_id = item_id.lower()
        if normalized_id in seen_ids:
            raise QuickListError(f"Duplicate reorder item ID: {item_id}")
        if position in seen_positions:
            raise QuickListError(f"Duplicate reorder position: {position}")
        seen_ids.add(normalized_id)
        seen_positions.add(position)
        items.append({"id": item_id, "position": position})

    expected_positions = set(range(1, len(items) + 1))
    if seen_positions != expected_positions:
        raise QuickListError(
            f"Reorder positions must be unique and gapless from 1 through {len(items)}."
        )
    return items


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description="Manage QuickList through its personal API")
    root.add_argument("--scope", help="Credential key: _global or a project path (default: auto)")
    commands = root.add_subparsers(dest="command", required=True)

    setup = commands.add_parser("configure", help="Securely save a connection code for this scope")
    setup.add_argument(
        "--from-stdin",
        action="store_true",
        help="Read one connection-code line from stdin (less secure mobile/chat fallback)",
    )
    commands.add_parser("lists", help="List API-enabled lists")

    show = commands.add_parser("show", help="Read a list and its items")
    show.add_argument("list")
    create = commands.add_parser("create", help="Create an API-enabled list")
    create.add_argument("title")
    create.add_argument("--mode", choices=("todo", "checklist"), default="todo")
    create.add_argument("--item", action="append", default=[])
    update_list = commands.add_parser("update-list", help="Rename a list or change its mode")
    update_list.add_argument("list")
    update_list.add_argument("--title")
    update_list.add_argument("--mode", choices=("todo", "checklist"))
    delete_list = commands.add_parser("delete-list", help="Delete an owned list")
    delete_list.add_argument("list")
    delete_list.add_argument("--yes", action="store_true", help="Confirm permanent deletion")

    items = commands.add_parser("items", help="List items")
    items.add_argument("list")
    add = commands.add_parser("add", help="Add one item")
    add.add_argument("list")
    add.add_argument("title")
    add.add_argument("--position", type=int)
    update = commands.add_parser("update-item", help="Edit an item")
    update.add_argument("list")
    update.add_argument("item")
    update.add_argument("--title")
    state = update.add_mutually_exclusive_group()
    state.add_argument("--completed", action="store_true")
    state.add_argument("--not-completed", action="store_true")
    check = commands.add_parser("check", help="Mark an item completed or incomplete")
    check.add_argument("list")
    check.add_argument("item")
    check.add_argument("--undo", action="store_true")
    delete_item = commands.add_parser("delete-item", help="Delete an item")
    delete_item.add_argument("list")
    delete_item.add_argument("item")
    reorder_context = commands.add_parser(
        "reorder-context",
        help="Read LLM sorting instructions, every item, and the current ETag",
    )
    reorder_context.add_argument("list")
    sorting_instructions = commands.add_parser(
        "sorting-instructions",
        help="Read the stored sorting instructions for a list",
    )
    sorting_instructions.add_argument("list")
    set_sorting_instructions = commands.add_parser(
        "set-sorting-instructions",
        help="Replace the stored sorting instructions for future reorder runs",
    )
    set_sorting_instructions.add_argument("list")
    set_sorting_instructions.add_argument(
        "instructions",
        help="New instructions; pass an empty string to clear them",
    )
    apply_order = commands.add_parser(
        "apply-order",
        help="Apply a complete order using repeatable --item ID:POSITION values",
    )
    apply_order.add_argument("list")
    apply_order.add_argument("--etag", required=True)
    apply_order.add_argument(
        "--item",
        dest="items",
        action="append",
        default=[],
        metavar="ID:POSITION",
        help="One item position; repeat for every item in the list",
    )
    reorder = commands.add_parser(
        "reorder",
        help="Set the complete item order by item IDs using the low-level endpoint",
    )
    reorder.add_argument("list")
    reorder.add_argument("items", nargs="+")
    for name in ("drop-completed", "reset-checklist"):
        action = commands.add_parser(name)
        action.add_argument("list")
    return root


def execute(args: argparse.Namespace) -> Any:
    if args.command == "configure":
        supplied_code = read_connection_code_from_stdin() if args.from_stdin else None
        if args.from_stdin and not supplied_code:
            raise QuickListError("No connection code was received on stdin")
        return configure(args.scope, supplied_code)
    base_url, token = load_credential(args.scope)
    client = Client(base_url, token)
    if args.command == "lists":
        return {"lists": client.lists()}
    if args.command == "create":
        return client.request("POST", "", {"title": args.title, "mode": args.mode, "items": args.item})
    list_id = client.resolve_list(args.list)
    path = f"/{list_id}"
    if args.command == "show":
        return client.request("GET", path)
    if args.command == "update-list":
        body = {key: value for key, value in {"title": args.title, "mode": args.mode}.items() if value is not None}
        if not body:
            raise QuickListError("Provide --title or --mode")
        return client.request("PATCH", path, body)
    if args.command == "delete-list":
        if not args.yes:
            raise QuickListError("List deletion requires --yes")
        return client.request("DELETE", path)
    if args.command == "items":
        return client.request("GET", f"{path}/items")
    if args.command == "add":
        body = {"title": args.title}
        if args.position is not None:
            body["position"] = args.position
        return client.request("POST", f"{path}/items", body)
    if args.command == "update-item":
        body = {"title": args.title} if args.title is not None else {}
        if args.completed or args.not_completed:
            body["completed"] = args.completed
        if not body:
            raise QuickListError("Provide --title, --completed, or --not-completed")
        return client.request("PATCH", f"{path}/items/{args.item}", body)
    if args.command == "check":
        return client.request("PATCH", f"{path}/items/{args.item}", {"completed": not args.undo})
    if args.command == "delete-item":
        return client.request("DELETE", f"{path}/items/{args.item}")
    if args.command == "reorder-context":
        return client.request("GET", f"{path}/reorder", include_etag=True)
    if args.command == "sorting-instructions":
        return client.request("GET", f"{path}/sorting-instructions")
    if args.command == "set-sorting-instructions":
        return client.request(
            "POST",
            f"{path}/sorting-instructions",
            {"sortingInstructions": args.instructions},
        )
    if args.command == "apply-order":
        return client.request(
            "POST",
            f"{path}/reorder",
            {"items": parse_position_items(args.items)},
            headers={"If-Match": args.etag},
        )
    if args.command == "reorder":
        return client.request("POST", f"{path}/items/reorder", {"itemIds": args.items})
    if args.command in ("drop-completed", "reset-checklist"):
        return client.request("POST", f"{path}/actions", {"action": args.command})
    raise QuickListError(f"Unsupported command: {args.command}")


def main() -> int:
    try:
        result = execute(parser().parse_args())
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0
    except (QuickListError, KeyboardInterrupt) as exc:
        message = "Cancelled" if isinstance(exc, KeyboardInterrupt) else str(exc)
        print(f"Error: {message}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
