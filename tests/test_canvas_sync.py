import json
import os
import unittest
from unittest.mock import Mock, patch

import requests

from api.canvas_sync import fetch_assignments, handler


class FakeResponse:
    def __init__(self, status_code, payload):
        self.status_code = status_code
        self._payload = payload
        self.ok = 200 <= status_code < 300

    def json(self):
        return self._payload


class CanvasSyncTests(unittest.TestCase):
    def invoke_handler(self, environment):
        result = {}
        fake_handler = Mock()
        fake_handler._send.side_effect = lambda status, body: result.update(status=status, body=body)
        with patch.dict(os.environ, environment, clear=True):
            handler.do_GET(fake_handler)
        return result

    def test_missing_token_is_reported_without_exposing_a_secret(self):
        result = self.invoke_handler({"CANVAS_BASE_URL": "https://canvas.example.edu"})

        self.assertEqual(result["status"], 500)
        self.assertEqual(result["body"]["code"], "canvas_token_missing")
        self.assertNotIn("Bearer", json.dumps(result["body"]))

    @patch("api.canvas_sync.requests.get")
    def test_invalid_token_returns_authentication_error(self, get):
        get.return_value = FakeResponse(401, {})

        result = self.invoke_handler(
            {"CANVAS_BASE_URL": "https://canvas.example.edu", "CANVAS_TOKEN": "secret"}
        )

        self.assertEqual(result["status"], 401)
        self.assertEqual(result["body"]["code"], "canvas_auth_failed")
        self.assertNotIn("secret", json.dumps(result["body"]))

    @patch("api.canvas_sync.requests.get")
    def test_assignments_are_normalized_and_sorted(self, get):
        get.side_effect = [
            FakeResponse(200, [{"id": 7, "name": "수리물리학2"}]),
            FakeResponse(
                200,
                [
                    {"id": 2, "name": "기말 과제", "due_at": None, "html_url": None},
                    {
                        "id": 1,
                        "name": "Homework 3",
                        "due_at": "2026-09-18T14:59:00Z",
                        "html_url": "https://canvas.example.edu/a/1",
                    },
                ],
            ),
        ]

        assignments = fetch_assignments("https://canvas.example.edu/", "secret")

        self.assertEqual([item["assignment_id"] for item in assignments], [1, 2])
        self.assertEqual(assignments[0]["course_name"], "수리물리학2")
        self.assertIsNone(assignments[1]["due_at"])
        self.assertEqual(get.call_args_list[0].kwargs["params"]["enrollment_state"], "active")
        self.assertEqual(get.call_args_list[1].kwargs["params"]["order_by"], "due_at")

    @patch("api.canvas_sync.requests.get")
    def test_multiple_courses_are_combined(self, get):
        get.side_effect = [
            FakeResponse(200, [{"id": 1, "name": "과목 A"}, {"id": 2, "name": "과목 B"}]),
            FakeResponse(200, [{"id": 10, "name": "과제 A", "due_at": None}]),
            FakeResponse(200, [{"id": 20, "name": "과제 B", "due_at": None}]),
        ]

        assignments = fetch_assignments("https://canvas.example.edu", "secret")

        self.assertEqual({item["course_name"] for item in assignments}, {"과목 A", "과목 B"})

    @patch("api.canvas_sync.requests.get")
    def test_no_assignments_returns_a_successful_empty_result(self, get):
        get.side_effect = [FakeResponse(200, [{"id": 1, "name": "과목"}]), FakeResponse(200, [])]

        result = self.invoke_handler(
            {"CANVAS_BASE_URL": "https://canvas.example.edu", "CANVAS_TOKEN": "secret"}
        )

        self.assertEqual(result["status"], 200)
        self.assertEqual(result["body"]["assignments"], [])
        self.assertIn("없습니다", result["body"]["message"])

    @patch("api.canvas_sync.requests.get")
    def test_canvas_api_failure_is_distinct_from_authentication(self, get):
        get.return_value = FakeResponse(500, {})

        result = self.invoke_handler(
            {"CANVAS_BASE_URL": "https://canvas.example.edu", "CANVAS_TOKEN": "secret"}
        )

        self.assertEqual(result["status"], 502)
        self.assertEqual(result["body"]["code"], "canvas_api_error")

    @patch("api.canvas_sync.requests.get")
    def test_network_failure_is_reported(self, get):
        get.side_effect = requests.ConnectionError("network down")

        result = self.invoke_handler(
            {"CANVAS_BASE_URL": "https://canvas.example.edu", "CANVAS_TOKEN": "secret"}
        )

        self.assertEqual(result["status"], 503)
        self.assertEqual(result["body"]["code"], "canvas_network_error")


if __name__ == "__main__":
    unittest.main()
