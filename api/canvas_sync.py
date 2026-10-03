import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import quote, urlsplit
import time
import re
from datetime import date, datetime, timezone, timedelta

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


def semester_defaults():
    today = datetime.now(timezone(timedelta(hours=9))).date()
    return today.year, 1 if today.month < 8 else 2


def matches_semester(course, year, semester):
    term = course.get("term") or {}
    if not isinstance(term, dict):
        term = {}
    # Prefer explicit academic labels; old courses may still have active enrollments.
    labels = [str(term.get(key) or "") for key in ("name", "sis_term_id")]
    labels.extend(str(course.get(key) or "") for key in ("name", "course_code", "sis_course_id"))
    season = "spring" if semester == 1 else "fall|autumn"
    patterns = [
        rf"(?<!\d){year}\s*(?:학년도|학년|년도|년)?\s*[-_./ ]*\s*{semester}\s*(?:학기|semester|term|(?=$|[^\d]))",
        rf"(?<!\d){year}[\s_./-]+(?:{season})(?![a-z])",
    ]
    for label in labels:
        if any(re.search(pattern, label, re.I) for pattern in patterns):
            return True
    # A different explicit year/semester must not be rescued by an open course date.
    if any(re.search(r"20\d{2}.*(?:학기|spring|fall|autumn)|20\d{2}[-_/][12](?!\d)", label, re.I) for label in labels):
        return False
    start_month, end_month = (3, 7) if semester == 1 else (9, 1)
    window_start = date(year, start_month, 1)
    window_end = date(year if semester == 1 else year + 1, end_month, 1)
    for dates in (term, course):
        try:
            start = datetime.fromisoformat(dates.get("start_at", "").replace("Z", "+00:00")).date()
            end = datetime.fromisoformat(dates.get("end_at", "").replace("Z", "+00:00")).date()
        except (ValueError, TypeError, AttributeError):
            continue
        if 0 < (end - start).days <= 200 and window_start <= start < window_end:
            return True
    return False


def fetch_assignments(base_url, token, year=None, semester=None):
    default_year, default_semester = semester_defaults()
    year = default_year if year is None else year
    semester = default_semester if semester is None else semester
    base_url = base_url.rstrip("/")
    deadline = time.monotonic() + 40
    courses = _canvas_get(
        f"{base_url}/api/v1/courses",
        token,
        {"enrollment_state": "active", "enrollment_type": "student", "include[]": ["term"], "per_page": 100}, deadline,
    )
    courses = [course for course in courses if matches_semester(course, year, semester)]
    if len(courses) > 50:
        raise CanvasSyncError(422, "canvas_too_many", "선택한 학기의 과목이 50개를 넘습니다. 학기 정보를 확인해주세요.")
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
        raise CanvasSyncError(400, "canvas_token_required", "Canvas API 토큰을 입력해주세요.")
    token = token.strip()
    if len(token) > 4096 or any(character.isspace() for character in token):
        raise CanvasSyncError(400, "canvas_token_invalid", "Canvas API 토큰 형식을 확인해주세요.")
    default_year, default_semester = semester_defaults()
    year, semester = payload.get("year", default_year), payload.get("semester", default_semester)
    if type(year) is not int or not 2000 <= year <= 2100 or type(semester) is not int or semester not in (1, 2):
        raise CanvasSyncError(400, "canvas_invalid_term", "조회할 연도와 학기를 확인해주세요.")
    assignments = fetch_assignments(CANVAS_BASE_URL, token, year, semester)
    return {"success": True, "assignments": assignments,
            "message": f"{year}년 {semester}학기 과제 {len(assignments)}개를 찾았습니다." if assignments else f"{year}년 {semester}학기에서 확인된 과제가 없습니다. 학기 정보가 없는 과목은 제외했습니다."}


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self._send(405, {"success": False, "message": "설정 화면에서 Canvas API 토큰으로 조회해주세요."})

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
