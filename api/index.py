import json
import os
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlsplit, unquote
from pathlib import Path
import mimetypes

from api.canvas_sync import CanvasSyncError, fetch_assignments
from api.ai_analysis import AnalysisError, analyze_project



def create_starter_plan(payload):
    if not isinstance(payload, dict):
        raise AnalysisError(400, "INVALID_INPUT", "프로젝트 정보를 입력해주세요.")
    goal = payload.get("goal", "")
    if not isinstance(goal, str) or not goal.strip():
        raise AnalysisError(400, "INVALID_INPUT", "프로젝트 목표를 입력해주세요.")
    analysis = analyze_project({
        "project_name": payload.get("project_name"),
        "goal": goal,
        "due_date": payload.get("due_date") or "",
        "question": "프로젝트 유형: " + str(payload.get("project_type", "personal"))[:80]
            + ". 추가 설명: " + str(payload.get("description", ""))[:600]
            + ". 이 목표를 시작하는 데 필요한 구체적인 작업 3개를 제안해주세요. 일반적인 템플릿을 반복하지 말고 입력한 목표에 맞춰 작성해주세요.",
        "remaining_tasks": [], "completed_tasks": [], "issues": [],
    })
    return [{"title": task["title"], "priority": task["priority"].lower(), "reason": task["reason"]} for task in analysis["next_steps"]]


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
        if not self._path().startswith("/api/"):
            self._serve_static()
            return
        if self._path() != "/api/canvas_sync":
            self._send(404, {"success": False, "message": "API 경로를 찾을 수 없습니다."})
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
            path = self._path()
            if path == "/api/analyze":
                if not payload.get("project_name"):
                    self._send(400, {"success": False, "message": "분석할 프로젝트 정보를 조금 더 입력해주세요."})
                    return
                self._send(200, {"success": True, "provider": "openai-compatible", "analysis": analyze_project(payload)})
            elif path == "/api/starter_plan":
                if not payload.get("project_name") or not payload.get("goal"):
                    self._send(400, {"success": False, "message": "프로젝트 이름과 목표를 입력해주세요."})
                    return
                self._send(200, {"success": True, "provider": "openai-compatible", "tasks": create_starter_plan(payload)})
            elif path == "/api/schedule":
                self._send(200, {"success": True, "schedule": create_schedule(payload)})
            else:
                self._send(404, {"success": False, "message": "API 경로를 찾을 수 없습니다."})
        except AnalysisError as error:
            self._send(error.status, {"success": False, "code": error.code, "message": error.message})
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._send(400, {"success": False, "message": "올바른 JSON 요청이 필요합니다."})
        except Exception:
            self._send(500, {"success": False, "message": "요청을 처리하지 못했습니다."})


    def _serve_static(self):
        root = Path(__file__).resolve().parent.parent
        path = unquote(self._path())
        if path == "/":
            path = "/index.html"
        relative = path.lstrip("/")
        allowed_pages = {
            "index.html", "login.html", "project.html", "insights.html",
            "settings.html", "archive.html",
        }
        asset = Path(relative)
        allowed_asset = (
            asset.parts and asset.parts[0] in {"css", "js"}
            and asset.suffix.lower() in {".css", ".js", ".map"}
        )
        target = (root / relative).resolve()
        if (
            not (relative in allowed_pages or allowed_asset)
            or not target.is_relative_to(root)
            or not target.is_file()
        ):
            self._send(404, {"success": False, "message": "페이지를 찾을 수 없습니다."})
            return
        content = target.read_bytes()
        content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", content_type + "; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(content)

    def _path(self):
        return urlsplit(self.path).path.rstrip("/") or "/"

    def _read_json(self):
        size = int(self.headers.get("content-length", 0))
        if size < 0 or size > 65536:
            raise AnalysisError(413, "REQUEST_TOO_LARGE", "입력 데이터가 너무 큽니다. 작업과 질문을 줄여주세요.")
        return json.loads(self.rfile.read(size) or b"{}")

    def _send(self, status, body):
        encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

