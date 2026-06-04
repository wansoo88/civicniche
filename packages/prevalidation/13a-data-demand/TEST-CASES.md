# 13-A 랜딩 — 브라우저 수동 테스트 케이스

> 대상: **https://data.utilverse.info** (영문, root) · **https://data.utilverse.info/ko/** (국문)
> 목적: 실제 Chrome에서 폼 제출·검증·집계가 눈으로 동작하는지 확인.
> 도구: Chrome 브라우저 + 가끔 주소창에 `/count` 직접 입력(JSON 확인).
>
> ⚠️ **시작 전·종료 후 반드시 데이터 리셋** (테스트 신호가 실검증을 오염시키지 않도록). 리셋은 아래 §리셋 참조 — 서버 접근이 필요하니, 테스트가 끝나면 클로드에게 "리셋해줘"라고 하면 됨.
>
> 테스트 식별용 이메일은 전부 **`qa-...@example.com`** 형태로 쓸 것(나중에 골라내기 쉽게).

---

## 사전 준비

| # | 단계 | 기대 |
|---|---|---|
| P1 | 클로드에게 "테스트용으로 리셋해줘" 요청 | 서버 신호 0건으로 초기화 |
| P2 | 주소창에 `https://data.utilverse.info/count` 입력 | `{"total":0, ... "pass":false}` JSON 표시 |

---

## A. 페이지 로드 & 표시

### TC-A1 — 영문 랜딩 로드
1. `https://data.utilverse.info/` 접속
2. 확인:
   - [ ] 제목 영역에 "FDA-registered medical device contract manufacturers, cleaned up." 보임
   - [ ] 우측 상단에 `한국어` 링크 있음
   - [ ] 좌측 상단 배지 "Pre-launch — gauging interest"
   - [ ] 샘플 CSV 미리보기(검은 코드박스)에 `reg_no,name,...` 행 보임
   - [ ] 가격 "Snapshot $29 · Monthly $49 · API $99" 표시
   - [ ] 페이지 깨짐/레이아웃 밀림 없음(폰트·여백 정상)
   - [ ] 푸터에 `§13-A`, `§7-b` 같은 **내부 용어가 없음**(전문 면책고지만)

### TC-A2 — HTTPS/보안
1. 주소창 자물쇠 아이콘 클릭
2. 확인:
   - [ ] 인증서 유효(경고 없음), 연결이 안전함으로 표시

### TC-A3 — 한국어 페이지 & 언어 전환
1. 영문 페이지 우상단 `한국어` 클릭
2. 확인:
   - [ ] `/ko/` 로 이동, "즉시 쓰는 CSV·API로" 한국어 카피 보임
   - [ ] 푸터에 `English` 링크 있음 → 클릭 시 영문 root로 복귀
   - [ ] 한국어 페이지엔 상품 ①FDA, ②한국 KC/전파 둘 다 보임

### TC-A4 — 모바일 반응형
1. Chrome DevTools(F12) → 기기 툴바(Ctrl+Shift+M) → iPhone 등 선택
2. 확인:
   - [ ] 폼 입력칸이 가로 1열로 정렬(겹침/잘림 없음)
   - [ ] 버튼이 화면 밖으로 안 넘침

---

## B. 폼 제출 — 정상 경로(해피패스)

### TC-B1 — 샘플 요청 (sample)
1. 영문 `/` 에서 폼 작성:
   - Email: `qa-sample-1@example.com`
   - What do you do?: `Sourcing / supplier discovery`
   - What data…: `KWQ contract manufacturers with 510(k)`
   - What would you pay?: `$49/mo — subscription`
2. **"Send me the sample"** 클릭
3. 확인:
   - [ ] 폼 아래 초록색 "Got it — I'll be in touch shortly with the sample." 표시
   - [ ] 입력칸이 비워짐(reset)
4. 새 탭에서 `https://data.utilverse.info/count` 열기
   - [ ] `"total":1`, `"byIntent":{"sample":1}`, `"byProduct":{"fda":1}`, `"byWillingness":{"49":1}`
   - [ ] `"pass":false` (아직 기준 미달)

### TC-B2 — 사전구매 의향 (presale)
1. Email `qa-presale-1@example.com`, 가격 `$99/mo — API` 선택
2. **"I'd pre-order this"** 클릭
3. 확인:
   - [ ] 성공 메시지 표시
4. `/count` 확인:
   - [ ] `"total":2`, `"byIntent"` 에 `"presale":1` 추가
   - [ ] **`"pass":true`** ← presale 1건이면 통과 기준 충족

### TC-B3 — 한국어 폼 제출
1. `/ko/` 에서 상품 "①FDA", 이메일 `qa-ko-1@example.com`, 가격대 아무거나, "📄 샘플 먼저 받기" 클릭
2. `/count` 확인:
   - [ ] `"total":3` 으로 증가(한국어 폼도 같은 컬렉터로 수집됨)

---

## C. 유효성 & 엣지 케이스

### TC-C1 — 이메일 누락
1. 영문 폼에서 이메일 비우고 "Send me the sample" 클릭
2. 확인:
   - [ ] 브라우저 기본 검증으로 "이 입력란을 작성하세요" 풍선 표시, 제출 안 됨
   - [ ] `/count` total 증가 없음

### TC-C2 — 잘못된 이메일 형식
1. 이메일에 `notanemail` 입력 후 제출
2. 확인:
   - [ ] 브라우저가 형식 오류로 막음(`@` 요구)

### TC-C3 — 중복 제출(같은 이메일+상품)
1. `qa-sample-1@example.com` 으로 영문 폼 **다시** 제출(이미 B1에서 제출한 이메일)
2. `/count` 확인:
   - [ ] total 이 **증가하지 않음**(중복제거 동작 — 같은 이메일+상품은 1건 유지)

### TC-C4 — Enter 키 제출
1. 이메일 입력칸에서 텍스트 입력 후 **Enter** 누름
2. 확인:
   - [ ] 페이지가 새로고침되지 않고(폼 기본동작 차단), 정상 제출 처리됨
   - [ ] (기본 intent=sample 로 기록됨)

---

## D. 알려진 버그 노출 테스트 (현재는 실패가 정상 — 수정 전)

### TC-D1 — ❗ 오프라인 상태에서 제출 (버그 #1 재현)
> 코드리뷰 발견: 컬렉터 통신이 실패해도 성공 메시지가 뜨고 신호가 유실됨.
1. DevTools(F12) → Network 탭 → **Offline** 체크(또는 throttling=Offline)
2. 이메일 `qa-offline-1@example.com` 입력 후 "Send me the sample" 클릭
3. **현재(버그 있는) 동작 확인:**
   - [ ] ❌ 성공 메시지가 **그대로 뜸** (실제론 전송 실패인데)
   - [ ] Console 탭에 fetch 에러 로그 찍힘
4. Offline 해제 후 `/count` 확인:
   - [ ] `qa-offline-1` 신호가 **기록 안 됨**(유실 확인)
> ✅ 수정 후 기대: 이 경우 성공 메시지 대신 "전송 실패, 다시 시도" 류 오류가 떠야 함.

### TC-D2 — ❗ 봇/스팸 모의 (버그 #3 참고, 선택)
> 자동화 방어가 없어 카운트 조작 가능. 브라우저 수동으론 재현 어려움 — 참고용.
1. 서로 다른 가짜 이메일(`qa-bot-1@`, `qa-bot-2@` …)로 sample 5건 빠르게 제출
2. `/count` 확인:
   - [ ] `"pass":true` 로 쉽게 넘어감(방어 없음을 확인) → 수정 시 허니팟/레이트리밋 필요

---

## E. 보안 — 관리자 엔드포인트

### TC-E1 — 토큰 없이 리드 회수 차단
1. 주소창에 `https://data.utilverse.info/export` 입력
2. 확인:
   - [ ] `{"ok":false,"error":"unauthorized"}` (401) — 이메일 목록 노출 안 됨

---

## 리셋 (테스트 종료 후 필수)

테스트가 끝나면 수집된 `qa-...` 신호를 전부 지워 깨끗한 상태로 되돌려야 함.
서버 접근이 필요하므로 **클로드에게 "테스트 끝났어, 리셋해줘"** 라고 요청.
(내부적으로: `rm -f /var/lib/civicniche/13a-signals.json && systemctl restart civicniche-13a`)

리셋 확인: `https://data.utilverse.info/count` → `"total":0`.

---

## 결과 요약 기록

| 케이스 | 결과(P/F) | 비고 |
|---|---|---|
| A1 영문 로드 | | |
| A2 HTTPS | | |
| A3 언어전환 | | |
| A4 모바일 | | |
| B1 sample | | |
| B2 presale→pass | | |
| B3 한국어 제출 | | |
| C1 이메일누락 | | |
| C2 형식오류 | | |
| C3 중복제거 | | |
| C4 Enter제출 | | |
| D1 오프라인(버그) | | 수정 전엔 ❌ 정상 |
| D2 봇모의(버그) | | 참고 |
| E1 export차단 | | |
