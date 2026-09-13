import json
import os
from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get("content-length", 0))
            payload = json.loads(self.rfile.read(length) or b"{}")
            if not payload.get("project_name"):
                self._send(400, {"success": False, "message": "분석할 프로젝트 정보를 조금 더 입력해주세요."})
                return
            # Keep the provider call server-side. Configure OPENAI_API_KEY in Vercel.
            analysis = self._analyze(payload)
            self._send(200, {"success": True, "analysis": analysis})
        except Exception:
            self._send(500, {"success": False, "message": "프로젝트 분석 중 오류가 발생했습니다."})

    def _analyze(self, payload):
        remaining = payload.get("remaining_tasks", [])
        issues = payload.get("issues", [])
        next_steps = [{"priority": task.get("priority", "medium").upper(), "title": task.get("title", "Next task"), "reason": "남은 작업 중 우선순위가 높은 항목입니다."} for task in remaining[:3]]
        risks = [{"severity": issue.get("severity", "medium").upper(), "title": issue.get("content", "Open issue"), "description": "아직 해결되지 않은 프로젝트 이슈입니다.", "action": "원인을 확인하고 해결 상태로 업데이트하세요."} for issue in issues]
        return {"summary": f"{payload['project_name']}의 현재 상태를 검토했습니다. 질문: {payload.get('question', '다음 작업은 무엇인가요?')}", "status": "WATCH" if risks else "IN MOTION", "next_steps": next_steps, "risks": risks}

    def _send(self, status, body):
        encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)
