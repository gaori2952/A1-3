# 제출 패키지 안내

## 제출 링크
1. 웹 서비스: https://a1-3-sand.vercel.app
2. GitHub 코드: https://github.com/gaori2952/A1-3
3. README: [서비스 소개·실행·배포·환경 변수](../README.md)
4. 기획서: [서비스 기획서](service-plan.md)
5. 증빙: [서비스 스크린샷](screenshots/), [AI 코딩 협업 기록](ai-coding-conversation.md), [변경 기록](ai-coding-evidence.md)

## 동료가 재현하는 방법
- 공개 URL에서 데모 워크스페이스로 진입합니다.
- 이름 “시험 준비”, 목표 “시험 준비를 꾸준히 진행하기”, 설명 “평일 저녁 45분 가능”으로 AI 일정 추천을 실행합니다.
- 날짜·소요 시간·이유가 나타나면 필요한 일정을 선택해 추가합니다.
- 프로젝트 분석에서 “이번 주 목표를 달성하려면 무엇부터 해야 할까요?”를 입력합니다.
- 요약·다음 작업·위험 대응을 확인합니다.
- 질문을 비우면 입력 안내가 나타나는지 확인합니다.
- 작업을 완료 체크한 뒤 보관함에서 해당 작업을 확인합니다.

모델 결과의 문장은 호출마다 달라질 수 있습니다. 필수값이 없을 때 호출하지 않는지, 정상 입력에 실제 응답이 표시되는지, 실패 시 안내가 있는지를 확인합니다. Canvas 설정은 이 필수 재현 절차에 포함되지 않습니다.

## 스크린샷
| 파일 | 보여주는 내용 |
| --- | --- |
| desktop-dashboard.jpg | 1440px 데스크톱 대시보드 |
| mobile-dashboard.jpg | 390px 모바일 전체 페이지 |
| ai-schedule.jpg | 실제 AI 일정 추천 |
| ai-analysis.jpg | 실제 AI 분석 결과 |
| starter-before.png | AI 코딩 협업 중 제시한 개선 전 화면 |
| ai-long-input.jpg | 293자 질문의 실제 AI 응답 |
| canvas-semester.jpg | 학기 선택 화면 (토큰 직접 입력 이전 화면) |

실제 화면 캡처와 mock 검증은 [verification.md](verification.md)에서 구분합니다. 토큰과 개인 학사 데이터는 제출 자료에 포함하지 않았습니다.
