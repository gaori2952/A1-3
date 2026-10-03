import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import quote, urlsplit
import time

import requests


REQUEST_TIMEOUT = 15
CANVAS_BASE_URL = "https://canvas.skku.edu"


class CanvasSyncError(Exception):
    def __init__(self, status, code, message):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


def _canvas_get(url, token, params=None, deadline=None):
    origin = urlsplit(url)
    items = []
    for page in range(20):
        if deadline is not None and time.monotonic() >= deadline:
            raise CanvasSyncError(504, "canvas_timeout", "조회 시간이 길어지고 있습니다. 잠시 후 다시 시도해주세요.")
        try:
            response = requests.get(url, headers={"Authorization": f"Bearer {token}"}, params=params,
                                    timeout=REQUEST_TIMEOUT, allow_redirects=False)
        except requests.RequestException as error:
            raise CanvasSyncError(503, "canvas_network_error", "Canvas 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.") from error
        if response.status_code in (401, 403):
            raise CanvasSyncError(401, "canvas_auth_failed", "Canvas 인증에 실패했습니다. 토큰의 유효 기간과 조회 권한을 확인해주세요.")
        if not response.ok or 300 <= response.status_code < 400:
            raise CanvasSyncError(502, "canvas_api_error", "Canvas에서 과제를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.")
        try:
            payload = response.json()
        except ValueError as error:
            raise CanvasSyncError(502, "canvas_api_error", "Canvas 응답을 읽지 못했습니다.") from error
        if not isinstance(payload, list) or any(not isinstance(item, dict) for item in payload):
            raise CanvasSyncError(502, "canvas_api_error", "Canvas 응답 형식이 올바르지 않습니다.")
        items.extend(payload)
        next_url = getattr(response, "links", {}).get("next", {}).get("url")
        if not next_url:
            return items
        parsed = urlsplit(next_url)
        if parsed.scheme != "https" or parsed.netloc != origin.netloc or not parsed.path.startswith("/api/v1/"):
            raise CanvasSyncError(502, "canvas_api_error", "Canvas 조회 주소를 확인할 수 없습니다.")
        url, params = next_url, None
    raise CanvasSyncError(422, "canvas_too_many", "조회할 과제가 너무 많습니다. Canvas에서 과목 상태를 확인해주세요.")


def fetch_assignments(base_url, token):
    base_url = base_url.rstrip("/")
    deadline = time.monotonic() + 40
    courses = _canvas_get(
        f"{base_url}/api/v1/courses",
        token,
        {"enrollment_state": "active", "enrollment_type": "student", "per_page": 100}, deadline,
    )
    if len(courses) > 50:
        raise CanvasSyncError(422, "canvas_too_many", "현재 수강 과목이 너무 많습니다.")
    assignments = []

    for course in courses:
        course_id = course.get("id")
        if course_id is None:
            continue
        course_name = course.get("name") or course.get("course_code") or "이름 없는 과목"
        course_assignments = _canvas_get(
            f"{base_url}/api/v1/courses/{quote(str(course_id), safe='')}/assignments",
            token,
            {"per_page": 100, "order_by": "due_at"}, deadline,
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


def canvas_result(payload):
    token = payload.get("token") if isinstance(payload, dict) else None
    if not isinstance(token, str) or not token.strip():
        raise CanvasSyncError(400, "canvas_token_missing", "본인의 Canvas API 토큰을 입력해주세요.")
    token = token.strip()
    if len(token) > 4096 or any(character.isspace() for character in token):
        raise CanvasSyncError(400, "canvas_token_invalid", "Canvas 토큰 형식을 확인해주세요.")
    assignments = fetch_assignments(CANVAS_BASE_URL, token)
    return {"success": True, "assignments": assignments,
            "message": f"Canvas에서 {len(assignments)}개의 과제를 찾았습니다." if assignments else "현재 수강 과목에서 조회된 과제가 없습니다."}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self._send(405, {"success": False, "message": "설정 화면에서 본인 토큰으로 조회해주세요."})

    def do_POST(self):
        try:
            size = int(self.headers.get("content-length", 0))
            if not 0 < size <= 8192:
                self._send(413, {"success": False, "message": "입력 크기를 확인해주세요."})
                return
            self._send(200, canvas_result(json.loads(self.rfile.read(size))))
        except CanvasSyncError as error:
            self._send(error.status, {"success": False, "code": error.code, "message": error.message})
        except (ValueError, UnicodeDecodeError):
            self._send(400, {"success": False, "message": "입력 형식을 확인해주세요."})
        except Exception:
            self._send(500, {"success": False, "message": "Canvas 과제를 조회하지 못했습니다."})

    def _send(self, status, body):
        encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)
