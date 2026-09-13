import io
import json
import os
import unittest
from unittest.mock import Mock, patch

from api.index import handler


class ApiEntrypointTests(unittest.TestCase):
    def request(self, method, path, payload=None, environment=None):
        body = json.dumps(payload or {}).encode("utf-8")
        target = Mock()
        target.path = path
        target.headers = {"content-length": str(len(body))}
        target.rfile = io.BytesIO(body)
        result = {}
        target._path.side_effect = lambda: handler._path(target)
        target._route.side_effect = lambda: handler._route(target)
        target._read_json.side_effect = lambda: handler._read_json(target)
        target._serve_static.side_effect = lambda: result.update(static=True)
        target._send.side_effect = lambda status, response: result.update(status=status, body=response)
        with patch.dict(os.environ, environment or {}, clear=True):
            getattr(handler, f"do_{method}")(target)
        return result

    def test_analyze_route_uses_the_shared_entrypoint(self):
        result = self.request("POST", "/api/analyze", {"project_name": "Demo"})

        self.assertEqual(result["status"], 200)
        self.assertTrue(result["body"]["success"])

    def test_starter_plan_route_uses_the_shared_entrypoint(self):
        result = self.request("POST", "/api/starter_plan", {"project_name": "Demo", "goal": "Ship"})

        self.assertEqual(result["status"], 200)
        self.assertEqual(len(result["body"]["tasks"]), 6)

    def test_schedule_route_uses_the_shared_entrypoint(self):
        result = self.request("POST", "/api/schedule", {"tasks": [{"id": "task-1"}]})

        self.assertEqual(result["status"], 200)
        self.assertEqual(result["body"]["schedule"][0]["task_id"], "task-1")

    @patch("api.index.fetch_assignments", return_value=[])
    def test_canvas_route_uses_the_shared_entrypoint(self, fetch):
        result = self.request(
            "GET",
            "/api/canvas_sync",
            environment={"CANVAS_BASE_URL": "https://canvas.example.edu", "CANVAS_TOKEN": "secret"},
        )

        self.assertEqual(result["status"], 200)
        fetch.assert_called_once_with("https://canvas.example.edu", "secret")

    def test_unknown_api_route_is_not_found(self):
        result = self.request("GET", "/api/unknown")

        self.assertEqual(result["status"], 404)

    @patch("api.index.fetch_assignments", return_value=[])
    def test_canvas_route_accepts_vercel_api_prefix_stripping(self, fetch):
        result = self.request(
            "GET",
            "/canvas_sync",
            environment={"CANVAS_BASE_URL": "https://canvas.example.edu", "CANVAS_TOKEN": "secret"},
        )

        self.assertEqual(result["status"], 200)
        fetch.assert_called_once_with("https://canvas.example.edu", "secret")

    def test_post_routes_accept_vercel_api_prefix_stripping(self):
        result = self.request("POST", "/analyze", {"project_name": "Demo"})

        self.assertEqual(result["status"], 200)

    def test_root_request_serves_the_static_application(self):
        result = self.request("GET", "/")

        self.assertTrue(result["static"])


if __name__ == "__main__":
    unittest.main()
