# Datarade + Kaggle 제출 팩 (복붙용)

> 결정값 반영: 브랜드 **Utilverse Data** · 연락 **kimcomplete8888@gmail.com** · 웹사이트 **https://data.utilverse.info** · 전략 **Datarade + Kaggle 동시**
> 출처 원본 카피: [`LISTINGS-EN.md`](./LISTINGS-EN.md). 이 파일은 결정값을 채워 바로 제출 가능한 버전.

---

## A. Datarade (요청·승인형 — 즉시 등록 아님)

### 흐름 (현실)
1. https://datarade.ai/company/contact/list-your-data → "Get listed / List your data" 폼 제출(아래 §A1 메시지 사용).
2. Datarade 팀이 회신(보통 영업일 수일) → 스토어프론트(프로필) 셋업 도움.
3. 대시보드에서 상품(아래 §A2) 등록 → 가격·샘플 관리. **셋업비·리스팅비 0.**

### A1. 신청 폼 / 첫 메일 (복붙)
```
Hi Datarade team,

I'd like to list a data product as a provider.

Provider: Utilverse Data
Website: https://data.utilverse.info
Contact: kimcomplete8888@gmail.com

Product: FDA-Registered Medical Device Contract Manufacturers — a cleaned,
deduplicated directory built from openFDA (US public domain / CC0). 65,049
registrations deduplicated to 7,130 unique manufacturers, one canonical record
each with product codes, 510(k)s, device class, specialty, country, and FDA
registration number. Delivered as CSV snapshot, monthly subscription, or API.

Pricing: $29 snapshot / $49 monthly / $99 API. A 25-row sample is ready.

Could you set up a provider storefront for us? Thanks.
```

### A2. 상품 리스팅 필드 (대시보드 입력)
| 필드 | 값 |
|---|---|
| **Product name** | FDA-Registered Medical Device Contract Manufacturers — Cleaned & Deduplicated (CSV / API, monthly refresh) |
| **Provider** | Utilverse Data |
| **Short description** | A normalized, deduplicated directory of FDA-registered medical device **contract manufacturers** — product codes, 510(k)s, device class, specialty, country, registration number — built from openFDA (public domain). One canonical record per manufacturer, refreshed monthly. |
| **Full description** | ↓ 아래 블록 |
| **Categories / tags** | Healthcare & Medical Data · Company Data · Manufacturing · Regulatory / Compliance · B2B Sourcing · Firmographics |
| **Use cases** | 의료기기 소싱·공급사 발견 / 규제·공급망 매핑(RA·QA) / 서비스업체 영업 리드 / 시장·경쟁 리서치 |
| **Coverage / freshness** | United States FDA registry (전 세계 등록 제조사). 65,049 계약제조사 등록 → 7,130 고유 제조사(중복제거 후). openFDA에서 월 갱신. |
| **Pricing** | Snapshot CSV **$29** · Monthly **$49/mo** · API **$99/mo** |
| **Delivery** | CSV download (one-time) · monthly-refreshed CSV (subscription) · API access |
| **Sample** | `sample-fda-clean-teaser.csv` (깔끔한 25행) 첨부/링크 |
| **Licensing note** | Source: openFDA, U.S. public domain (CC0) — commercial redistribution permitted. Business/establishment information only; no personal data. Not an official FDA product; provided "as is" without warranty. |

**Full description 블록 (복붙):**
```
The U.S. FDA publishes device establishment registration & listing data through
openFDA (public domain / CC0), but it's tedious to use at scale: the API's `skip`
paging caps out around 25,000 records, the same establishment appears across many
listing documents, and product codes / device names are nested.

This dataset solves that. We pull all 65,049 contract-manufacturer
registrations, merge duplicate registrations into one canonical record per
manufacturer (7,130 unique manufacturers), and structure each into a single
ready-to-use row:

- Company name, full address, country, state/region
- FDA registration number (FEI)
- Product codes (all, unioned across the manufacturer's listings)
- Device names & device class
- Medical specialty
- 510(k) numbers (where present)

Delivered as a one-time CSV snapshot, a monthly-refreshed subscription, or API
access. The value is in the cleaning, de-duplication, completeness, and freshness
— not in data you couldn't otherwise get (the source is public).
```

> ⚠️ 정직 가드(과장 금지): "검증됨(verified)"으로 표현하지 말 것 — 단일 출처(openFDA), 교차검증 전. "정제·중복제거·구조화·최신성"으로만 판다. **전건 보유**: 65,049 등록 → **7,130 고유 제조사**(reg_no 기준 7,088과 ~1% 일치 검증). 월 갱신은 수동 재실행(자동화 전).

---

## B. Kaggle (즉시 셀프 등록 — 신호용, 무료 공개)

> 목적: 발견성·신뢰 + 수요 신호(다운로드·문의). 수익 아님. 랜딩 링크로 전건 유도.

### 업로드 파일
- **`kaggle-fda-contract-manufacturers-sample.csv`** (1,000행 샘플 — 무료 공개용)
- 전건(유료 납품)은 `fda-contract-manufacturers-full.csv` (7,130행)

### 데이터셋 카드 (복붙)
- **Title:** FDA Medical Device Contract Manufacturers (Cleaned & Deduplicated)
- **Subtitle:** 1,000-row sample of FDA contract manufacturers from openFDA (full set: 7,130) — product codes, 510(k), device class, country
- **Description / Methodology / Columns / Caveats:** [`LISTINGS-EN.md`](./LISTINGS-EN.md) §2 전체 복붙. "Full set + monthly refresh: https://data.utilverse.info" 링크 포함.
- **Tags:** healthcare, medical-devices, manufacturing, regulatory, companies, fda, open-data
- **License:** CC0 (출처 openFDA 퍼블릭도메인과 일치)

### 단계
1. kaggle.com 로그인 → Datasets → New Dataset
2. `kaggle-fda-contract-manufacturers-sample.csv` 업로드, 위 카드 입력
3. 공개(Public) 게시 → URL 확보
4. 랜딩(`data.utilverse.info`)·Datarade·커뮤니티 글에 Kaggle 링크 교차 게시
5. 다운로드 수·코멘트·"전건 있나요?" 문의 = 수요 신호로 관찰

---

## C. 게시 후 체크리스트
- [ ] Datarade 신청 메일 발송(§A1) / 회신 대기
- [ ] Kaggle 데이터셋 공개 + 랜딩 링크 삽입
- [ ] 랜딩 `/count` 모니터링(샘플≥5 또는 presale≥1 → Gate II GO)
- [ ] 리드 회수: `curl "https://data.utilverse.info/export?token=<ADMIN_TOKEN>"` → 샘플(`sample-fda-clean-teaser.csv`) 발송
- [ ] 결과 → [`../../../LEARNING-GATES.md`](../../../LEARNING-GATES.md) Gate II 기록
