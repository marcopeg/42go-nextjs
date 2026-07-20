import base64
import importlib.util
import json
import os
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch
from argparse import Namespace
from io import StringIO
from urllib.error import HTTPError


SCRIPT = Path(__file__).parents[1] / ".agents/skills/quicklist/scripts/quicklist.py"
SPEC = importlib.util.spec_from_file_location("quicklist_skill", SCRIPT)
quicklist = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(quicklist)


def connection_code(base_url: str, token: str, version: int = 1) -> str:
    payload = json.dumps(
        {"v": version, "baseUrl": base_url, "token": token},
        separators=(",", ":"),
    ).encode("utf-8")
    encoded = base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")
    return f"qlc1_{encoded}"


class QuickListSkillTests(unittest.TestCase):
    def test_configure_stores_scoped_secret_without_returning_it(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "credentials.json"
            with (
                patch.dict(os.environ, {"QUICKLIST_CREDENTIALS_FILE": str(target)}, clear=False),
                patch.object(
                    quicklist.getpass,
                    "getpass",
                    return_value=connection_code("https://quicklist.example", "ql_super-secret"),
                ),
            ):
                result = quicklist.configure("_global")

            stored = json.loads(target.read_text(encoding="utf-8"))
            self.assertEqual(
                stored["credentials"]["_global"],
                {"baseUrl": "https://quicklist.example", "token": "ql_super-secret"},
            )
            self.assertNotIn("ql_super-secret", json.dumps(result))
            self.assertEqual(stat.S_IMODE(target.stat().st_mode), 0o600)

    def test_configure_preserves_other_project_entries(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "credentials.json"
            target.write_text(
                json.dumps({"credentials": {"_global": {"baseUrl": "https://one", "token": "first"}}}),
                encoding="utf-8",
            )
            with (
                patch.dict(os.environ, {"QUICKLIST_CREDENTIALS_FILE": str(target)}, clear=False),
            ):
                quicklist.configure("/tmp/project", connection_code("https://two", "second"))

            stored = json.loads(target.read_text(encoding="utf-8"))["credentials"]
            self.assertEqual(stored["_global"]["token"], "first")
            self.assertEqual(stored[str(Path("/tmp/project").resolve())]["token"], "second")

    def test_connection_code_rejects_unsupported_versions_and_non_origin_urls(self):
        with self.assertRaisesRegex(quicklist.QuickListError, "version is unsupported"):
            quicklist.decode_connection_code(connection_code("https://quicklist.example", "token", 2))
        with self.assertRaisesRegex(quicklist.QuickListError, "without credentials or a path"):
            quicklist.decode_connection_code(
                connection_code("https://quicklist.example/private", "token")
            )

    def test_connection_code_rejects_malformed_input_without_echoing_it(self):
        secret = "qlc1_not-valid-base64!"
        with self.assertRaises(quicklist.QuickListError) as raised:
            quicklist.decode_connection_code(secret)
        self.assertNotIn(secret, str(raised.exception))

    def test_chat_fallback_reads_connection_code_from_stdin(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "credentials.json"
            code = connection_code("https://mobile.example", "mobileSecret")
            args = Namespace(command="configure", scope="_global", from_stdin=True)
            with (
                patch.dict(os.environ, {"QUICKLIST_CREDENTIALS_FILE": str(target)}, clear=False),
                patch.object(quicklist.sys, "stdin", StringIO(f"{code}\n")),
            ):
                result = quicklist.execute(args)

            stored = json.loads(target.read_text(encoding="utf-8"))["credentials"]["_global"]
            self.assertEqual(stored, {"baseUrl": "https://mobile.example", "token": "mobileSecret"})
            self.assertNotIn(code, json.dumps(result))
            self.assertNotIn("mobileSecret", json.dumps(result))

    def test_non_tty_stdin_reader_returns_one_line(self):
        with patch.object(quicklist.sys, "stdin", StringIO("secret\nsecond\n")):
            self.assertEqual(quicklist.read_connection_code_from_stdin(), "secret\n")

    def test_exact_name_resolution_is_case_insensitive_and_never_fuzzy(self):
        client = quicklist.Client("https://quicklist.example", "secret")
        client.lists = lambda: [
            {"id": "11111111-1111-4111-8111-111111111111", "title": "Shopping"},
            {"id": "22222222-2222-4222-8222-222222222222", "title": "Shop"},
        ]
        self.assertEqual(
            client.resolve_list("shopping"),
            "11111111-1111-4111-8111-111111111111",
        )
        with self.assertRaisesRegex(quicklist.QuickListError, "No API-enabled list"):
            client.resolve_list("Shopp")

    def test_ambiguous_exact_name_requires_an_id(self):
        client = quicklist.Client("https://quicklist.example", "secret")
        client.lists = lambda: [
            {"id": "11111111-1111-4111-8111-111111111111", "title": "Shopping"},
            {"id": "22222222-2222-4222-8222-222222222222", "title": "shopping"},
        ]
        with self.assertRaisesRegex(quicklist.QuickListError, "ambiguous"):
            client.resolve_list("Shopping")

    def test_environment_override_requires_url_and_token_together(self):
        with patch.dict(
            os.environ,
            {"QUICKLIST_API_BASE_URL": "https://quicklist.example"},
            clear=True,
        ):
            with self.assertRaisesRegex(quicklist.QuickListError, "must be set together"):
                quicklist.load_credential(None)

    def test_flat_api_error_is_reported_without_exposing_the_token(self):
        client = quicklist.Client("https://quicklist.example", "ql_super-secret")
        response = HTTPError(
            "https://quicklist.example/api/quicklists/v1",
            401,
            "Unauthorized",
            {},
            None,
        )
        response.read = lambda: b'{"error":"unauthorized","message":"Invalid bearer token."}'
        with patch.object(quicklist, "urlopen", side_effect=response):
            with self.assertRaisesRegex(quicklist.QuickListError, "Invalid bearer token") as raised:
                client.request("GET", "")
        self.assertNotIn("ql_super-secret", str(raised.exception))


if __name__ == "__main__":
    unittest.main()
