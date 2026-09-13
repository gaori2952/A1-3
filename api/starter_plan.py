import json
from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            size = int(self.headers.get("content-length", 0))
            payload = json.loads(self.rfile.read(size) or b"{}")
            if not payload.get("project_name") or not payload.get("goal"):
                self._send(400, {"success": False, "message": "프로젝트 이름과 목표를 입력해주세요."})
                return
            self._send(200, {"success": True, "tasks": self._suggest(payload)})
        except Exception:
            self._send(500, {"success": False, "message": "시작 플랜을 만들지 못했습니다."})

    def _suggest(self, payload):
        if payload.get("project_type") == "study":
            titles = ["시험 범위 확인", "주차별 핵심 개념 정리", "핵심 공식 정리", "연습문제 1차 풀이", "오답노트 정리", "최종 복습 계획 만들기"]
        else:
            titles = ["핵심 목표와 완료 기준 정리", "기본 구조 설계", "첫 결과물 만들기", "핵심 기능 구현", "검토와 오류 수정", "배포 전 점검"]
        return [{"title": title, "priority": "high" if index < 2 else "medium" if index < 5 else "low", "reason": "프로젝트 목표를 실행 가능한 단계로 나누기 위한 작업입니다."} for index, title in enumerate(titles)]

    def _send(self, status, body):
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)