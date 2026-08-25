import json
import os
import time
from http.server import BaseHTTPRequestHandler
from typing import Literal

from google import genai
from google.genai import types
from pydantic import BaseModel, Field


# =========================================================
# SETTINGS
# =========================================================

MODEL_NAME = "gemini-3.6-flash"

MAX_TRANSIENT_RETRIES = 2
TRANSIENT_RETRY_DELAYS = (1.5, 3.0)


# =========================================================
# GEMINI STRUCTURED OUTPUT
# =========================================================

class GeminiJudgeResult(BaseModel):
    scoreA: int = Field(
        ge=0,
        le=100,
        description="PLAYER A의 점수. 0~100 정수",
    )

    scoreB: int = Field(
        ge=0,
        le=100,
        description="PLAYER B의 점수. 0~100 정수",
    )

    summary: str = Field(
        description="이번 기준의 대결을 소개하는 짧고 재치 있는 한 문장",
    )

    headlineA: str = Field(
        description="PLAYER A에 대한 짧은 판정 제목",
    )

    headlineB: str = Field(
        description="PLAYER B에 대한 짧은 판정 제목",
    )

    reasonA: str = Field(
        description="PLAYER A의 점수와 판정 이유를 설명하는 1~2문장",
    )

    reasonB: str = Field(
        description="PLAYER B의 점수와 판정 이유를 설명하는 1~2문장",
    )

    finalLine: str = Field(
        description="해당 기준의 라운드를 한 문장으로 마무리하는 코멘트",
    )


# =========================================================
# API RESPONSE
# =========================================================

class BattleResponse(BaseModel):
    criterion: str

    scoreA: int
    scoreB: int

    winner: Literal["A", "B", "DRAW"]

    summary: str

    headlineA: str
    headlineB: str

    reasonA: str
    reasonB: str

    finalLine: str


# =========================================================
# HELPERS
# =========================================================

def normalize_text(value) -> str:
    if value is None:
        return ""

    return " ".join(
        str(value).strip().split()
    )


def build_prompt(
    player_a: str,
    player_b: str,
    situation: str,
    criterion: str,
) -> str:

    situation_text = (
        situation
        if situation
        else "별도의 상황 설명 없음"
    )

    return f"""
너는 'PICK FIGHT'라는 선택지 배틀 게임의 AI 심판이다.

두 선택지를 사용자가 지정한 하나의 판정 기준으로 비교한다.

[PLAYER A]
{player_a}

[PLAYER B]
{player_b}

[사용자의 현재 상황]
{situation_text}

[이번 판정 기준]
{criterion}


아래 규칙을 반드시 지켜라.

1. 오직 이번 판정 기준과 사용자 상황을 중심으로 비교한다.
2. PLAYER A와 PLAYER B 모두 공정하게 평가한다.
3. 각 플레이어에게 0~100 사이 정수 점수를 준다.
4. 점수 차이는 실제 장단점 차이를 반영한다.
5. 억지로 큰 점수 차이를 만들지 않는다.
6. 거의 비슷하다면 실제 동점 점수도 허용한다.
7. 이유는 구체적이어야 하지만 너무 길게 쓰지 않는다.
8. 한국어로 작성한다.
9. PICK FIGHT의 귀엽고 게임 같은 말투를 살짝 사용한다.
10. 그러나 판정 이유 자체는 사용자가 납득할 수 있어야 한다.
11. PLAYER 이름을 임의로 변경하지 않는다.
12. 존재하지 않는 구체적인 사실을 사실처럼 단정하지 않는다.

summary:
- 이번 기준의 배틀 분위기를 보여주는 짧은 문장
- 이모지는 최대 1개
- 너무 길지 않게

headlineA / headlineB:
- 각각 한 줄짜리 판정 제목
- 짧고 게임스럽게

reasonA / reasonB:
- 각각 1~2문장
- 왜 이 점수를 받았는지 설명

finalLine:
- 이번 라운드의 결론을 한 문장으로 정리
"""


def decide_winner(
    score_a: int,
    score_b: int,
) -> Literal["A", "B", "DRAW"]:

    if score_a > score_b:
        return "A"

    if score_b > score_a:
        return "B"

    return "DRAW"


def get_error_status_code(error: Exception):
    status_code = getattr(
        error,
        "status_code",
        None,
    )

    if status_code is None:
        status_code = getattr(
            error,
            "code",
            None,
        )

    try:
        return int(status_code)
    except (TypeError, ValueError):
        return None


def is_transient_ai_error(error: Exception) -> bool:
    """
    Gemini의 일시적인 오류만 재시도 대상으로 판단한다.

    - 429 RESOURCE_EXHAUSTED / Too Many Requests
    - 503 UNAVAILABLE / Service Unavailable

    잘못된 요청, 인증 실패 같은 영구 오류는 재시도하지 않는다.
    """

    status_code = get_error_status_code(error)
    message = str(error).upper()

    return (
        status_code in (429, 503)
        or "429" in message
        or "503" in message
        or "RESOURCE_EXHAUSTED" in message
        or "TOO MANY REQUESTS" in message
        or "SERVICE UNAVAILABLE" in message
        or "UNAVAILABLE" in message
    )


def get_transient_error_label(error: Exception) -> str:
    status_code = get_error_status_code(error)
    message = str(error).upper()

    if (
        status_code == 429
        or "429" in message
        or "RESOURCE_EXHAUSTED" in message
        or "TOO MANY REQUESTS" in message
    ):
        return "429 RATE LIMIT"

    if (
        status_code == 503
        or "503" in message
        or "SERVICE UNAVAILABLE" in message
        or "UNAVAILABLE" in message
    ):
        return "503 UNAVAILABLE"

    return "TEMPORARY ERROR"


def generate_with_transient_retry(
    client: genai.Client,
    prompt: str,
):
    attempt = 0

    while True:
        try:
            return client.models.generate_content(
                model=MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=GeminiJudgeResult,
                ),
            )

        except Exception as error:
            if not is_transient_ai_error(error):
                raise

            if attempt >= MAX_TRANSIENT_RETRIES:
                raise RuntimeError(
                    "AI 심판이 지금 너무 바빠요. "
                    "잠시 후 다시 판정해주세요."
                ) from error

            delay = TRANSIENT_RETRY_DELAYS[
                min(
                    attempt,
                    len(TRANSIENT_RETRY_DELAYS) - 1,
                )
            ]

            error_label = get_transient_error_label(error)

            print(
                "[PICK FIGHT TEMPORARY AI ERROR]",
                f"{error_label} detected.",
                f"retry={attempt + 1}/{MAX_TRANSIENT_RETRIES}",
                f"wait={delay}s",
            )

            time.sleep(delay)
            attempt += 1


def judge_battle(
    player_a: str,
    player_b: str,
    situation: str,
    criterion: str,
) -> BattleResponse:

    api_key = os.environ.get(
        "GEMINI_API_KEY"
    )

    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY environment variable is missing."
        )

    client = genai.Client(
        api_key=api_key
    )

    response = generate_with_transient_retry(
        client=client,
        prompt=build_prompt(
            player_a=player_a,
            player_b=player_b,
            situation=situation,
            criterion=criterion,
        ),
    )

    if getattr(
        response,
        "parsed",
        None,
    ) is not None:

        result = response.parsed

    else:
        result = GeminiJudgeResult.model_validate_json(
            response.text
        )

    winner = decide_winner(
        result.scoreA,
        result.scoreB,
    )

    return BattleResponse(
        criterion=criterion,

        scoreA=result.scoreA,
        scoreB=result.scoreB,

        winner=winner,

        summary=result.summary,

        headlineA=result.headlineA,
        headlineB=result.headlineB,

        reasonA=result.reasonA,
        reasonB=result.reasonB,

        finalLine=result.finalLine,
    )


# =========================================================
# VERCEL SERVERLESS HANDLER
# =========================================================

class handler(BaseHTTPRequestHandler):

    def send_json(
        self,
        status_code: int,
        payload: dict,
    ) -> None:

        body = json.dumps(
            payload,
            ensure_ascii=False,
        ).encode("utf-8")

        self.send_response(
            status_code
        )

        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8",
        )

        self.send_header(
            "Content-Length",
            str(len(body)),
        )

        self.send_header(
            "Cache-Control",
            "no-store",
        )

        self.end_headers()

        self.wfile.write(
            body
        )


    def do_OPTIONS(self):

        self.send_response(204)

        self.send_header(
            "Access-Control-Allow-Methods",
            "POST, OPTIONS",
        )

        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type",
        )

        self.end_headers()


    def do_GET(self):

        self.send_json(
            200,
            {
                "ok": True,
                "service": "PICK FIGHT AI Judge",
                "model": MODEL_NAME,
            },
        )


    def do_POST(self):

        try:
            content_length = int(
                self.headers.get(
                    "Content-Length",
                    "0",
                )
            )

            if content_length <= 0:
                self.send_json(
                    400,
                    {
                        "ok": False,
                        "error": "Request body is required.",
                    },
                )
                return

            raw_body = self.rfile.read(
                content_length
            )

            try:
                data = json.loads(
                    raw_body.decode(
                        "utf-8"
                    )
                )

            except json.JSONDecodeError:
                self.send_json(
                    400,
                    {
                        "ok": False,
                        "error": "Invalid JSON body.",
                    },
                )
                return

            player_a = normalize_text(
                data.get("playerA")
            )

            player_b = normalize_text(
                data.get("playerB")
            )

            situation = normalize_text(
                data.get("situation")
            )

            criterion = normalize_text(
                data.get("criterion")
            )

            if not player_a:
                self.send_json(
                    400,
                    {
                        "ok": False,
                        "error": "playerA is required.",
                    },
                )
                return

            if not player_b:
                self.send_json(
                    400,
                    {
                        "ok": False,
                        "error": "playerB is required.",
                    },
                )
                return

            if not criterion:
                self.send_json(
                    400,
                    {
                        "ok": False,
                        "error": "criterion is required.",
                    },
                )
                return

            if player_a == player_b:
                self.send_json(
                    400,
                    {
                        "ok": False,
                        "error": "PLAYER A and PLAYER B must be different.",
                    },
                )
                return

            result = judge_battle(
                player_a=player_a,
                player_b=player_b,
                situation=situation,
                criterion=criterion,
            )

            self.send_json(
                200,
                {
                    "ok": True,
                    **result.model_dump(),
                },
            )

        except RuntimeError as error:
            print(
                "[PICK FIGHT API ERROR]",
                repr(error),
            )

            message = str(error)

            if (
                "AI 심판이 지금 너무 바빠요"
                in message
            ):
                self.send_json(
                    429,
                    {
                        "ok": False,
                        "error": message,
                    },
                )
                return

            self.send_json(
                500,
                {
                    "ok": False,
                    "error": "AI 판정 중 오류가 발생했습니다.",
                },
            )

        except Exception as error:

            print(
                "[PICK FIGHT API ERROR]",
                repr(error),
            )

            self.send_json(
                500,
                {
                    "ok": False,
                    "error": "AI 판정 중 오류가 발생했습니다.",
                },
            )