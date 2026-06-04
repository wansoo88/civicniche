# CivicNiche

> 공공·오픈데이터를 정제해 **"한 페이지 = 한 고유 질의"** 로 만드는 데이터-차별형 디렉터리.
> 저자본(~$370) · 무인 근접 · 솔로 개발자 운영을 전제로 한 스캐폴드.
> 전략 근거 전문: [`../EXECUTION-PLAN.md`](../EXECUTION-PLAN.md)

⚠️ **이 코드를 돌리기 전에 반드시 읽을 것:** 이 모델은 "완전 무인·90일 큰 수익"을 약속하지 않습니다.
생존확률은 분해 시 ≈1~9%[추정]로 낮으며, **빌드 착수 전 선검증 2종**(`packages/prevalidation`)을
먼저 통과해야 합니다. 자세한 정직성 단서는 EXECUTION-PLAN.md §0, §9, §13 참고.

---

## 구성 (모노레포)

```
civicniche/
├─ packages/
│  ├─ niche-scorer/      # [옵션2] §4.4 니치 스코어링 룰브릭 (의존성 0, 즉시 실행)
│  ├─ prevalidation/     # [옵션1] §13 착수 전 선검증
│  │  ├─ 13a-data-demand/   # 데이터 직판 수요 검증 랜딩(정적)
│  │  └─ 13b-llm-cost/      # LLM 반복비 실측 스크립트 (mock 폴백)
│  ├─ data-pipeline/     # [옵션3] §3-4 fetch→정제→교차검증→품질게이트 (의존성 0)
│  └─ site/              # [옵션3] §3 Astro SSG (npm install 필요)
├─ scripts/              # 빌드 트리거(diff·니치별·야간묶음, §3.1)
└─ .github/workflows/    # §4 크론 파이프라인
```

## 빠른 시작 (의존성 없이 바로 도는 것부터)

```bash
# 1) 니치 스코어링 (옵션2) — 후보를 룰브릭으로 점수화·랭킹
node packages/niche-scorer/score.mjs

# 2) LLM 반복비 선검증 (옵션1, §13-B) — API 키 없으면 mock으로 추정
node packages/prevalidation/13b-llm-cost/measure.mjs

# 3) 데이터 파이프라인 (옵션3) — 샘플 소스로 fetch→정제→교차검증→품질게이트 전 과정 실행
node packages/data-pipeline/pipeline.mjs --niche=sample

# 4) 데이터 직판 수요 랜딩 (옵션1, §13-A) — 정적 페이지 미리보기
#    packages/prevalidation/13a-data-demand/index.html 를 브라우저로 열기

# 5) 사이트 빌드 (옵션3) — Astro (네트워크/설치 필요)
cd packages/site && npm install && npm run build
```

위 1~4는 **외부 의존성·네트워크·API 키 없이** 즉시 실행됩니다(Node 18+). 5만 설치가 필요합니다.

## 환경 변수

`.env.example`를 `.env`로 복사해 채웁니다. **키가 없어도 1~4는 mock 폴백으로 동작**합니다.

| 변수 | 용도 | 없으면 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 정규화/경계분류/반복비 실측 | 결정적 mock로 폴백(비용 0) |
| `DATA_GO_KR_KEY` | 공공데이터포털 OpenAPI | OSM/샘플 어댑터만 사용 |
| `INDEXNOW_KEY` | 색인 핑 | 핑 스킵 |

## 책임·적법성 (중요)

- 허용 소스: **정부/공공 공개데이터, 상업적 재배포가 허용된 공식 API, OSM(ODbL), 셀프서브 등재**만.
- **금지: LinkedIn/Crunchbase 등 ToS 위반 크롤링, 개인정보 수집.**
- 데이터 **유료 판매**는 `packages/data-pipeline/lib/licensegate.mjs`의 라이선스 게이트를 통과한 소스로만 (§7-법무게이트).
- 정보 오류 책임 완화: 교차검증(2출처 대조) + 면책고지 + 정정신고 (R11).

> 본 스캐폴드는 전략 검증을 위한 출발점입니다. 실제 운영 전 세무사 단건 상담(§7)과 각 소스 라이선스 개별 확인이 필요합니다.
