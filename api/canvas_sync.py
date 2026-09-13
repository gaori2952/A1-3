import json
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import quote

import requests


REQUEST_TIMEOUT = 15


class CanvasSyncError(Exception):
    def __init__(self, status, code, message):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


def _canvas_get(url, token, params=None):
    try:
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {token}"},
            params=params,
            timeout=REQUEST_TIMEOUT,
        )
    except requests.RequestException as error:
        raise CanvasSyncError(
            503,
            "canvas_network_error",
            "Canvas 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
        ) from error

    if response.status_code in (401, 403):
        raise CanvasSyncError(
            401,
            "canvas_auth_failed",
            "Canvas 인증에 실패했습니다. 서버의 Canvas 토큰을 확인해주세요.",
        )
    if not response.ok:
        raise CanvasSyncError(
            502,
            "canvas_api_error",
            "Canvas에서 일정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
        )

    try:
        payload = response.json()
    except ValueError as error:
        raise CanvasSyncError(
            502,
            "canvas_api_error",
            "Canvas가 올바르지 않은 응답을 반환했습니다.",
        ) from error

    if not isinstance(payload, list):
        raise CanvasSyncError(
            502,
            "canvas_api_error",
            "Canvas가 예상하지 못한 응답을 반환했습니다.",
        )
    return payload


def fetch_assignments(base_url, token):
    base_url = base_url.rstrip("/")
    courses = _canvas_get(
        f"{base_url}/api/v1/courses",
        token,
        {"enrollment_state": "active", "per_page": 100},
    )
    assignments = []

    for course in courses:
        course_id = course.get("id")
        if course_id is None:
            continue
        course_name = course.get("name") or course.get("course_code") or "이름 없는 과목"
        course_assignments = _canvas_get(
            f"{base_url}/api/v1/courses/{quote(str(course_id), safe='')}/assignments",
            token,
            {"per_page": 100, "order_by": "due_at"},
        )
        for assignment in course_assignments:
            assignment_id = assignment.get("id")
            if assignment_id is None:
                continue
            assignments.append(
                {
                    "course_id": course_id,
                    "course_name": course_name,
                    "assignment_id": assignment_id,
                    "title": assignment.get("name") or "제목 없는 과제",
                    "due_at": assignment.get("due_at"),
                    "html_url": assignment.get("html_url"),
                }
            )

    assignments.sort(key=lambda item: (item["due_at"] is None, item["due_at"] or ""))
    return assignments


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        base_url = os.environ.get("CANVAS_BASE_URL", "").strip()
        token = os.environ.get("CANVAS_TOKEN", "").strip()
        if not token:
            self._send(
                500,
                {
                    "success": False,
                    "code": "canvas_token_missing",
                    "message": "서버에 Canvas 토큰이 설정되지 않았습니다.",
                },
            )
            return
        if not base_url:
            self._send(
                500,
                {
                    "success": False,
                    "code": "canvas_base_url_missing",
                    "message": "서버에 Canvas 주소가 설정되지 않았습니다.",
                },
            )
            return

        try:
            assignments = fetch_assignments(base_url, token)
            message = (
                f"Canvas에서 {len(assignments)}개의 과제를 찾았습니다."
                if assignments
                else "현재 수강 과목에서 조회된 과제가 없습니다."
            )
            self._send(200, {"success": True, "assignments": assignments, "message": message})
        except CanvasSyncError as error:
            self._send(
                error.status,
                {"success": False, "code": error.code, "message": error.message},
            )
        except Exception:
            self._send(
                500,
                {
                    "success": False,
                    "code": "canvas_sync_error",
                    "message": "Canvas 일정을 처리하는 중 오류가 발생했습니다.",
                },
            )

    def _send(self, status, body):
        encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)
