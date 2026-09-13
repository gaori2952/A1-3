import json
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            size = int(self.headers.get("content-length", 0))
            payload = json.loads(self.rfile.read(size) or b"{}")
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
                schedule.append({"task_id": task.get("id"), "planned_date": planned.isoformat(), "reason": "우선순위와 남은 기간을 고려해 배치했습니다."})
            self._send(200, {"success": True, "schedule": schedule})
        except Exception:
            self._send(500, {"success": False, "message": "일정을 생성하지 못했습니다."})

    def _send(self, status, body):
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)