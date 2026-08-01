#!/usr/bin/env python3
"""Safe, dependency-free client for the discovery-driven QuickShare API."""

from __future__ import annotations

import argparse
import getpass
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import tempfile
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlsplit
from urllib.request import Request, urlopen


DEFAULT_CREDENTIALS = Path("~/.config/quickshare/credentials.json").expanduser()
TOKEN_RE = re.compile(r"^qs_[A-Za-z0-9_-]{48}$")
RESOURCE_ID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.I,
)
SEMANTIC_OPERATIONS = {
    "list": "resources.list",
    "read": "resources.read",
    "create": "resources.create",
    "save": "resources.save",
    "identifier": "resources.set-identifier",
    "publish": "resources.publish",
    "unpublish": "resources.unpublish",
    "delete": "resources.delete",
}


class QuickShareError(RuntimeError):
    """A safe, user-facing error that never needs transport details."""


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
    value = os.environ.get("QUICKSHARE_CREDENTIALS_FILE")
    return Path(value).expanduser() if value else DEFAULT_CREDENTIALS


def _read_credentials(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"credentials": {}}
    if path.is_symlink():
        raise QuickShareError("Credential file must not be a symbolic link")
    _require_private(path, 0o077, "Credential file")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise QuickShareError("Cannot read the QuickShare credential file") from exc
    if not isinstance(data, dict) or not isinstance(data.get("credentials"), dict):
        raise QuickShareError("QuickShare credential file has an invalid structure")
    return data


def _require_private(path: Path, forbidden_mode: int, label: str) -> None:
    try:
        details = path.stat()
    except OSError as exc:
        raise QuickShareError(f"Cannot inspect QuickShare {label.casefold()}") from exc
    if details.st_uid != os.geteuid() or stat.S_IMODE(details.st_mode) & forbidden_mode:
        raise QuickShareError(f"QuickShare {label.casefold()} must be owned by you and private")


def _write_credentials(path: Path, data: dict[str, Any]) -> None:
    parent_exists = path.parent.exists()
    if parent_exists:
        if path.parent.is_symlink() or not path.parent.is_dir():
            raise QuickShareError("QuickShare credential directory must be a real directory")
        # An override may name a shared system directory such as /tmp. Never
        # mutate its permissions: require the caller to choose a private one.
        _require_private(path.parent, 0o077, "Credential directory")
    else:
        path.parent.mkdir(parents=True, exist_ok=False, mode=0o700)
        os.chmod(path.parent, 0o700)
    handle, temporary = tempfile.mkstemp(prefix=".credentials-", dir=path.parent, text=True)
    try:
        with os.fdopen(handle, "w", encoding="utf-8") as stream:
            json.dump(data, stream, sort_keys=True)
            stream.write("\n")
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
        os.chmod(path, 0o600)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def _validate_origin(value: str) -> str:
    parsed = urlsplit(value.strip())
    if (
        parsed.scheme not in ("http", "https")
        or not parsed.netloc
        or parsed.username is not None
        or parsed.password is not None
        or parsed.path not in ("", "/")
        or parsed.query
        or parsed.fragment
    ):
        raise QuickShareError("QuickShare API origin must be an HTTP(S) origin without credentials, path, or query")
    return f"{parsed.scheme}://{parsed.netloc}"


def _validate_token(value: str) -> str:
    token = value.strip()
    if not TOKEN_RE.fullmatch(token):
        raise QuickShareError("QuickShare token has an invalid format")
    return token


def _connection_from_value(value: Any) -> tuple[str, str]:
    if not isinstance(value, dict):
        raise QuickShareError("QuickShare connection input must be a JSON object")
    base_url = value.get("baseUrl")
    token = value.get("token")
    if not isinstance(base_url, str) or not isinstance(token, str):
        raise QuickShareError("QuickShare connection input is missing required fields")
    return _validate_origin(base_url), _validate_token(token)


def configure(scope: str | None, supplied: dict[str, Any] | None = None) -> dict[str, Any]:
    if supplied is None:
        # Both values are hidden. Even an otherwise harmless origin can reveal
        # deployment topology in captured terminal transcripts.
        supplied = {
            "baseUrl": getpass.getpass("QuickShare API origin: "),
            "token": getpass.getpass("QuickShare personal token: "),
        }
    base_url, token = _connection_from_value(supplied)
    path = credentials_path()
    data = _read_credentials(path)
    data["credentials"][scope_key(scope)] = {"baseUrl": base_url, "token": token}
    _write_credentials(path, data)
    return {"configured": True, "scope": "global" if scope_key(scope) == "_global" else "project"}


def load_credential(scope: str | None) -> tuple[str, str]:
    path = credentials_path()
    if path.parent.exists():
        if path.parent.is_symlink() or not path.parent.is_dir():
            raise QuickShareError("QuickShare credential directory must be a real directory")
        _require_private(path.parent, 0o077, "Credential directory")
    entry = _read_credentials(path)["credentials"].get(scope_key(scope))
    if not isinstance(entry, dict):
        raise QuickShareError("No QuickShare credential is configured. Run quickshare.py configure in your terminal.")
    try:
        return _connection_from_value(entry)
    except QuickShareError as exc:
        raise QuickShareError("QuickShare credential is malformed. Reconfigure it in your terminal.") from exc


def _sanitize_text(value: str, base_url: str | None = None, token: str | None = None) -> str:
    cleaned = value
    if base_url:
        cleaned = cleaned.replace(base_url, "[connection]")
    if token:
        cleaned = cleaned.replace(token, "[redacted]")
    return TOKEN_RE.sub("[redacted]", cleaned)


def sanitize(value: Any, base_url: str | None = None, token: str | None = None) -> Any:
    if isinstance(value, str):
        return _sanitize_text(value, base_url, token)
    if isinstance(value, list):
        return [sanitize(item, base_url, token) for item in value]
    if isinstance(value, dict):
        return {
            key: "[redacted]"
            if key.casefold() in {"token", "authorization", "password", "baseurl", "connection"}
            else sanitize(item, base_url, token)
            for key, item in value.items()
        }
    return value


class Client:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.token = token

    def request(self, method: str, path: str, body: Any = None, query: dict[str, Any] | None = None) -> Any:
        url = f"{self.base_url}{path}"
        if query:
            url += "?" + urlencode({key: value for key, value in query.items() if value is not None})
        request = Request(
            url,
            data=json.dumps(body).encode("utf-8") if body is not None else None,
            method=method,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        )
        try:
            with urlopen(request, timeout=30) as response:
                content = response.read()
                return json.loads(content) if content else {"ok": True}
        except HTTPError as exc:
            content = exc.read().decode("utf-8", errors="replace")
            try:
                payload = json.loads(content)
            except json.JSONDecodeError:
                payload = None
            message = "QuickShare API request failed"
            code = "request_failed"
            if isinstance(payload, dict):
                candidate = payload.get("message") or payload.get("error")
                if isinstance(candidate, str):
                    message = candidate
                if isinstance(payload.get("error"), str):
                    code = payload["error"]
            status_names = {401: "authentication", 403: "authorization", 404: "not_found", 409: "conflict", 422: "validation"}
            category = status_names.get(exc.code, "request")
            raise QuickShareError(
                f"QuickShare {category} error ({exc.code}, {code}): "
                f"{_sanitize_text(message, self.base_url, self.token)}"
            ) from exc
        except (URLError, TimeoutError) as exc:
            raise QuickShareError("Cannot reach QuickShare. Check the configured connection and try again.") from exc

    def discovery(self) -> dict[str, Any]:
        data = self.request("GET", "/api/quickshare/v1/discovery")
        if not isinstance(data, dict) or not isinstance(data.get("contractVersion"), str):
            raise QuickShareError("QuickShare discovery response is malformed")
        if not isinstance(data.get("operations"), list):
            raise QuickShareError("QuickShare discovery does not list operations")
        return data


def _operation(discovery: dict[str, Any], operation_id: str) -> dict[str, Any]:
    operations = discovery.get("operations")
    if not isinstance(operations, list):
        raise QuickShareError("QuickShare discovery does not list operations")
    found = next((item for item in operations if isinstance(item, dict) and item.get("id") == operation_id), None)
    if found is None:
        raise QuickShareError(f"QuickShare does not support {operation_id}")
    if found.get("available") is not True:
        raise QuickShareError(f"QuickShare capability {operation_id} is unavailable")
    if found.get("deprecated"):
        replacement = found.get("replacement")
        suffix = f" Use {replacement} instead." if isinstance(replacement, str) and replacement else ""
        raise QuickShareError(f"QuickShare capability {operation_id} is deprecated.{suffix}")
    if found.get("method") not in {"GET", "POST", "PUT", "PATCH", "DELETE"} or not isinstance(found.get("path"), str):
        raise QuickShareError(f"QuickShare discovery operation {operation_id} is malformed")
    return found


def _resource_type(discovery: dict[str, Any], type_id: Any) -> dict[str, Any]:
    if not isinstance(type_id, str):
        raise QuickShareError("QuickShare request needs an explicit resource type")
    resource_types = discovery.get("resourceTypes")
    if not isinstance(resource_types, list):
        raise QuickShareError("QuickShare discovery does not list resource types")
    found = next((item for item in resource_types if isinstance(item, dict) and item.get("id") == type_id), None)
    if found is None or found.get("available") is not True:
        raise QuickShareError(f"QuickShare resource type {type_id} is unavailable")
    if found.get("deprecated"):
        replacement = found.get("replacement")
        suffix = f" Use {replacement} instead." if isinstance(replacement, str) and replacement else ""
        raise QuickShareError(f"QuickShare resource type {type_id} is deprecated.{suffix}")
    if not isinstance(found.get("contentSchema"), dict):
        raise QuickShareError(f"QuickShare resource type {type_id} has no usable content schema")
    return found


def _schema_error(path: str, message: str) -> None:
    raise QuickShareError(f"Input does not match live QuickShare schema at {path}: {message}")


def validate_schema(value: Any, schema: Any, path: str = "$") -> None:
    """Validate the discovery JSON Schema subset used by QuickShare v1."""
    if not isinstance(schema, dict):
        return
    if "const" in schema and value != schema["const"]:
        _schema_error(path, "must equal the required value")
    if isinstance(schema.get("enum"), list) and value not in schema["enum"]:
        _schema_error(path, "is not an allowed value")
    expected = schema.get("type")
    expected_types = expected if isinstance(expected, list) else [expected] if expected else []
    matches = {
        "object": isinstance(value, dict),
        "array": isinstance(value, list),
        "string": isinstance(value, str),
        "integer": isinstance(value, int) and not isinstance(value, bool),
        "number": isinstance(value, (int, float)) and not isinstance(value, bool),
        "boolean": isinstance(value, bool),
        "null": value is None,
    }
    if expected_types and not any(matches.get(item, False) for item in expected_types):
        _schema_error(path, "has the wrong type")
    if isinstance(value, dict):
        properties = schema.get("properties") if isinstance(schema.get("properties"), dict) else {}
        required = schema.get("required") if isinstance(schema.get("required"), list) else []
        for name in required:
            if name not in value:
                _schema_error(path, f"is missing required field {name}")
        if schema.get("additionalProperties") is False:
            extra = set(value).difference(properties)
            if extra:
                _schema_error(path, f"contains unsupported field {sorted(extra)[0]}")
        for name, child in properties.items():
            if name in value:
                validate_schema(value[name], child, f"{path}.{name}")
    if isinstance(value, list):
        if isinstance(schema.get("minItems"), int) and len(value) < schema["minItems"]:
            _schema_error(path, "has too few items")
        if isinstance(schema.get("maxItems"), int) and len(value) > schema["maxItems"]:
            _schema_error(path, "has too many items")
        for index, child in enumerate(value):
            validate_schema(child, schema.get("items"), f"{path}[{index}]")
    if isinstance(value, str):
        if isinstance(schema.get("minLength"), int) and len(value) < schema["minLength"]:
            _schema_error(path, "is too short")
        if isinstance(schema.get("maxLength"), int) and len(value) > schema["maxLength"]:
            _schema_error(path, "is too long")
        if isinstance(schema.get("pattern"), str):
            try:
                if re.search(schema["pattern"], value) is None:
                    _schema_error(path, "does not match the required pattern")
            except re.error:
                raise QuickShareError("QuickShare discovery contains an invalid validation pattern")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if isinstance(schema.get("minimum"), (int, float)) and value < schema["minimum"]:
            _schema_error(path, "is below the minimum")
        if isinstance(schema.get("maximum"), (int, float)) and value > schema["maximum"]:
            _schema_error(path, "is above the maximum")


def _path(operation: dict[str, Any], parameters: dict[str, str]) -> str:
    template = operation["path"].split("{?", 1)[0]

    def replace(match: re.Match[str]) -> str:
        name = match.group(1)
        if name not in parameters:
            raise QuickShareError(f"QuickShare operation needs path parameter {name}")
        return quote(parameters[name], safe="")

    return re.sub(r"\{([A-Za-z][A-Za-z0-9_]*)\}", replace, template)


def _read_json_input(args: argparse.Namespace, required: bool) -> dict[str, Any]:
    if getattr(args, "input", None) and getattr(args, "input_stdin", False):
        raise QuickShareError("Use either --input or --input-stdin, not both")
    if getattr(args, "input", None):
        try:
            raw = Path(args.input).read_text(encoding="utf-8")
        except OSError as exc:
            raise QuickShareError("Cannot read QuickShare request input file") from exc
    elif getattr(args, "input_stdin", False):
        raw = sys.stdin.read()
    elif required:
        raise QuickShareError("This QuickShare operation requires JSON input from --input or --input-stdin")
    else:
        return {}
    try:
        value = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise QuickShareError("QuickShare request input must be valid JSON") from exc
    if not isinstance(value, dict):
        raise QuickShareError("QuickShare request input must be a JSON object")
    return value


def _effectful(operation: dict[str, Any]) -> bool:
    effects = operation.get("effects")
    return isinstance(effects, dict) and (effects.get("destructive") is True or effects.get("disruptive") is True)


def _preflight(client: Client, discovery: dict[str, Any], resource_id: str) -> dict[str, Any] | None:
    try:
        read = _operation(discovery, SEMANTIC_OPERATIONS["read"])
    except QuickShareError:
        return None
    result = client.request(read["method"], _path(read, {"resourceId": resource_id}))
    return result.get("resource") if isinstance(result, dict) and isinstance(result.get("resource"), dict) else None


def _confirmation_error(operation: dict[str, Any], resource: dict[str, Any] | None) -> QuickShareError:
    effects = operation.get("effects") if isinstance(operation.get("effects"), dict) else {}
    detail = effects.get("confirmation") if isinstance(effects.get("confirmation"), str) else "This operation changes public delivery."
    if operation.get("id") == SEMANTIC_OPERATIONS["delete"] and resource and resource.get("everPublished"):
        detail = "This permanently deletes the shared information, removes its delivery output, and deletes the database record."
    if operation.get("id") == SEMANTIC_OPERATIONS["identifier"] and resource and resource.get("publishedUrl"):
        detail += f" Current public URL: {resource.get('publishedUrl')}. Next public URL: {resource.get('nextPublicUrl')}."
    return QuickShareError(f"Explicit confirmation required. {detail} Re-run with --yes only after the user confirms.")


def _validate_content(
    discovery: dict[str, Any], operation_id: str, payload: dict[str, Any], resource: dict[str, Any] | None
) -> None:
    if operation_id == SEMANTIC_OPERATIONS["create"]:
        type_id = payload.get("type")
    elif operation_id == SEMANTIC_OPERATIONS["save"]:
        type_id = resource.get("type") if resource else None
    else:
        return
    if "content" not in payload:
        return
    capability = _resource_type(discovery, type_id)
    validate_schema(payload["content"], capability["contentSchema"], "$.content")


def execute(args: argparse.Namespace) -> Any:
    if args.command == "configure":
        supplied = None
        if args.from_stdin:
            try:
                supplied = json.loads(sys.stdin.read())
            except json.JSONDecodeError as exc:
                raise QuickShareError("QuickShare stdin configuration must be valid JSON") from exc
        return configure(args.scope, supplied)

    base_url, token = load_credential(args.scope)
    client = Client(base_url, token)
    discovery = client.discovery()
    if args.command == "discover":
        return discovery

    operation_id = SEMANTIC_OPERATIONS[args.command]
    operation = _operation(discovery, operation_id)
    resource_id = getattr(args, "resource_id", None)
    if resource_id is not None and not RESOURCE_ID_RE.fullmatch(resource_id):
        raise QuickShareError("QuickShare resource ID must be a UUID")
    payload = _read_json_input(args, required=operation.get("method") != "GET")
    schema = operation.get("request")
    if schema:
        validate_schema(payload, schema)
    path_parameters = operation.get("pathParameters")
    if resource_id and isinstance(path_parameters, dict) and isinstance(path_parameters.get("resourceId"), dict):
        validate_schema(resource_id, path_parameters["resourceId"], "$.resourceId")
    resource = (
        _preflight(client, discovery, resource_id)
        if resource_id and (_effectful(operation) or operation_id == SEMANTIC_OPERATIONS["save"])
        else None
    )
    _validate_content(discovery, operation_id, payload, resource)
    if _effectful(operation) and not getattr(args, "yes", False):
        raise _confirmation_error(operation, resource)
    path = _path(operation, {"resourceId": resource_id} if resource_id else {})
    if operation["method"] == "GET":
        return client.request(operation["method"], path, query=payload)
    return client.request(operation["method"], path, body=payload)


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description="Manage QuickShare through its live discovery-driven API")
    root.add_argument("--scope", help="Credential key: _global or a project path (default: auto)")
    commands = root.add_subparsers(dest="command", required=True)
    configure_parser = commands.add_parser("configure", help="Securely save a QuickShare origin and token")
    configure_parser.add_argument("--from-stdin", action="store_true", help="Read one JSON connection object from stdin")
    commands.add_parser("discover", help="Read the live QuickShare contract")
    commands.add_parser("list", help="List QuickShare resources")
    commands.add_parser("read", help="Read one QuickShare resource").add_argument("resource_id")
    for command in ("create", "save", "identifier", "publish", "unpublish", "delete"):
        item = commands.add_parser(command, help=f"Run the discovered QuickShare {command} operation")
        if command != "create":
            item.add_argument("resource_id")
        item.add_argument("--input", help="JSON request file")
        item.add_argument("--input-stdin", action="store_true", help="Read JSON request from stdin")
        if command in {"create", "save", "identifier", "publish", "unpublish", "delete"}:
            item.add_argument("--yes", action="store_true", help="Confirm the discovered disruptive operation")
    return root


def main() -> int:
    base_url = token = None
    try:
        result = execute(parser().parse_args())
        print(json.dumps(sanitize(result, base_url, token), indent=2, sort_keys=True))
        return 0
    except (QuickShareError, KeyboardInterrupt) as exc:
        message = "Cancelled" if isinstance(exc, KeyboardInterrupt) else str(exc)
        print(f"Error: {sanitize(message, base_url, token)}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
