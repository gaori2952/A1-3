import os
import unittest
from unittest.mock import Mock, patch
import requests
from api.ai_analysis import AnalysisError, analyze_project
from api.index import create_starter_plan


class AiAnalysisTests(unittest.TestCase):
    payload = {"project_name": "과제", "goal": "서비스 배포", "question": "무엇부터 할까?"}
    result = {"summary": "먼저 실제 API 연결을 검증하세요.", "status": "WATCH", "next_steps": [{"priority": "HIGH", "title": "가상 키 설정", "reason": "실제 호출에 필요합니다."}], "risks": []}

    def response(self, content=None, status=200):
        import json
        return Mock(status_code=status, json=Mock(return_value={"choices": [{"finish_reason": "stop", "message": {"content": json.dumps(content or self.result)}}]}))

    def test_blank_question_never_calls_provider(self):
        with patch("api.ai_analysis.requests.post") as post:
            with self.assertRaises(AnalysisError) as caught:
                analyze_project({**self.payload, "question": "  "})
            self.assertEqual(caught.exception.status, 400)
            post.assert_not_called()

    def test_missing_key_never_calls_provider(self):
        with patch.dict(os.environ, {}, clear=True), patch("api.ai_analysis.requests.post") as post:
            with self.assertRaises(AnalysisError) as caught:
                analyze_project(self.payload)
            self.assertEqual(caught.exception.code, "AI_NOT_CONFIGURED")
            post.assert_not_called()

    @patch.dict(os.environ, {"OPENAI_API_KEY": "test-only", "OPENAI_MODEL": "gpt-5-mini", "OPENAI_BASE_URL": "https://copa.codyssey.kr/v1"})
    def test_chat_endpoint_and_safe_data(self):
        with patch("api.ai_analysis.requests.post", return_value=self.response()) as post:
            self.assertEqual(analyze_project(self.payload), self.result)
            args, kwargs = post.call_args
            self.assertEqual(args[0], "https://copa.codyssey.kr/v1/chat/completions")
            self.assertEqual(kwargs['headers']['Authorization'], 'Bearer test-only')
            self.assertEqual(kwargs['json']['model'], 'gpt-5-mini')
            self.assertEqual(len(kwargs['json']['messages']), 2)

    @patch.dict(os.environ, {"OPENAI_API_KEY": "test-only"})
    def test_provider_failures_do_not_return_fake_success(self):
        for status, code in [(401, 'AI_AUTH_ERROR'), (429, 'AI_RATE_LIMIT'), (500, 'AI_PROVIDER_ERROR')]:
            with self.subTest(status=status), patch("api.ai_analysis.requests.post", return_value=self.response(status=status)):
                with self.assertRaises(AnalysisError) as caught:
                    analyze_project(self.payload)
                self.assertEqual(caught.exception.code, code)

    @patch.dict(os.environ, {"OPENAI_API_KEY": "test-only"})
    def test_timeout_and_invalid_json(self):
        with patch("api.ai_analysis.requests.post", side_effect=requests.Timeout):
            with self.assertRaises(AnalysisError) as caught:
                analyze_project(self.payload)
            self.assertEqual(caught.exception.status, 504)
        response = self.response()
        response.json.return_value['choices'][0]['message']['content'] = 'not JSON'
        with patch("api.ai_analysis.requests.post", return_value=response):
            with self.assertRaises(AnalysisError) as caught:
                analyze_project(self.payload)
            self.assertEqual(caught.exception.code, 'AI_INVALID_RESPONSE')

    @patch("api.index.analyze_project")
    def test_starter_uses_goal_specific_ai(self, analyze):
        analyze.return_value = self.result
        tasks = create_starter_plan({"project_name": "과제", "goal": "서비스 배포", "project_type": "school"})
        self.assertEqual(tasks[0]['title'], '가상 키 설정')
        self.assertEqual(analyze.call_args.args[0]['goal'], '서비스 배포')
        self.assertIn('school', analyze.call_args.args[0]['question'])


if __name__ == '__main__':
    unittest.main()
