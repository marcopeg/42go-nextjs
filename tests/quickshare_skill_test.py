import importlib.util
import json
import os
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError


SCRIPT = Path(__file__).parents[1] / "assistants/plugins/quickshare/skills/quickshare/scripts/quickshare.py"
SKILL = Path(__file__).parents[1] / "assistants/plugins/quickshare/skills/quickshare/SKILL.md"
SPEC = importlib.util.spec_from_file_location("quickshare_skill", SCRIPT)
quickshare = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(quickshare)


RESOURCE_ID = "11111111-1111-4111-8111-111111111111"


def operation(operation_id, method, path, request=None, effects=None):
    return {
        "id": operation_id,
        "method": method,
        "path": path,
        "request": request,
        "effects": effects or {"destructive": False, "disruptive": False},
        "available": True,
        "deprecated": False,
    }


def discovery(*operations):
    return {"contractVersion": "test", "operations": list(operations)}


class FakeClient:
    live_discovery = {}
    responses = []
    calls = []

    def __init__(self, _base_url, _token):
        pass

    def discovery(self):
        return self.live_discovery

    def request(self, method, path, body=None, query=None):
        self.calls.append((method, path, body, query))
        return self.responses.pop(0) if self.responses else {"ok": True}


class QuickShareSkillTests(unittest.TestCase):
    def setUp(self):
        FakeClient.calls = []
        FakeClient.responses = []

    def test_skill_keeps_volatile_catalog_in_live_discovery(self):
        skill = SKILL.read_text(encoding="utf-8")
        self.assertIn("Treat its live resource types, templates, schemas, limits, operations", skill)
        self.assertIn("publishedUrl", skill)
        self.assertNotIn("web-page", skill)
        self.assertNotIn("templateId", skill)

    def test_configure_uses_private_atomic_scoped_credentials_without_echoing_connection(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "private" / "credentials.json"
            secret = "qs_" + "a" * 48
            origin = "https://quickshare.example"
            with patch.dict(os.environ, {"QUICKSHARE_CREDENTIALS_FILE": str(target)}, clear=False):
                result = quickshare.configure("_global", {"baseUrl": origin, "token": secret})
                quickshare.configure("/tmp/project", {"baseUrl": "https://other.example", "token": "qs_" + "b" * 48})

            stored = json.loads(target.read_text(encoding="utf-8"))
            self.assertEqual(stored["credentials"]["_global"], {"baseUrl": origin, "token": secret})
            self.assertIn(str(Path("/tmp/project").resolve()), stored["credentials"])
            self.assertNotIn(secret, json.dumps(result))
            self.assertNotIn(origin, json.dumps(result))
            self.assertEqual(stat.S_IMODE(target.stat().st_mode), 0o600)
            self.assertEqual(stat.S_IMODE(target.parent.stat().st_mode), 0o700)

    def test_malformed_connection_never_echoes_secret(self):
        secret = "qs_not-a-valid-token"
        with self.assertRaises(quickshare.QuickShareError) as raised:
            quickshare._connection_from_value({"baseUrl": "https://quickshare.example", "token": secret})
        self.assertNotIn(secret, str(raised.exception))

    def test_shared_override_parent_is_rejected_without_permission_changes(self):
        parent = Path("/tmp")
        before = stat.S_IMODE(parent.stat().st_mode)
        with self.assertRaisesRegex(quickshare.QuickShareError, "credential directory"):
            quickshare._write_credentials(
                parent / "quickshare-test-credentials.json",
                {"credentials": {}},
            )
        self.assertEqual(stat.S_IMODE(parent.stat().st_mode), before)

    def test_existing_over_permissive_credential_file_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "credentials.json"
            target.write_text('{"credentials": {}}', encoding="utf-8")
            target.chmod(0o644)
            with self.assertRaisesRegex(quickshare.QuickShareError, "credential file"):
                quickshare._read_credentials(target)

    def test_client_sanitizes_remote_error_content_and_connection_details(self):
        secret = "qs_" + "c" * 48
        origin = "https://quickshare.example"
        response = HTTPError(f"{origin}/api/quickshare/v1/discovery", 401, "Unauthorized", {}, None)
        response.read = lambda: json.dumps({"error": "unauthorized", "message": f"{secret} at {origin}"}).encode()
        client = quickshare.Client(origin, secret)
        with patch.object(quickshare, "urlopen", side_effect=response):
            with self.assertRaises(quickshare.QuickShareError) as raised:
                client.request("GET", "/api/quickshare/v1/discovery")
        self.assertNotIn(secret, str(raised.exception))
        self.assertNotIn(origin, str(raised.exception))

    def test_dynamic_discovery_selects_method_path_and_validates_request_without_static_schema(self):
        live = discovery(
            operation(
                "resources.create",
                "PUT",
                "/runtime-created",
                {
                    "type": "object",
                    "required": ["kind", "contents"],
                    "properties": {
                        "kind": {"type": "string", "enum": ["future-type"]},
                        "contents": {"type": "object", "additionalProperties": False, "properties": {}},
                    },
                    "additionalProperties": False,
                },
            )
        )
        live["resourceTypes"] = [
            {
                "id": "future-type",
                "available": True,
                "deprecated": False,
                "contentSchema": {"type": "object", "additionalProperties": False, "properties": {}},
            }
        ]
        with tempfile.TemporaryDirectory() as directory:
            request = Path(directory) / "request.json"
            request.write_text(json.dumps({"kind": "future-type", "contents": {}}), encoding="utf-8")
            args = quickshare.parser().parse_args(["create", "--input", str(request)])
            with (
                patch.object(quickshare, "load_credential", return_value=("https://unused.example", "qs_" + "d" * 48)),
                patch.object(quickshare, "Client", FakeClient),
            ):
                FakeClient.live_discovery = live
                result = quickshare.execute(args)
        self.assertEqual(result, {"ok": True})
        self.assertEqual(FakeClient.calls, [("PUT", "/runtime-created", {"kind": "future-type", "contents": {}}, None)])

    def test_deprecated_or_unavailable_discovered_operation_is_refused(self):
        unavailable = operation("resources.create", "POST", "/anything", {"type": "object"})
        unavailable["available"] = False
        deprecated = operation("resources.create", "POST", "/anything", {"type": "object"})
        deprecated["deprecated"] = True
        deprecated["replacement"] = "resources.create-v2"
        for live, expected in ((discovery(unavailable), "unavailable"), (discovery(deprecated), "deprecated")):
            with (
                patch.object(quickshare, "load_credential", return_value=("https://unused.example", "qs_" + "e" * 48)),
                patch.object(quickshare, "Client", FakeClient),
            ):
                FakeClient.live_discovery = live
                with self.assertRaisesRegex(quickshare.QuickShareError, expected):
                    quickshare.execute(quickshare.parser().parse_args(["create", "--input-stdin"]))

    def test_future_discovery_effect_on_create_requires_yes_without_crashing(self):
        live = discovery(
            operation(
                "resources.create",
                "POST",
                "/new",
                {"type": "object", "properties": {}, "additionalProperties": False},
                {"disruptive": True, "destructive": False, "confirmation": "Future effect."},
            )
        )
        with tempfile.TemporaryDirectory() as directory:
            request = Path(directory) / "request.json"
            request.write_text("{}", encoding="utf-8")
            args = ["create", "--input", str(request)]
            with (
                patch.object(quickshare, "load_credential", return_value=("https://unused.example", "qs_" + "h" * 48)),
                patch.object(quickshare, "Client", FakeClient),
            ):
                FakeClient.live_discovery = live
                with self.assertRaisesRegex(quickshare.QuickShareError, "Explicit confirmation required"):
                    quickshare.execute(quickshare.parser().parse_args(args))
                result = quickshare.execute(quickshare.parser().parse_args(args + ["--yes"]))
        self.assertEqual(result, {"ok": True})

    def test_save_validates_content_against_current_discovered_resource_type(self):
        live = discovery(
            operation("resources.read", "GET", "/resource/{resourceId}"),
            operation(
                "resources.save",
                "PATCH",
                "/resource/{resourceId}",
                {"type": "object", "required": ["content"], "properties": {"content": {}}, "additionalProperties": False},
            ),
        )
        live["resourceTypes"] = [
            {
                "id": "future-text",
                "available": True,
                "deprecated": False,
                "contentSchema": {"type": "object", "required": ["source"], "properties": {"source": {"type": "string"}}, "additionalProperties": False},
            }
        ]
        with tempfile.TemporaryDirectory() as directory:
            request = Path(directory) / "request.json"
            request.write_text('{"content":{}}', encoding="utf-8")
            with (
                patch.object(quickshare, "load_credential", return_value=("https://unused.example", "qs_" + "i" * 48)),
                patch.object(quickshare, "Client", FakeClient),
            ):
                FakeClient.live_discovery = live
                FakeClient.responses = [{"resource": {"type": "future-text"}}]
                with self.assertRaisesRegex(quickshare.QuickShareError, r"\$\.content"):
                    quickshare.execute(quickshare.parser().parse_args(["save", RESOURCE_ID, "--input", str(request)]))

    def test_disruptive_identifier_requires_yes_and_preflights_live_urls(self):
        live = discovery(
            operation("resources.read", "GET", "/read/{resourceId}"),
            operation(
                "resources.set-identifier",
                "PATCH",
                "/different/{resourceId}/route",
                {"type": "object", "required": ["futureId"], "properties": {"futureId": {"type": "string"}}, "additionalProperties": False},
                {"disruptive": True, "destructive": False, "confirmation": "Route changes now."},
            ),
        )
        with tempfile.TemporaryDirectory() as directory:
            request = Path(directory) / "request.json"
            request.write_text('{"futureId":"new"}', encoding="utf-8")
            base_args = ["identifier", RESOURCE_ID, "--input", str(request)]
            with (
                patch.object(quickshare, "load_credential", return_value=("https://unused.example", "qs_" + "f" * 48)),
                patch.object(quickshare, "Client", FakeClient),
            ):
                FakeClient.live_discovery = live
                FakeClient.responses = [{"resource": {"publishedUrl": "https://s.example/a", "nextPublicUrl": "https://s.example/b"}}]
                with self.assertRaisesRegex(quickshare.QuickShareError, "Current public URL: https://s.example/a"):
                    quickshare.execute(quickshare.parser().parse_args(base_args))
                self.assertEqual(FakeClient.calls, [("GET", f"/read/{RESOURCE_ID}", None, None)])

                FakeClient.calls = []
                FakeClient.responses = [{"resource": {"publishedUrl": "https://s.example/a", "nextPublicUrl": "https://s.example/b"}}, {"ok": "changed"}]
                result = quickshare.execute(quickshare.parser().parse_args(base_args + ["--yes"]))
        self.assertEqual(result, {"ok": "changed"})
        self.assertEqual(FakeClient.calls[1], ("PATCH", f"/different/{RESOURCE_ID}/route", {"futureId": "new"}, None))

    def test_published_delete_has_strong_confirmation_and_runs_only_after_yes(self):
        live = discovery(
            operation("resources.read", "GET", "/resources/{resourceId}"),
            operation(
                "resources.delete",
                "DELETE",
                "/destroy/{resourceId}",
                {"type": "object", "required": ["mode"], "properties": {"mode": {"enum": ["retire-forever"]}}, "additionalProperties": False},
                {"destructive": True, "disruptive": True, "confirmation": "ordinary"},
            ),
        )
        with tempfile.TemporaryDirectory() as directory:
            request = Path(directory) / "request.json"
            request.write_text('{"mode":"retire-forever"}', encoding="utf-8")
            args = ["delete", RESOURCE_ID, "--input", str(request)]
            with (
                patch.object(quickshare, "load_credential", return_value=("https://unused.example", "qs_" + "g" * 48)),
                patch.object(quickshare, "Client", FakeClient),
            ):
                FakeClient.live_discovery = live
                FakeClient.responses = [{"resource": {"everPublished": True}}]
                with self.assertRaisesRegex(quickshare.QuickShareError, "permanently deletes the shared information"):
                    quickshare.execute(quickshare.parser().parse_args(args))
                FakeClient.calls = []
                FakeClient.responses = [{"resource": {"everPublished": True}}, {"deleted": True}]
                result = quickshare.execute(quickshare.parser().parse_args(args + ["--yes"]))
        self.assertEqual(result, {"deleted": True})
        self.assertEqual(FakeClient.calls[1], ("DELETE", f"/destroy/{RESOURCE_ID}", {"mode": "retire-forever"}, None))


if __name__ == "__main__":
    unittest.main()
