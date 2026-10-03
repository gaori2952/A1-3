# 검증 및 제출 현황

## 필수 제출 자료

| 평가 항목 | 제출 위치 |
| --- | --- |
| 배포된 서비스 | https://a1-3-sand.vercel.app |
| GitHub 코드 | https://github.com/gaori2952/A1-3 |
| README | [README.md](../README.md) |
| 서비스 기획서 | [service-plan.md](service-plan.md) |
| 데스크톱·모바일·AI 기능 증빙 | [screenshots/](screenshots/) |
| AI 코딩 도구 사용 과정 | [AI 코딩 협업 기록](ai-coding-conversation.md), [변경 기록](ai-coding-evidence.md) |

## 화면 증빙

모든 서비스 이미지는 2026년 10월 3일 실제 배포 URL에서 촬영했습니다. 데모 데이터이며 토큰과 개인 Canvas 과제는 포함하지 않았습니다.

- [데스크톱 대시보드](screenshots/desktop-dashboard.jpg): 1440 × 1000.
- [모바일 대시보드](screenshots/mobile-dashboard.jpg): 390px, 전체 페이지.
- [AI 일정 추천](screenshots/ai-schedule.jpg): 날짜·소요 시간 출력, 선택한 작업 예정일 저장 확인.
- [AI 분석](screenshots/ai-analysis.jpg): 실제 Codyssey 응답의 요약·다음 작업·위험 대응.
- [Canvas 학기 선택](screenshots/canvas-semester.jpg): 토큰 없는 설정 화면. 과제 조회 성공 증빙이 아닙니다.
- [사용자가 제공한 개선 전 화면](screenshots/starter-before.png): 고정 추천과 UI 개선 요청의 원본 첨부 이미지.

## 검증 결과

Python unittest 28개 통과. API 응답·인증 오류·쿼터·타임아웃·잘못된 JSON·Canvas 토큰 없는 조회 차단·페이지네이션·학기 필터를 mock으로 검증했습니다. JavaScript 문법 확인도 통과했습니다.

배포에서 대시보드 → 프로젝트 → AI 분석 이동, 두 화면 크기에서 표시, 빈 질문·API 연결 오류 안내를 확인했습니다. Codyssey 가상 키 등록과 재배포 후 실제 분석 응답과 일정 추천·예정일 저장을 확인했습니다.

Canvas는 선택 기능입니다. 이번 학기 필터는 테스트와 배포 설정 화면에서 확인했으며, 본인 토큰을 이용한 실제 과제 조회 성공은 아직 확인하지 않았습니다.

보관함은 완료 체크한 작업과 모든 작업이 완료된 프로젝트를 포함합니다. 기존 데이터의 프로젝트 status가 active여도 완료 이력을 표시하며, 빈 프로젝트나 단순히 마감일이 지난 미완료 작업은 완료로 분류하지 않습니다.
