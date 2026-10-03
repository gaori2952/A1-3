# 실행과 배포

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

Windows PowerShell에서는 다음 설정을 사용합니다.

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:OPENAI_API_KEY="YOUR_CODYSSEY_VIRTUAL_KEY"
$env:OPENAI_BASE_URL="https://copa.codyssey.kr/v1"
$env:OPENAI_MODEL="gpt-5-mini"
python dev_server.py
```

http://localhost:8000/login.html에서 데모로 진입합니다. dev_server.py는 페이지와 API를 모두 제공합니다. python -m http.server는 정적 화면만 제공하므로 AI API 검증에 사용하지 않습니다.

.env.example은 설정 항목 안내용입니다. dev_server.py는 .env 파일을 자동으로 읽지 않으므로 위처럼 환경 변수를 설정합니다.

## Vercel 배포
1. Vercel에서 gaori2952/A1-3를 Import합니다.
2. Root Directory ./, Python 프리셋을 사용합니다. pyproject.toml의 api.index:handler가 진입점입니다.
3. Settings → Environment Variables에서 Production에 AI 변수 3개를 등록합니다. Preview를 사용할 경우 별도로 설정합니다.
4. Deploy 후 Ready 상태와 공개 URL을 확인합니다.
5. 데모 진입, 메뉴 이동, AI 정상 입력과 빈 입력 안내를 확인합니다.

배포 URL: https://a1-3-sand.vercel.app

| 필수 변수 | 값 |
| --- | --- |
| OPENAI_API_KEY | Codyssey 가상 키 |
| OPENAI_BASE_URL | https://copa.codyssey.kr/v1 |
| OPENAI_MODEL | gpt-5-mini |

Base URL에 /chat/completions를 붙이지 않습니다. Python에서 해당 경로를 추가해 호출합니다.

## Canvas 선택 기능
Canvas를 사용하지 않아도 과제의 AI 기능과 제출 패키지는 이용할 수 있습니다. 개인 연동을 사용하려면 Vercel Production에 다음을 등록하고 재배포합니다.

| 변수 | 값 |
| --- | --- |
| CANVAS_TOKEN | 성균관대학교 Canvas에서 발급한 개인 API 토큰 |
| CANVAS_ACCESS_CODE | 본인이 정한 길고 무작위인 개인 연동 코드 |

학교 API 주소는 https://canvas.skku.edu로 고정되어 있습니다. Canvas 토큰은 브라우저에 입력하지 않습니다. 설정 화면의 연도·학기를 확인한 뒤 CANVAS_ACCESS_CODE에 설정한 개인 연동 코드로 조회합니다. 토큰 없이 공개 GET 요청으로 개인 과제를 조회할 수 없습니다.

개인 연동 코드도 공개 문서나 스크린샷에 넣지 않습니다. 과제 목록은 선택해 저장한 경우에만 해당 브라우저에 남습니다. 공유 기기에서 개인 과제 데이터를 저장하지 마세요. 가져온 과제의 AI 전송은 자동으로 실행하지 않습니다.

## 검증 명령
```bash
python -m unittest discover -s tests -v
node --test tests/test_archive.mjs
node --check js/dashboard.js
node --check js/insights.js
node --check js/settings.js
```

외부 API를 mock으로 대체한 테스트와 실제 모델 호출 검증은 [검증 현황](verification.md)에서 구분합니다.

## 키 노출 대응
1. 노출된 키를 제공자에서 즉시 폐기하고 새 키를 발급합니다.
2. Vercel 환경 변수를 교체하고 재배포합니다.
3. 파일·README·스크린샷에서 노출 내용을 제거하고 커밋 이력을 확인합니다.
4. 과거 커밋에 키가 남아 있다면 GitHub 민감정보 제거 절차로 이력을 정리합니다. 이력을 정리해도 이미 노출된 키는 계속 사용하지 않습니다.

## 비용과 운영
중복 클릭을 막고 자동 재시도를 하지 않습니다. AI 분석 완료 후 5초 간격을 두지만 이것은 브라우저 UX 제한이며 서버 전체 요청 제한은 아닙니다. 모델 호출 비용과 쿼터는 제공자에서 관리합니다.
