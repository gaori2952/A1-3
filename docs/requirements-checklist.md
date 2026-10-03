# 요구사항별 구현 근거

## 필수 제출 5종
| 결과물 | 구현·제출 위치 |
| --- | --- |
| Vercel 웹 서비스 | https://a1-3-sand.vercel.app |
| GitHub 저장소 | HTML·css/·js/·api/·requirements.txt, main 커밋 이력 |
| README | 서비스 소개·사용 흐름·기술·실행·배포·환경 변수·이미지 |
| 서비스 기획서 | [service-plan.md](service-plan.md) |
| 증빙 자료 | [screenshots/](screenshots/), [AI 코딩 협업 기록](ai-coding-conversation.md) |

## 기능 요구사항
| 요구사항 | 구현 근거 | 확인 방법 |
| --- | --- | --- |
| 목적·타겟·페이지·AI 정의 | service-plan.md | 서비스 목적과 AI 입력/출력/실패 기준 |
| 프로젝트 구조·커밋 | 루트 HTML, css/, js/, api/, requirements.txt | GitHub 파일과 변경 이력 |
| 순수 HTML/CSS/JS | 프레임워크 없는 6개 페이지 | 데모에서 메뉴 이동 |
| 반응형·2개 이상 크기 | CSS 미디어 쿼리, 데스크톱/모바일 증빙 | verification.md |
| 입력 → AI 결과 | starter_plan, analyze | 실제 AI 응답 이미지와 재현 절차 |
| 실패 안내 | 빈 입력·API 오류·지연·시간 초과 | verification.md, Python tests |
| Python Serverless Function | api/index.py, api/ai_analysis.py | pyproject.toml 진입점 |
| 패키지 정의 | requests in requirements.txt | 로컬 설치·테스트 |
| 프론트 fetch | dashboard.js, insights.js | /api/... POST 요청 |
| GitHub ↔ Vercel | main 자동 배포 | Ready 배포와 공개 URL |
| 문서·증빙·기획서 | docs/ | submission.md에서 모두 연결 |

## 설명할 수 있어야 하는 내용
| 학습 목표 | 설명 자료 |
| --- | --- |
| HTML/CSS/JavaScript의 역할 | architecture.md |
| 입력 → fetch → 응답 → 화면 | architecture.md의 요청 흐름 |
| Python Serverless Functions | architecture.md의 라우팅 |
| 환경 변수의 이유 | architecture.md, setup-and-deployment.md |
| 로컬과 배포의 차이 | setup-and-deployment.md |
| 오류 원인과 수정·재배포 | architecture.md의 실제 오류 사례 |

## 보안·제약
AI 키와 Canvas 토큰은 서버 환경 변수로 관리합니다. .env는 Git에서 제외하며 .env.example에는 안내용 자리표시자만 있습니다. 스크린샷은 데모 데이터로 촬영했습니다. 원문 과제의 예시 서비스를 복제하지 않고 개인 프로젝트 일정 관리로 기획했습니다.

## 선택 과제
작업·선택한 AI 일정의 브라우저 저장과 버튼 상태 전환을 구현했습니다. 외부 자동화·알림·방문자 분석·다크 모드는 필수 구현 범위에 포함하지 않습니다. Canvas 연동은 운영자 개인 설정이 필요한 선택 기능입니다.
