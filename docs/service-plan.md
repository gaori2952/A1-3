# ProjectFlow v1 service plan

개인 프로젝트의 목표, Task, Issue를 관리하고 AI 분석으로 다음 행동을 결정하도록 돕는다.

## 핵심 시나리오

회원가입 또는 로그인 후 프로젝트를 만들고 목표와 Task/Issue를 입력한다. Task 완료율로 진행률을 계산하고, 사용자의 추가 질문과 프로젝트 정보를 `/api/analyze`에 전달한다. 결과는 Summary, Next Steps, Risks로 표시한다.

## 데이터 보안

실서비스에서는 Supabase Auth 사용자 ID를 모든 프로젝트, Task, Issue에 기록하고 RLS 정책에서 `auth.uid() = user_id`를 적용한다. OpenAI API Key는 Vercel 환경 변수에만 저장한다.
