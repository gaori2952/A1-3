# ProjectFlow v1

개인 프로젝트의 목표, Task, Issue를 한곳에서 관리하고 다음 작업과 위험 요소를 확인하는 생산성 도구입니다.

## 현재 구현

- 이메일 형식의 데모 회원가입 / 로그인 / 로그아웃
- Dashboard 프로젝트 생성 및 진행률 확인
- Project Detail에서 Task, Priority, Issue, Severity 관리
- Task 완료율 기반 자동 진행률 계산
- AI Insights에서 추가 질문 입력
- `fetch('/api/analyze')`를 통한 Vercel Python API 연결
- API 미배포 상태에서도 로컬 데모 분석 결과 확인
- 반응형 Desktop / Mobile 화면

## 실행

정적 파일이므로 로컬 서버에서 실행합니다.

```powershell
py -m http.server 8000
```

`http://localhost:8000/login.html`을 열고 **Preview with demo workspace**를 선택하면 바로 확인할 수 있습니다.

## 배포 전 설정

1. Supabase 프로젝트를 만들고 Auth Email/Password 및 PostgreSQL 테이블과 RLS를 설정합니다.
2. `js/supabaseClient.js`의 데모 저장 계층을 Supabase client 호출로 교체합니다. 브라우저에는 publishable key만 사용합니다.
3. Vercel Environment Variables에 `OPENAI_API_KEY`를 등록합니다.
4. `vercel.json`을 포함해 Vercel에 배포합니다.

`api/analyze.py`는 현재 API 계약을 검증하는 기본 분석 함수입니다. 실제 OpenAI 호출은 API Key와 모델 정책을 정한 뒤 이 서버 함수 내부에 추가해야 하며, 키를 JavaScript에 넣지 않습니다.

## 흐름

`login.html` → `index.html` → `project.html?id=...` → `insights.html?id=...` → `/api/analyze`