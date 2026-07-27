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
SKILL = Path(__file__).parents[1] / ".agents/skills/quicklist/SKILL.md"
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
    def test_skill_requires_instruction_driven_reorder_after_item_text_mutations(self):
        skill = SKILL.read_text(encoding="utf-8")

        self.assertIn(
            "Every skill-driven item addition or item-text edit must end with a complete instruction-driven reorder.",
            skill,
        )
        self.assertIn(
            "stop before adding or editing anything and ask the user to provide the ordering instructions",
            skill,
        )
        self.assertIn(
            "place every item that cannot be confidently matched to an instruction after all matched items",
            skill,
        )
        self.assertIn(
            "Preserve the current relative order among unmatched items",
            skill,
        )

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

    def test_reorder_context_captures_the_response_etag(self):
        class FakeResponse:
            headers = {"ETag": '"ql-context"'}

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                return b'{"list":{"id":"list-id"},"items":[]}'

        client = quicklist.Client("https://quicklist.example", "secret")
        with patch.object(quicklist, "urlopen", return_value=FakeResponse()):
            result = client.request("GET", "/list-id/reorder", include_etag=True)

        self.assertEqual(result["etag"], '"ql-context"')
        self.assertEqual(result["items"], [])

    def test_apply_order_sends_if_match_and_compact_items(self):
        captured = {}

        class FakeResponse:
            headers = {"ETag": '"ql-next"'}

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                return b'{"items":[]}'

        def open_request(request, timeout):
            captured["if_match"] = request.get_header("If-match")
            captured["body"] = json.loads(request.data)
            captured["timeout"] = timeout
            return FakeResponse()

        client = quicklist.Client("https://quicklist.example", "secret")
        with patch.object(quicklist, "urlopen", side_effect=open_request):
            client.request(
                "POST",
                "/list-id/reorder",
                {"items": []},
                headers={"If-Match": '"ql-context"'},
            )

        self.assertEqual(captured["if_match"], '"ql-context"')
        self.assertEqual(captured["body"], {"items": []})
        self.assertEqual(captured["timeout"], 30)

    def test_sorting_instruction_commands_use_the_dedicated_resource(self):
        captured = []

        class FakeClient:
            def __init__(self, _base_url, _token):
                pass

            def resolve_list(self, value):
                self.assert_list = value
                return "11111111-1111-4111-8111-111111111111"

            def request(self, method, path, body=None):
                captured.append((method, path, body))
                return {"sortingInstructions": body["sortingInstructions"] if body else "Current"}

        with (
            patch.object(quicklist, "load_credential", return_value=("https://quicklist.example", "secret")),
            patch.object(quicklist, "Client", FakeClient),
        ):
            read_result = quicklist.execute(
                quicklist.parser().parse_args(["sorting-instructions", "Shopping"])
            )
            write_result = quicklist.execute(
                quicklist.parser().parse_args(
                    [
                        "set-sorting-instructions",
                        "Shopping",
                        "Place fruit first.",
                    ]
                )
            )

        self.assertEqual(read_result, {"sortingInstructions": "Current"})
        self.assertEqual(
            write_result,
            {"sortingInstructions": "Place fruit first."},
        )
        self.assertEqual(
            captured,
            [
                (
                    "GET",
                    "/11111111-1111-4111-8111-111111111111/sorting-instructions",
                    None,
                ),
                (
                    "POST",
                    "/11111111-1111-4111-8111-111111111111/sorting-instructions",
                    {"sortingInstructions": "Place fruit first."},
                ),
            ],
        )

    def test_position_parser_requires_unique_gapless_complete_pairs(self):
        first = "11111111-1111-4111-8111-111111111111"
        second = "22222222-2222-4222-8222-222222222222"
        self.assertEqual(
            quicklist.parse_position_items([f"{first}:2", f"{second}:1"]),
            [
                {"id": first, "position": 2},
                {"id": second, "position": 1},
            ],
        )
        self.assertEqual(quicklist.parse_position_items([]), [])
        with self.assertRaisesRegex(quicklist.QuickListError, "Duplicate reorder position"):
            quicklist.parse_position_items([f"{first}:1", f"{second}:1"])
        with self.assertRaisesRegex(quicklist.QuickListError, "gapless"):
            quicklist.parse_position_items([f"{first}:2"])

    def test_apply_order_parser_accepts_items_after_etag(self):
        first = "11111111-1111-4111-8111-111111111111"
        second = "22222222-2222-4222-8222-222222222222"
        args = quicklist.parser().parse_args(
            [
                "apply-order",
                "Shopping",
                "--etag",
                '"ql-context"',
                "--item",
                f"{first}:1",
                "--item",
                f"{second}:2",
            ]
        )

        self.assertEqual(args.etag, '"ql-context"')
        self.assertEqual(args.items, [f"{first}:1", f"{second}:2"])

    def test_stale_reorder_error_requires_fresh_reasoning(self):
        client = quicklist.Client("https://quicklist.example", "secret")
        response = HTTPError(
            "https://quicklist.example/api/quicklists/v1/list-id/reorder",
            409,
            "Conflict",
            {},
            None,
        )
        response.read = lambda: b'{"error":"conflict","message":"stale"}'
        with patch.object(quicklist, "urlopen", side_effect=response):
            with self.assertRaisesRegex(
                quicklist.QuickListError,
                "Run reorder-context again",
            ):
                client.request(
                    "POST",
                    "/list-id/reorder",
                    {"items": []},
                    headers={"If-Match": '"ql-old"'},
                )


if __name__ == "__main__":
    unittest.main()
