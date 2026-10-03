# ProjectFlow
개인 프로젝트의 목표·작업·이슈를 한곳에 모으고, AI가 목표에 맞는 첫 작업과 다음 행동을 제안하는 웹 서비스입니다.

**[서비스 열기](https://a1-3-sand.vercel.app)** · [GitHub](https://github.com/gaori2952/A1-3)

## 서비스 구성
| 페이지 | 역할 |
| --- | --- |
| 로그인 | 학습용 워크스페이스 진입, 데모 미리보기 |
| 대시보드 | 프로젝트 생성, 오늘 할 일, 2주 일정 |
| 프로젝트 | 작업·이슈 관리, 완료율 확인 |
| AI 인사이트 | 질문을 입력하고 상황 요약·다음 작업·위험 대응 확인 |
| 설정·보관함 | 일정 설정과 보관 프로젝트 확인 |

로그인과 데이터 저장은 브라우저 localStorage를 사용하는 학습용 데모입니다. 기기 간 동기화와 실제 계정 인증은 제공하지 않습니다. 동료는 로그인 페이지의 **데모 워크스페이스로 미리보기**로 접속할 수 있습니다.

## 기술 스택과 역할
| 기술 | 역할 |
| --- | --- |
| HTML | 입력 폼, 메뉴, 결과 영역의 구조 |
| CSS | 레이아웃·카드·모바일 반응형 |
| JavaScript | 입력 수집, fetch 요청, 상태 안내, 결과 표시 |
| Python·requests | 입력 검증, AI API 요청, 응답 검증 |
| Vercel | 웹 URL 제공과 Python Serverless Function 실행 |
| Codyssey OpenAI 호환 API | gpt-5-mini를 통한 프로젝트별 텍스트 생성 |

프론트는 순수 HTML/CSS/JavaScript이며 React·Vue를 사용하지 않습니다.

## AI 데이터 흐름
```text
사용자 질문 + 프로젝트 목표·마감일·작업·이슈
→ JavaScript fetch('/api/analyze')
→ Vercel의 api/index.py
→ api/ai_analysis.py
→ Codyssey /v1/chat/completions
→ JSON 응답 검증
→ 요약·다음 작업·위험 대응 카드
```

AI 시작 플랜은 `/api/starter_plan`으로 프로젝트 이름·유형·목표·설명을 보내 날짜와 소요 시간이 포함된 실행 일정을 최대 3개 제안받습니다. 마감일이 없으면 오늘부터 7일을 기준으로 합니다. 선택한 일정의 날짜는 작업 예정일에 저장됩니다. 공부할 과목이나 내용을 대신 선택하지 않습니다. 고정된 작업 목록을 AI 결과로 표시하지 않습니다.

AI 인사이트는 `summary`, `status`, `next_steps`, `risks` 구조의 JSON을 요구하고 Python에서 검증합니다. 결과 문장은 DOM의 `textContent`로 표시합니다. 시작 플랜의 동적 문자열도 HTML 이스케이프를 적용합니다.

2주 일정 자동 배치는 일일 작업 개수에 따른 규칙 기반 기능으로, AI 생성과 구분합니다.

## 환경변수 설정
Vercel 프로젝트 **Settings → Environment Variables**에서 아래 항목을 Production에 등록하고 배포합니다. 필요하면 Preview에도 등록합니다.

| 이름 | 값 |
| --- | --- |
| `OPENAI_API_KEY` | Codyssey에서 발급한 가상 키 |
| `OPENAI_BASE_URL` | `https://copa.codyssey.kr/v1` |
| `OPENAI_MODEL` | `gpt-5-mini` |

Python이 `OPENAI_BASE_URL + "/chat/completions"`에 POST 요청을 보내므로 Base URL에 `/chat/completions`까지 넣지 않습니다. 서버 인증 헤더는 `Authorization: Bearer <가상 키>`입니다.

키를 JavaScript, GitHub, README, 결과 파일, 스크린샷에 넣지 않습니다. 환경변수로 분리하면 코드 공유와 키 교체가 쉬워지고 무단 사용으로 인한 쿼터 소진을 줄일 수 있습니다. 키 노출 시 즉시 폐기·재발급하고 저장소 이력도 확인합니다.

`.env.example`은 항목 안내용입니다. 현재 로컬 서버는 .env를 자동으로 읽지 않으므로 터미널 환경변수로 설정합니다.

## 로컬 실행
Python 3.11 이상을 권장합니다.

```bash
git clone https://github.com/gaori2952/A1-3.git
cd A1-3
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
export OPENAI_API_KEY="YOUR_CODYSSEY_VIRTUAL_KEY"
export OPENAI_BASE_URL="https://copa.codyssey.kr/v1"
export OPENAI_MODEL="gpt-5-mini"
python dev_server.py
```

Windows PowerShell에서는 가상환경 활성화 후 다음과 같이 설정합니다.

```powershell
$env:OPENAI_API_KEY="YOUR_CODYSSEY_VIRTUAL_KEY"
$env:OPENAI_BASE_URL="https://copa.codyssey.kr/v1"
$env:OPENAI_MODEL="gpt-5-mini"
python dev_server.py
```

`http://localhost:8000/login.html`에서 시작합니다. `python -m http.server`는 정적 화면만 제공하므로 Python AI API 검증에는 `dev_server.py`를 사용합니다.

## 배포
1. Vercel에서 `gaori2952/A1-3`를 Import합니다.
2. Python 프리셋, Root Directory `./`를 사용합니다.
3. 환경변수를 등록하고 Deploy합니다.
4. main 커밋 시 자동 배포된 결과를 확인합니다.

Serverless Function은 요청이 들어올 때 서버 코드를 실행합니다. API 키는 서버에만 있고 브라우저는 같은 사이트의 `/api/...`를 호출합니다. 로컬에서는 Python 서버가 실행되어 있어야 하며, 배포 환경에서는 Vercel이 서버 실행과 HTTPS를 관리합니다.

홈페이지가 API 오류 JSON으로 표시되던 문제는 Python 진입점이 일반 페이지 요청도 받는데 HTML 제공 처리가 없었던 것이 원인이었습니다. 허용된 HTML·CSS·JS만 제공하도록 수정하고 재배포했습니다.

## 실패 처리와 호출 관리
| 상황 | 사용자 안내·처리 |
| --- | --- |
| 빈 질문·필수값 누락 | 입력 안내, AI 호출하지 않음 |
| 키 누락·인증 오류 | 연결 설정 안내, 성공 결과를 만들지 않음 |
| 429 | 사용 한도 안내 |
| 네트워크·5xx | 다시 시도 안내 |
| 지연·시간 초과 | 분석 중 표시, 프론트 55초 제한·서버 응답 40초 제한 |
| 잘못된 생성 JSON | 응답 형식 오류 안내 |

자동 재시도는 하지 않습니다. 분석 버튼 중복 클릭을 막고 완료 후 5초 간격을 둡니다. 이 간격은 브라우저 UX 제한이며 서버 전체 요청 제한은 아닙니다. 호출 비용·쿼터는 API 제공자에서 관리해야 합니다.

## 검증과 제출 자료
```bash
python -m unittest discover -s tests -v
```

테스트에서는 외부 API를 mock으로 대체해 정상 응답·인증·쿼터·타임아웃·파싱 오류를 확인합니다. 실제 가상 키 호출 성공 여부는 별도로 확인해야 합니다.

- [서비스 기획서](docs/service-plan.md)
- [AI 코딩 도구 사용 기록](docs/ai-coding-evidence.md)
- [검증 및 제출 현황](docs/verification.md)
- 데스크톱·모바일·실제 AI 동작 스크린샷은 제출 패키지에 포함

## 프로젝트 구조
```text
A1-3/
├── index.html / login.html / project.html / insights.html
├── settings.html / archive.html
├── css/                     # 반응형 스타일
├── js/                      # 입력·저장·요청·화면 갱신
├── api/
│   ├── index.py             # 요청 라우팅과 페이지 제공
│   ├── ai_analysis.py       # AI 호출·입력 및 결과 검증
│   ├── analyze.py / starter_plan.py
│   └── canvas_sync.py / schedule.py
├── dev_server.py
├── .env.example
├── requirements.txt
├── pyproject.toml
├── tests/
└── docs/
```

Canvas 연동은 선택 기능이며 별도의 서버 설정이 필요합니다. 현재 과제의 핵심 AI 기능은 시작 플랜과 프로젝트 분석입니다.

## Canvas 과제 가져오기
설정 화면에서 본인의 Canvas API 토큰을 입력하고 조회합니다. 학교 주소는 https://canvas.skku.edu 로 고정됩니다. 토큰은 요청에만 사용하고 환경변수·localStorage·로그에 저장하지 않습니다. CANVAS_TOKEN 환경변수는 사용하지 않습니다. 토큰 없이 GET 요청으로 개인 과제를 조회할 수 없습니다. 조회한 목록 중 선택한 과제만 브라우저에 저장하고, 과목별 프로젝트와 마감일 작업을 생성합니다. 이미 저장한 과제는 중복 추가하지 않습니다. 이 저장소는 학습용 브라우저 데모이므로 공유 기기에서 개인 과제를 저장하지 마세요.

Canvas 조회 시 연도·학기를 선택합니다. 과목의 term 이름·학기 코드 또는 학기 날짜로 해당 학기만 선별한 다음 과제 API를 호출합니다. 지난 학기와 학기 정보가 확인되지 않는 과목은 제외합니다. 과목 수 제한은 이 필터링 후에 적용합니다. Canvas 공식 API의 include[]=term을 사용합니다: https://developerdocs.instructure.com/services/canvas/resources/courses
