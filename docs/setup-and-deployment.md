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
Canvas는 선택 기능입니다. 웹사이트 설정에서 조회 연도와 학기를 확인한 뒤 Canvas API 토큰을 직접 입력합니다. CANVAS_TOKEN과 CANVAS_ACCESS_CODE 환경 변수는 필요하지 않습니다.

토큰은 HTTPS POST 요청 본문으로 Python 백엔드에 전달되어 https://canvas.skku.edu 조회에만 사용됩니다. 서버와 브라우저에 저장하지 않고, 조회 시작 시 입력칸을 비웁니다. 토큰이나 인증 헤더를 로그·문서·스크린샷에 넣지 않습니다.

조회 결과는 미리보기로 표시하며, 선택해 저장한 과제만 해당 브라우저에 남습니다. 학교 과제의 AI 전송은 자동 실행하지 않습니다. Canvas 토큰 직접 입력은 사용자가 선택한 방식이며 과제의 모든 API 키 환경 변수 관리 조건과 다를 수 있습니다.
