import io
import json
import os
import unittest
from unittest.mock import Mock, patch

import requests

from api.canvas_sync import fetch_assignments, handler, canvas_result, CanvasSyncError, matches_semester


class FakeResponse:
    def __init__(self, status_code, payload):
        self.status_code = status_code
        self._payload = payload
        self.ok = 200 <= status_code < 300
        self.links = {}

    def json(self):
        return self._payload


class CanvasSyncTests(unittest.TestCase):
    def invoke_handler(self, environment):
        result = {}
        fake_handler = Mock()
        fake_handler._send.side_effect = lambda status, body: result.update(status=status, body=body)
        body = json.dumps({"access_code": "test-access", "year": 2026, "semester": 2}).encode()
        fake_handler.headers = {"content-length": str(len(body))}
        fake_handler.rfile = io.BytesIO(body)
        with patch.dict(os.environ, {**environment, "CANVAS_ACCESS_CODE": "test-access"}, clear=True):
            handler.do_POST(fake_handler)
        return result

    def test_missing_token_is_reported_without_exposing_a_secret(self):
        result = self.invoke_handler({"CANVAS_BASE_URL": "https://canvas.example.edu"})

        self.assertEqual(result["status"], 503)
        self.assertEqual(result["body"]["code"], "canvas_not_configured")
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
            FakeResponse(200, [{"id": 7, "name": "수리물리학2", "term": {"name": "2026학년도 2학기"}}]),
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

        assignments = fetch_assignments("https://canvas.example.edu/", "secret", 2026, 2)

        self.assertEqual([item["assignment_id"] for item in assignments], [1, 2])
        self.assertEqual(assignments[0]["course_name"], "수리물리학2")
        self.assertIsNone(assignments[1]["due_at"])
        self.assertEqual(get.call_args_list[0].kwargs["params"]["enrollment_state"], "active")
        self.assertEqual(get.call_args_list[1].kwargs["params"]["order_by"], "due_at")

    @patch("api.canvas_sync.requests.get")
    def test_multiple_courses_are_combined(self, get):
        get.side_effect = [
            FakeResponse(200, [{"id": 1, "name": "과목 A", "term": {"name": "2026-2"}}, {"id": 2, "name": "과목 B", "term": {"name": "2026-2"}}]),
            FakeResponse(200, [{"id": 10, "name": "과제 A", "due_at": None}]),
            FakeResponse(200, [{"id": 20, "name": "과제 B", "due_at": None}]),
        ]

        assignments = fetch_assignments("https://canvas.example.edu", "secret", 2026, 2)

        self.assertEqual({item["course_name"] for item in assignments}, {"과목 A", "과목 B"})

    @patch("api.canvas_sync.requests.get")
    def test_no_assignments_returns_a_successful_empty_result(self, get):
        get.side_effect = [FakeResponse(200, [{"id": 1, "name": "과목", "term": {"name": "2026-2"}}]), FakeResponse(200, [])]

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

    @patch("api.canvas_sync.requests.get")
    def test_pagination_follows_only_same_host(self, get):
        first = FakeResponse(200, [])
        first.links = {"next": {"url": "https://evil.example/api/v1/courses"}}
        get.return_value = first
        with self.assertRaises(CanvasSyncError):
            fetch_assignments("https://canvas.skku.edu", "private-token", 2026, 2)
        self.assertEqual(get.call_count, 1)
        self.assertFalse(get.call_args.kwargs['allow_redirects'])

    @patch("api.canvas_sync.requests.get")
    def test_pagination_keeps_all_courses(self, get):
        first = FakeResponse(200, [])
        first.links = {"next": {"url": "https://canvas.skku.edu/api/v1/courses?page=2"}}
        get.side_effect = [first, FakeResponse(200, [{"id": 1, "term": {"name": "2026-2"}}]), FakeResponse(200, [])]
        self.assertEqual(fetch_assignments("https://canvas.skku.edu", "private-token", 2026, 2), [])
        self.assertEqual(get.call_count, 3)

    @patch("api.canvas_sync.fetch_assignments")
    def test_server_saved_token_never_used_without_access_code(self, fetch):
        with patch.dict(os.environ, {"CANVAS_TOKEN": "server-secret"}):
            with self.assertRaises(CanvasSyncError):
                canvas_result({})
        fetch.assert_not_called()

    def test_semester_labels_and_date_fallback(self):
        for label in ['2026학년도 2학기', '2026-2', '2026 Fall', '2026_2']:
            self.assertTrue(matches_semester({'term': {'name': label}}, 2026, 2))
        for label in ['2025학년도 2학기', '2026-1', '2026 여름학기', 'Default Term']:
            self.assertFalse(matches_semester({'term': {'name': label}}, 2026, 2))
        self.assertTrue(matches_semester({'term': {'start_at': '2026-09-01T00:00:00Z', 'end_at': '2026-12-31T00:00:00Z'}}, 2026, 2))
        self.assertFalse(matches_semester({'start_at': '2020-01-01', 'end_at': '2030-01-01'}, 2026, 2))

    @patch("api.canvas_sync.requests.get")
    def test_old_courses_are_filtered_before_limit_and_assignment_calls(self, get):
        courses = [{'id': i, 'term': {'name': '2025-2'}} for i in range(60)]
        courses.append({'id': 99, 'name': '이번학기', 'term': {'name': '2026-2'}})
        get.side_effect = [FakeResponse(200, courses), FakeResponse(200, [{'id': 1, 'name': '과제', 'due_at': None}])]
        result = fetch_assignments('https://canvas.skku.edu', 'secret', 2026, 2)
        self.assertEqual(len(result), 1)
        self.assertEqual(get.call_count, 2)
        self.assertIn('/courses/99/assignments', get.call_args.args[0])

    @patch("api.canvas_sync.fetch_assignments", return_value=[])
    def test_valid_access_uses_only_server_token(self, fetch):
        with patch.dict(os.environ, {"CANVAS_TOKEN": "server-secret", "CANVAS_ACCESS_CODE": "private-code"}, clear=True):
            canvas_result({"access_code": "private-code", "token": "injected", "year": 2026, "semester": 2})
        fetch.assert_called_once_with('https://canvas.skku.edu', 'server-secret', 2026, 2)

    @patch("api.canvas_sync.fetch_assignments")
    def test_wrong_access_cannot_fetch_personal_assignments(self, fetch):
        with patch.dict(os.environ, {"CANVAS_TOKEN": "server-secret", "CANVAS_ACCESS_CODE": "private-code"}, clear=True):
            with self.assertRaises(CanvasSyncError) as caught:
                canvas_result({"access_code": "wrong"})
            self.assertEqual(caught.exception.status, 401)
            self.assertNotIn('server-secret', caught.exception.message)
        fetch.assert_not_called()


if __name__ == "__main__":
    unittest.main()
