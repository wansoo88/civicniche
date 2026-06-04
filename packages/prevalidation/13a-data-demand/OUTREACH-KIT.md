# 13-A 아웃리치 키트 — 데이터 직판 '지불의사' 검증

> **목적:** "정제 FDA 계약제조사 데이터를 $29~99에 살 사람이 있나"를 빌드 전에 확인.
> **Profile-A 정합 순서:** ①마켓플레이스 리스팅(패시브·상설) → ②커뮤니티 1회 게시(가치선제공) → ③콜드(1주 한정·최후, 영업0 원칙의 예외적 실험).
> **판정:** [`../../../LEARNING-GATES.md`](../../../LEARNING-GATES.md) Gate II. 통과해도 '의향≠결제'라 약한 양성으로 가중.

---

## 0. 지금 손에 있는 자산 (2026-06-04 라이브)
| 자산 | 위치 | 용도 |
|---|---|---|
| 랜딩(영문, FDA) | **https://data.utilverse.info** (`index.html`) | 영어권 채널 도착지 — 의향·샘플요청·가격대 수집 |
| 랜딩(국문, KC/RRA) | **https://data.utilverse.info/ko/** (`index.ko.html`) | 한국 채널용(2차 신호) |
| 수집기(자체호스팅) | `collector/server.mjs` → 서버 `/opt/civicniche` (systemd `civicniche-13a`) | 폼→파일 저장, `/count` 통과 자동판정, `/export` 리드 회수 |
| **티저 샘플 CSV(25행)** | `sample-fda-device-mfg-teaser.csv` | 잠재구매자에게 맛보기로 첨부 |
| 전체 상품(1,654행) | `../../data-pipeline/data/processed/fda-device-mfg.sellable.csv` | 구매 시 제공분(현재 슬라이스) |

**상태 확인:** `curl https://data.utilverse.info/count` → `pass:true`(샘플≥5 또는 결제의향≥1) 자동판정.
**리드 회수(샘플 발송용):** `curl "https://data.utilverse.info/export?token=<ADMIN_TOKEN>"` (토큰은 서버 systemd 유닛에 보관).
> 배포·서버 구성은 [`../../../DEPLOY-RUNBOOK.md`] 및 메모리(infra-server-domain) 참조. (구 Cloudflare Worker판 `collector/worker.js`는 미사용·보존만.)

---

## 1. 상품 정의 (정직 버전)
**FDA 등록 의료기기 계약제조사(Contract Manufacturer) 정제 데이터셋.**
- **모수:** openFDA `device/registrationlisting` 중 계약제조사 **약 65,000 등록**(CC0 퍼블릭도메인).
- **가공 가치(진짜 차별점):** 원시 등록을 **중복제거(중복 등록 통합)·정규화·구조화** → 업체당 1 정규 레코드 + 제품코드·디바이스명·510(k)·디바이스클래스·의료전문분야·제조국·등록번호. (현재 4,000 표본 → **1,654 정규 레코드, 655 중복 클러스터 병합**.)
- **포지셔닝:** "스냅샷"이 아니라 **전건 + 월 갱신 구독 + API**. 재판매 방어는 '정적 파일'이 아니라 **'최신성'**에서 나옴(R18).
- **정직한 약점 2가지(영업 시 숨기지 말 것):**
  1. **단일 출처**(openFDA만) → 아직 2차 교차검증 아님. "구조화·완전성·최신성"으로 팔되 "검증됨"으로 과장 금지.
  2. **DIY 가능성** → openFDA는 다루기 쉬운 API. **단, 전건 수집엔 함정이 있다**: openFDA는 `skip` 상한(~25k)이 있어 65k를 단순 페이지네이션으로 못 받음 → 제품코드·국가별 슬라이스로 우회 조립 필요. **이 수고를 대신 해주는 게 상품 가치.** (이 한계가 곧 얕은 해자를 약간 메운다.)

## 2. 구매자 페르소나 → 채널 (구체)
| 페르소나 | 왜 사나 | 어디서 찾나 |
|---|---|---|
| 의료기기 소싱/조달 | "이 제품코드 만드는 계약제조사 전체" | Datarade 데이터요청, LinkedIn medtech 소싱 그룹 |
| 규제/인증 컨설턴트(RA/QA) | 경쟁·공급망 매핑 | RAPS 커뮤니티, r/regulatoryaffairs |
| 리드 브로커·세일즈 | 영업 타겟 리스트 | Datarade, 콜드 |
| 데이터 개발자·연구자 | 수집 수고 절감 | Kaggle, r/datasets, IndieHackers |

### 채널 우선순위 (Profile-A 정합)
1. **Datarade** (1순위, 패시브) — 데이터 디스커버리 마켓. 무료 리스팅 + 바이어가 '데이터 요청'을 올림. 상설이라 영업0 원칙에 맞음.
2. **Kaggle Datasets** (신호용) — 티저(또는 슬라이스) 무료 공개 → 다운로드·문의 수 = 수요 신호(수익 아님, 발견성·관심 계측).
3. **커뮤니티 1회 게시**(가치선제공) — r/datasets, r/medicaldevice, r/regulatoryaffairs, IndieHackers, RAPS. **팔지 말고 인사이트+티저 공유**, 랜딩은 푸터에.
4. **콜드 10~30건**(최후·1주 한정) — 소싱에이전시·RA 컨설턴트·리드브로커. **별도 발송 도메인**(§3.4), 메인/개인 도메인 평판 소각 금지. 1주 후 중단.

---

## 3. 복붙용 카피

### (A) Datarade / 마켓플레이스 리스팅
> 📎 **영문 전체 리스팅(Datarade·Kaggle 즉시 복붙)은 [`LISTINGS-EN.md`](./LISTINGS-EN.md).** 아래는 핵심 요약.
>
> **Title:** FDA-Registered Medical Device Contract Manufacturers — Cleaned & Deduplicated Directory (CSV/API, monthly refresh)
>
> **Description:** A normalized, deduplicated directory of FDA-registered medical device **contract manufacturers** (~65,000 establishment registrations, sourced from openFDA, public domain / CC0). Each record is consolidated to one canonical manufacturer with: product codes, device names, 510(k) numbers, device class, medical specialty, country, and registration number. We do the work openFDA's `skip` paging limit makes tedious — slicing by product code/country, merging duplicate registrations, and structuring it into one ready-to-use file. **Delivered as a one-time CSV snapshot, a monthly-refreshed subscription, or API access.**
>
> **Use cases:** medical-device sourcing & supplier discovery · regulatory/supply-chain mapping · sales lead lists · market research.
> **Sample:** 25-row teaser available on request. **Pricing:** snapshot $29 · monthly $49 · API $99.

### (B) 커뮤니티 1회 게시 (가치선제공형, Reddit/IndieHackers)
> **제목:** I cleaned & deduplicated the FDA's medical-device contract-manufacturer registry (~65k → structured) — sample inside
>
> openFDA exposes device registration/listing, but it's tedious to actually use at scale: the `skip` paging caps out around 25k, duplicate registrations are everywhere, and product codes/device names are nested. I normalized a slice into one canonical-per-manufacturer table (product codes, 510(k), device class, country, reg #). Sharing a **25-row sample CSV** [link]. Curious if this is useful to anyone doing medtech sourcing / regulatory mapping — happy to share the cleaning approach. (Full set + monthly refresh exists if useful: [landing].)

*규칙: 가치(샘플+방법)를 먼저. 하드셀 금지. 1개 커뮤니티당 1회. 셀프프로모 규정 확인.*

### (C) 콜드 이메일 (짧게·샘플 주도)
> **Subject:** cleaned FDA contract-manufacturer data ({{제품분야}}) — 25-row sample?
>
> Hi {{이름}} — saw you work in {{의료기기 소싱/RA}}. I maintain a deduplicated, structured directory of FDA-registered device **contract manufacturers** (product codes, 510(k), device class, country) — the part openFDA makes tedious to assemble at scale.
> Want a **free 25-row sample** for {{관심 제품코드/분야}}? Full set + monthly refresh if useful. No pitch — just gauging if it's worth maintaining. — {{이름}}
>
> *발송: 별도 도메인·소량 점증·옵트아웃 명시(CAN-SPAM/정보통신망법). 1주 후 중단.*

---

## 4. 측정 → 판정
- `curl https://data.utilverse.info/count` 가 `sample>=5 OR presale>=1` 자동판정(`pass` 필드).
- 가격대 응답(`willingness`)에서 **$29+ 선택 비율**을 같이 본다(호기심 vs 지불의사 분리).
- **기간 1~2주.** 결과 → [`LEARNING-GATES.md`](../../../LEARNING-GATES.md) Gate II 기록.
- ⚠️ **과적합 금지:** 샘플요청은 '관심', 결제의향($+)은 더 강한 신호. 0이면 G9(직판 비가동) — 부끄러운 결과 아니라 **빌드 전에 산 값진 정보**.
