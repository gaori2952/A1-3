import json
import mimetypes
import os
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit

from api.canvas_sync import CanvasSyncError, fetch_assignments


ROOT_DIR = Path(__file__).resolve().parents[1]
STATIC_DIRECTORIES = {"css", "js"}
STATIC_ROOT_FILES = {
    "archive.html",
    "index.html",
    "insights.html",
    "login.html",
    "project.html",
    "settings.html",
}


def analyze_project(payload):
    remaining = payload.get("remaining_tasks", [])
    issues = payload.get("issues", [])
    next_steps = [
        {
            "priority": task.get("priority", "medium").upper(),
            "title": task.get("title", "Next task"),
            "reason": "남은 작업 중 우선순위가 높은 항목입니다.",
        }
        for task in remaining[:3]
    ]
    risks = [
        {
            "severity": issue.get("severity", "medium").upper(),
            "title": issue.get("content", "Open issue"),
            "description": "아직 해결되지 않은 프로젝트 이슈입니다.",
            "action": "원인을 확인하고 해결 상태로 업데이트하세요.",
        }
        for issue in issues
    ]
    return {
        "summary": f"{payload['project_name']}의 현재 상태를 검토했습니다. 질문: {payload.get('question', '다음 작업은 무엇인가요?')}",
        "status": "WATCH" if risks else "IN MOTION",
        "next_steps": next_steps,
        "risks": risks,
    }


def create_starter_plan(payload):
    if payload.get("project_type") == "study":
        titles = [
            "시험 범위 확인",
            "주차별 핵심 개념 정리",
            "핵심 공식 정리",
            "연습문제 1차 풀이",
            "오답노트 정리",
            "최종 복습 계획 만들기",
        ]
    else:
        titles = [
            "핵심 목표와 완료 기준 정리",
            "기본 구조 설계",
            "첫 결과물 만들기",
            "핵심 기능 구현",
            "검토와 오류 수정",
            "배포 전 점검",
        ]
    return [
        {
            "title": title,
            "priority": "high" if index < 2 else "medium" if index < 5 else "low",
            "reason": "프로젝트 목표를 실행 가능한 단계로 나누기 위한 작업입니다.",
        }
        for index, title in enumerate(titles)
    ]


def create_schedule(payload):
    action = payload.get("action", "create")
    tasks = [task for task in payload.get("tasks", []) if not task.get("completed")]
    settings = payload.get("settings", {})
    limit = max(1, min(8, int(settings.get("daily_task_limit", 3))))
    start = date.today()
    schedule = []
    for index, task in enumerate(tasks):
        if action == "create" and task.get("planned_date") and settings.get("keep_existing", True):
            continue
        planned = start + timedelta(days=index // limit)
        schedule.append(
            {
                "task_id": task.get("id"),
                "planned_date": planned.isoformat(),
                "reason": "우선순위와 남은 기간을 고려해 배치했습니다.",
            }
        )
    return schedule


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        route = self._route()
        if route != "canvas_sync":
            if self._path().startswith("/api/"):
                self._send(404, {"success": False, "message": "API 경로를 찾을 수 없습니다."})
            else:
                self._serve_static()
            return

        base_url = os.environ.get("CANVAS_BASE_URL", "").strip()
        token = os.environ.get("CANVAS_TOKEN", "").strip()
        if not token:
            self._send(500, {"success": False, "code": "canvas_token_missing", "message": "서버에 Canvas 토큰이 설정되지 않았습니다."})
            return
        if not base_url:
            self._send(500, {"success": False, "code": "canvas_base_url_missing", "message": "서버에 Canvas 주소가 설정되지 않았습니다."})
            return

        try:
            assignments = fetch_assignments(base_url, token)
            message = f"Canvas에서 {len(assignments)}개의 과제를 찾았습니다." if assignments else "현재 수강 과목에서 조회된 과제가 없습니다."
            self._send(200, {"success": True, "assignments": assignments, "message": message})
        except CanvasSyncError as error:
            self._send(error.status, {"success": False, "code": error.code, "message": error.message})
        except Exception:
            self._send(500, {"success": False, "code": "canvas_sync_error", "message": "Canvas 일정을 처리하는 중 오류가 발생했습니다."})

    def do_POST(self):
        try:
            payload = self._read_json()
            route = self._route()
            if route == "analyze":
                if not payload.get("project_name"):
                    self._send(400, {"success": False, "message": "분석할 프로젝트 정보를 조금 더 입력해주세요."})
                    return
                self._send(200, {"success": True, "analysis": analyze_project(payload)})
            elif route == "starter_plan":
                if not payload.get("project_name") or not payload.get("goal"):
                    self._send(400, {"success": False, "message": "프로젝트 이름과 목표를 입력해주세요."})
                    return
                self._send(200, {"success": True, "tasks": create_starter_plan(payload)})
            elif route == "schedule":
                self._send(200, {"success": True, "schedule": create_schedule(payload)})
            else:
                self._send(404, {"success": False, "message": "API 경로를 찾을 수 없습니다."})
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._send(400, {"success": False, "message": "올바른 JSON 요청이 필요합니다."})
        except Exception:
            self._send(500, {"success": False, "message": "요청을 처리하지 못했습니다."})

    def _path(self):
        return urlsplit(self.path).path.rstrip("/") or "/"

    def _route(self):
        path = self._path()
        if path.startswith("/api/"):
            path = path[5:]
        else:
            path = path.lstrip("/")
        return path

    def _read_json(self):
        size = int(self.headers.get("content-length", 0))
        return json.loads(self.rfile.read(size) or b"{}")

    def _serve_static(self):
        requested = self._path().lstrip("/") or "index.html"
        parts = Path(requested).parts
        allowed = requested in STATIC_ROOT_FILES or (parts and parts[0] in STATIC_DIRECTORIES)
        target = (ROOT_DIR / requested).resolve()
        if not allowed or ROOT_DIR not in target.parents or not target.is_file():
            self._send(404, {"success": False, "message": "페이지를 찾을 수 없습니다."})
            return

        content = target.read_bytes()
        content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        if content_type.startswith("text/") or content_type in {"application/javascript", "application/json"}:
            content_type += "; charset=utf-8"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def _send(self, status, body):
        encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)
