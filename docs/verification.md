# 검증 결과

## 자동 검증
외부 AI와 Canvas API는 mock으로 대체합니다. 모델 호출 성공 증빙은 별도의 실제 화면으로 제공합니다.

- Python 테스트 30개 통과: 입력·라우팅·AI 인증/쿼터/타임아웃/응답 검증·Canvas 학기 필터/페이지네이션/개인 접근 검증.
- JavaScript 회귀 테스트 3개: 기존 완료 작업, 프로젝트 전체 완료, 타 사용자/빈 프로젝트/지난 마감일 처리.
- JavaScript 문법 확인: dashboard.js, insights.js, settings.js.

## 실제 배포에서 확인한 내용
- 대시보드 → 프로젝트 → AI 분석 메뉴 이동.
- 데스크톱 1440px·태블릿 768px·모바일 390px에서 페이지 전체 가로 넘침 없이 표시.
- 빈 질문 안내와 키 미설정 시 API 실패 안내.
- Codyssey 가상 키 등록·재배포 후 실제 분석 응답.
- 목표와 시간 조건 입력 후 실제 AI 일정 추천 및 예정일 저장.
- 보관함에서 기존 완료 작업 3개 표시.
- GitHub README에서 데스크톱·모바일·AI 이미지 표시.

## 화면 증빙
모든 서비스 이미지는 2026년 10월 3일 공개 배포 URL에서 촬영한 데모 화면입니다.

| 증빙 | 파일 |
| --- | --- |
| 데스크톱 대시보드 | [desktop-dashboard.jpg](screenshots/desktop-dashboard.jpg) |
| 모바일 대시보드 | [mobile-dashboard.jpg](screenshots/mobile-dashboard.jpg) |
| 실제 AI 일정 추천 | [ai-schedule.jpg](screenshots/ai-schedule.jpg) |
| 실제 AI 프로젝트 분석 | [ai-analysis.jpg](screenshots/ai-analysis.jpg) |
| 293자 질문의 실제 AI 응답 | [ai-long-input.jpg](screenshots/ai-long-input.jpg) |
| AI 코딩 과정에서 제시한 화면 | [starter-before.png](screenshots/starter-before.png) |
| 현재 Canvas 학기·개인 코드 UI | [canvas-semester.jpg](screenshots/canvas-semester.jpg) |

Canvas 이미지는 API 토큰을 서버 환경 변수로 옮긴 현재 설정 화면입니다. 코드 입력란을 비운 상태의 안내를 촬영했습니다.

## AI 입력 재현 사례
| 입력 | 실제 확인 결과 |
| --- | --- |
| 정상 질문 | 요약·다음 단계·위험 대응 출력 |
| 빈 질문 | “질문을 입력해주세요.” 안내, 모델 호출하지 않음 |
| 293자 질문 | 새 배포에서 실제 AI 분석 응답 출력 |

## 선택 기능의 확인 범위
Canvas의 학기 필터와 접근 제한은 mock으로 검증합니다. 서버의 CANVAS_TOKEN·CANVAS_ACCESS_CODE 등록 후 개인 과제 조회 성공은 추가 확인이 필요합니다. 이는 필수 AI 기능 검증과 분리합니다.

## 제한
브라우저 저장소를 사용하는 학습용 데모이며 실제 회원 인증·기기 동기화를 제공하지 않습니다. AI 기능의 비용·쿼터와 서버 전체 요청 제한은 별도의 운영 관리 대상입니다.
