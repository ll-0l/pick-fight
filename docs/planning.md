# PICK FIGHT — 서비스 기획서

## 1. 서비스 개요

### 서비스명
**PICK FIGHT — 선택장애 콜로세움**

### 한 줄 소개
두 선택지를 AI에게 싸움 붙여 오늘의 PICK을 결정하는 픽셀 배틀형 의사결정 서비스

### 서비스 목적
PICK FIGHT는 사용자가 두 가지 선택지 사이에서 고민할 때, 단순 추천 결과만 제공하는 대신 AI가 사용자가 지정한 기준과 현재 상황을 바탕으로 두 선택지를 비교하고 그 과정을 게임처럼 보여주는 서비스입니다.

사용자는 캐릭터를 선택하고, 비교 기준을 정하고, AI 판정 결과에 따라 캐릭터가 실제로 공격하고 HP가 감소하는 과정을 보면서 선택 과정을 보다 재미있고 몰입감 있게 경험할 수 있습니다.

---

## 2. 타겟 사용자

### 주요 타겟
- 두 선택지 사이에서 결정을 내리기 어려운 사용자
- 음식, 쇼핑, 일정, 취미 등 일상적인 선택을 자주 고민하는 사용자
- 단순 추천보다 비교 이유와 판단 기준을 확인하고 싶은 사용자
- 게임형 UI와 재미있는 인터랙션을 선호하는 사용자

### 사용 예시
- 떡볶이 vs 샐러드
- 단발 vs 장발
- 영화 보기 vs 게임하기
- 여행 가기 vs 집에서 쉬기
- A 상품 vs B 상품

---

## 3. 서비스 핵심 가치

PICK FIGHT가 사용자에게 제공하는 핵심 가치는 다음과 같습니다.

1. **선택 부담 감소**
   - 사용자가 직접 정하기 어려운 두 선택지를 AI가 비교합니다.

2. **맥락 기반 판정**
   - 단순히 선택지 이름만 비교하지 않고 사용자의 현재 상황도 함께 반영합니다.

3. **판정 이유 제공**
   - AI가 점수만 출력하지 않고 각 선택지의 장단점과 이유를 설명합니다.

4. **게임형 경험**
   - 캐릭터 선택, ENTRY, VS, 공격, HP 감소, SUDDEN DEATH 등 게임 요소를 적용했습니다.

5. **사용자 개입 가능**
   - 사용자가 직접 비교 기준인 RULE을 선택하거나 추가할 수 있습니다.

---

## 4. 페이지 / 섹션 구성

PICK FIGHT는 최소 3개 이상의 섹션을 제공하며, 데스크톱에서는 상단 메뉴를 사용하고 모바일에서는 하단 `HOW TO / BATTLE / LOG` 네비게이션을 사용합니다.

### 4.1 HOME

서비스의 첫 화면입니다.

주요 요소:
- PICK FIGHT 로고
- 서비스 대표 문구
- 픽셀 캐릭터
- START 버튼

대표 문구:

> 못 고르겠다고? 둘이 싸움 붙여.  
> 마지막까지 살아남는 하나가 오늘의 PICK ♡

---

### 4.2 ARENA

실제 선택지 입력 및 AI 배틀이 진행되는 핵심 섹션입니다.

주요 기능:
- PLAYER A 입력
- PLAYER B 입력
- 캐릭터 선택
- 현재 상황 입력
- RULE 선택
- 직접 RULE 추가
- FIGHT 실행
- ENTRY
- VS
- AI 판정
- 공격 및 HP 감소
- 최종 판정
- SUDDEN DEATH
- MATCH RESULT

---

### 4.3 BATTLE LOG

완료된 배틀 기록을 확인하는 섹션입니다.

두 가지 방식으로 결과를 확인할 수 있습니다.

#### CARD VIEW

상세한 배틀 기록을 보여줍니다.

표시 정보:
- PLAYER A VS PLAYER B
- 캐릭터
- 오늘의 PICK
- 사용 RULE
- FINAL JUDGEMENT
- 라운드별 결과
- 최종 결론

#### LIST VIEW

전체 배틀을 간단하게 확인합니다.

표시 정보:
- A VS B
- PICK
- 날짜

---

### 4.4 HOW TO PLAY

PICK FIGHT 사용 방법을 안내하는 섹션입니다.

사용자가 처음 접속하더라도 전체 플레이 흐름을 이해할 수 있도록 설명합니다.

---

## 5. 사용자 흐름

전체 서비스 흐름은 다음과 같습니다.

```text
HOME
↓
START
↓
PLAYER A / B 입력
↓
캐릭터 선택
↓
현재 상황 입력
↓
RULE 선택
↓
FIGHT
↓
ENTRY
↓
VS
↓
AI 판정
↓
공격 / HP 감소
↓
다음 ROUND
↓
SUDDEN DEATH
↓
MATCH RESULT
↓
BATTLE LOG
```

---

## 6. PLAYER 입력 기능

사용자가 비교하고 싶은 두 가지 선택지를 입력합니다.

### 입력
- PLAYER A
- PLAYER B

### 상태 표시

입력 상태에 따라 UI가 달라집니다.

- 빈 입력: `필수 입력`
- 입력 중: `입력 중`
- 입력 완료: `READY`

두 PLAYER가 모두 READY 상태가 되어야 배틀을 시작할 수 있습니다.

---

## 7. 캐릭터 선택 기능

PLAYER A와 PLAYER B는 각각 픽셀 캐릭터를 선택할 수 있습니다.

### 캐릭터 선택 방식

캐러셀 UI를 사용합니다.

- 중앙: 현재 선택된 캐릭터
- 왼쪽: 이전 캐릭터
- 오른쪽: 다음 캐릭터
- 좌우 버튼으로 순환 선택

### 선택 규칙

- A/B 각각 독립적으로 캐릭터 선택
- 동일 캐릭터 중복 선택 불가
- 배틀 시작 후 캐릭터 변경 불가

선택한 캐릭터는 다음 화면까지 유지됩니다.

- PLAYER 화면
- ENTRY
- VS
- BATTLE
- MATCH RESULT
- BATTLE LOG

---

## 8. 현재 상황 입력

사용자가 현재 고민 상황을 선택적으로 입력할 수 있습니다.

예시:

```text
다이어트 중인데 오늘 스트레스를 많이 받았다.
```

현재 상황은 필수값은 아니지만 입력한 경우 Gemini AI 판정 프롬프트에 포함됩니다.

이를 통해 동일한 두 선택지라도 사용자 상황에 따라 다른 결과가 나올 수 있습니다.

---

## 9. RULE 기능

RULE은 AI가 두 선택지를 비교할 기준입니다.

### 기본 RULE 예시

- 돈
- 시간
- 만족도
- 건강
- 재미
- 후회 최소화

### 직접 RULE 추가

사용자가 직접 원하는 비교 기준을 작성할 수 있습니다.

예시:

```text
사진이 잘 나오는 곳
```

```text
관리하기 편한 것
```

### RULE 개수

기본 배틀에서는 최대 3개까지 선택할 수 있습니다.

| RULE 개수 | 진행 방식 |
|---|---|
| 1개 | FINAL ROUND |
| 2개 | ROUND 1 → FINAL ROUND |
| 3개 | ROUND 1 → ROUND 2 → FINAL ROUND |

---

## 10. AI 기능 설계

### AI 기능명
**AI Battle Judge**

### 사용 AI
Google Gemini API

### 백엔드
Vercel Serverless Functions (Python)

### API 엔드포인트

```text
POST /api/battle
```

---

## 11. AI 입력

AI에 전달되는 주요 입력값은 다음과 같습니다.

### playerA

첫 번째 선택지

예:

```text
떡볶이
```

### playerB

두 번째 선택지

예:

```text
샐러드
```

### situation

현재 사용자 상황

예:

```text
다이어트 중인데 오늘 스트레스를 많이 받았다.
```

### criterion

현재 라운드의 판정 기준

예:

```text
만족도
```

---

## 12. AI 출력

Gemini는 구조화된 JSON 결과를 반환합니다.

주요 출력값:

### scoreA

PLAYER A 점수

범위:

```text
0 ~ 100
```

### scoreB

PLAYER B 점수

범위:

```text
0 ~ 100
```

### winner

가능한 값:

```text
A
B
DRAW
```

### summary

현재 라운드 분위기를 설명하는 짧은 문장

### headlineA

PLAYER A 판정 제목

### headlineB

PLAYER B 판정 제목

### reasonA

PLAYER A 판정 이유

### reasonB

PLAYER B 판정 이유

### finalLine

라운드 최종 판정 문장

---

## 13. AI 응답 검증

Gemini 응답은 Python 백엔드에서 Pydantic 모델로 검증합니다.

검증 항목:
- scoreA가 0~100 범위인지 확인
- scoreB가 0~100 범위인지 확인
- 필요한 문자열 값이 존재하는지 확인
- 구조화된 JSON 형태인지 확인

이를 통해 잘못된 AI 응답이 그대로 프론트에 전달되지 않도록 처리했습니다.

---

## 14. AI 결과 화면 반영

JavaScript에서는 다음 흐름으로 AI 기능을 호출합니다.

```text
사용자 입력
↓
JavaScript
↓
fetch('/api/battle')
↓
Vercel Python Function
↓
Gemini API
↓
JSON 결과 반환
↓
JavaScript 결과 처리
↓
점수 / 판정 이유 / HP / 공격 애니메이션 반영
```

---

## 15. AI 판정 로딩 UX

AI 응답에는 시간이 걸릴 수 있기 때문에 결과를 기다리는 동안 로딩 상태를 표시합니다.

표시 문구:

```text
AI JUDGE...
판정 중입니다! 잠시만 기다려주세요.
```

Gemini의 응답이 완료될 때까지 로딩창을 유지합니다.

응답을 받으면 로딩창을 닫고 공격 애니메이션을 실행합니다.

---

## 16. 실패 처리 기준

과제에서 요구하는 실패 처리를 다음과 같이 구현했습니다.

### 16.1 필수 입력 누락

PLAYER A 또는 PLAYER B가 입력되지 않은 경우 배틀을 시작할 수 없습니다.

사용자에게 필수 입력 상태를 표시합니다.

---

### 16.2 RULE 부족

RULE이 선택되지 않은 경우 FIGHT 버튼을 활성화하지 않습니다.

---

### 16.3 AI API 오류

Gemini API 또는 서버 오류가 발생하면 사용자에게 오류 안내창을 표시합니다.

예:

```text
AI ERROR
AI 판정 중 오류가 발생했습니다.
```

---

### 16.4 일시적 AI API 오류 — 429 / 503

Gemini API 사용량 또는 호출량 제한으로 `429 RESOURCE_EXHAUSTED`가 발생하거나, 일시적인 서버 혼잡으로 `503 UNAVAILABLE`이 발생할 수 있습니다.

백엔드에서는 두 오류를 일시적 오류로 분류하여 자동 재시도합니다.

```text
1차 요청
↓
429 또는 503
↓
1.5초 대기
↓
재시도
↓
429 또는 503
↓
3초 대기
↓
마지막 재시도
```

모든 자동 재시도가 실패하면:

```text
AI JUDGE BUSY

AI 심판이 지금 너무 바빠요.
잠시 후 다시 판정해주세요.

[ 다시 판정하기 ]
```

를 표시합니다.

사용자가 `다시 판정하기` 버튼을 누르면:

- PLAYER 유지
- HP 유지
- RULE 유지
- 현재 ROUND 유지

상태에서 동일 라운드만 다시 요청합니다.

---

## 17. 배틀 시스템

AI가 출력한 두 점수의 차이를 이용하여 HP 데미지를 계산합니다.

| 점수 차이 | 데미지 |
|---:|---:|
| 0 | 0 |
| 1~5 | 5 |
| 6~14 | 12 |
| 15~24 | 20 |
| 25~34 | 30 |
| 35 이상 | 40 |

HP는 다음 라운드까지 유지됩니다.

---

## 18. HP 상태

HP에 따라 HP Bar의 색과 상태가 달라집니다.

| HP | 상태 |
|---|---|
| 71~100 | SAFE |
| 41~70 | CAUTION |
| 16~40 | DANGER |
| 0~15 | CRITICAL |

낮은 HP일수록 강한 시각적 경고 효과를 제공합니다.

---

## 19. 공격 애니메이션

AI 판정 후 승리한 캐릭터가 상대 캐릭터를 공격합니다.

적용된 마이크로 인터랙션:

- 공격 전 효과
- 캐릭터 돌진
- 피격 Knockback
- Impact 효과
- 공격 효과 문구
- HP 감소 애니메이션
- 상처 누적 효과
- WIN / LOSE 표시

---

## 20. 최종 판정 방식

최종 승자는 라운드 승수가 아니라 **남은 HP**를 기준으로 결정합니다.

```text
A HP > B HP
→ PLAYER A 승리

B HP > A HP
→ PLAYER B 승리
```

---

## 21. 최종 동점 처리

모든 기본 라운드 종료 후 HP가 같으면 바로 승자를 결정하지 않습니다.

안내:

```text
동점이에요!
새로운 RULE 하나로 한 번 더 결판내야 해요.
```

새로운 RULE을 추가하여 SUDDEN DEATH를 진행합니다.

---

## 22. SUDDEN DEATH

기본 라운드 종료 후 사용자가 추가 결판을 원하는 경우 진행합니다.

### 규칙

- 기존 PLAYER 유지
- 기존 캐릭터 유지
- 기존 HP 유지
- 기존 RULE 잠금
- 새로운 RULE 하나 추가
- ENTRY 생략
- 한 번의 추가 라운드만 진행

실행 버튼:

```text
SUDDEN DEATH GO!
```

---

## 23. MATCH RESULT

최종 결과 화면에서는 다음 정보를 제공합니다.

- 승리 캐릭터
- 패배 캐릭터
- WIN
- DEFEATED
- ROUND별 최종 판정
- SUDDEN DEATH 결과
- 오늘의 PICK
- 남은 HP
- NEW BATTLE
- 게임 종료

---

## 24. Battle Log

배틀 종료 후 기록을 확인할 수 있습니다.

완료된 Battle Log는 `localStorage`에 저장하며 브라우저를 새로고침해도 유지됩니다. 최근 기록은 최대 50개까지 저장합니다.

### CARD VIEW

상세 정보:

- PLAYER A VS PLAYER B
- 캐릭터
- RULE (기본 RULE + 사용한 SUDDEN DEATH RULE)
- PICK
- FINAL JUDGEMENT
- 라운드 판정
- 최종 결론

### LIST VIEW

간단 정보:

- A VS B
- PICK
- 날짜

동점 라운드는:

```text
DRAW
```

로 표시합니다.

---

## 25. 한국어 문장 처리

PLAYER 이름에 따라 `이/가` 조사를 자동으로 선택합니다.

예시:

```text
중단발 → 중단발이
샐러드 → 샐러드가
레이어드컷 → 레이어드컷이
```

라운드 판결문, MATCH RESULT, Battle Log 결론에 동일하게 적용합니다.

---

## 26. 반응형 설계

PICK FIGHT는 데스크톱뿐 아니라 모바일 / 태블릿 환경에서도 사용할 수 있도록 반응형 레이아웃을 적용했습니다.

### 모바일 전용 UX

- 상단 데스크톱 메뉴 대신 하단 `HOW TO / BATTLE / LOG` 네비게이션 사용
- HOME 화면은 한 화면 단위로 보이도록 높이 조정
- 실제 배틀 진행 중에는 하단 네비게이션과 다른 섹션을 숨기고 **전투 화면만 전체 화면으로 표시**
- ENTRY / VS / 카운트다운 / AI JUDGE / 결과 화면의 모바일 폭과 여백 최적화
- `NEXT ROUND GO!`, `LAST JUDGEMENT` 등 단일 액션 버튼은 모바일 전체 폭으로 표시
- AI JUDGE / AI JUDGE BUSY 오버레이는 모바일과 데스크톱에서 잘리지 않도록 각각 대응

### 확인 대상

- HOME
- ARENA
- PLAYER 카드
- RULE 영역
- BATTLE
- MATCH RESULT
- BATTLE LOG
- AI JUDGE / AI JUDGE BUSY

데스크톱과 모바일 화면 크기에서 직접 테스트했습니다.

---

## 27. 기술 스택

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript

### Backend
- Python
- Vercel Serverless Functions
- Pydantic

### AI
- Google Gemini API
- google-genai

### Deployment
- Vercel

### Version Control
- Git
- GitHub

---

## 28. 프로젝트 구조

```text
pick-fight/
│
├─ api/
│  └─ battle.py
│
├─ css/
│  └─ style.css
│
├─ docs/
│
├─ images/
│
├─ js/
│  └─ app.js
│
├─ .gitignore
├─ index.html
├─ README.md
├─ requirements.txt
└─ vercel.json
```

---

## 29. API 키 보안

Gemini API Key는 프론트엔드 코드에 직접 저장하지 않습니다.

환경변수:

```text
GEMINI_API_KEY
```

Vercel Environment Variables에 등록하고 Python Serverless Function에서만 사용합니다.

API 키가 GitHub 저장소나 README에 노출되지 않도록 관리합니다.

키 유출이 의심될 경우 즉시 기존 키를 폐기하고 새로운 키를 발급합니다.

---

## 30. 배포

GitHub 저장소와 Vercel을 연동하여 배포합니다.

개발 흐름:

```text
feature branch
↓
GitHub push
↓
Vercel Preview Deployment
↓
기능 테스트
↓
Pull Request
↓
main Merge
↓
Vercel Production Deployment
```

Preview에서 AI 기능과 UI를 테스트한 후 main 브랜치로 병합하여 Production 배포를 진행합니다.

---

## 31. UX 고도화 — 보너스 과제

PICK FIGHT는 사용자 경험 개선을 위해 다양한 마이크로 인터랙션을 구현했습니다.

적용 기능:

- 캐릭터 캐러셀
- PLAYER READY 상태 변화
- ENTRY 애니메이션
- VS 연출
- 공격 애니메이션
- 피격 Knockback
- HP 변화
- 상태별 HP 색상
- WIN / LOSE 연출
- AI JUDGE 로딩
- AI JUDGE BUSY 오류 피드백
- 다시 판정하기 인터랙션
- 모바일 하단 네비게이션
- 모바일 전투 집중형 전체 화면

이를 통해 단순한 폼 기반 AI 서비스가 아니라 실제 게임처럼 반응하는 인터페이스를 구현했습니다.

### 보너스 과제 판정

**사용자 경험(UX) 및 측정 고도화 → 마이크로 인터랙션 구현**

✅ 충족

### 데이터 영속화 보너스

Battle Log를 `localStorage`에 저장하여 브라우저 새로고침 후에도 기록이 유지되도록 구현했습니다.

- 최근 최대 50개 배틀 기록 저장
- CARD VIEW / LIST VIEW에서 동일한 저장 데이터 사용
- 새로고침 전 / 후 화면 캡처로 영속화 확인

✅ 충족

---

## 32. 향후 개선 가능 사항

- 사용자별 기록 관리
- 외부 DB 연동
- 결과 공유 기능
- 방문자 분석
- AI 모델 fallback
- Gemini API Rate Limit 모니터링 강화

---

## 33. 최종 목표

PICK FIGHT의 최종 목표는 사용자가 고민하는 두 선택지를 AI가 비교하고, 그 결과를 단순 텍스트 추천이 아닌 게임 플레이 경험으로 전달하는 것입니다.

사용자는 직접 비교 기준을 정하고 AI의 판단 이유를 확인하면서 보다 재미있고 이해하기 쉬운 방식으로 결정을 내릴 수 있습니다.