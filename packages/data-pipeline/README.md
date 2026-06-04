# data-pipeline (옵션 3 · §3-4)

`fetch → normalize → dedupe → cross-validate → quality-gate(+license-gate)` 전 과정을 의존성 0으로 실행.
오프라인에서는 샘플 소스로, `DATA_GO_KR_KEY`/네트워크가 있으면 실소스로 동작.

## 연결된 니치

| 니치 키 | 소스 | 상태 | 라이선스 |
|---|---|---|---|
| `sample` | 샘플(공식+OSM) | 오프라인 데모 | 혼합 |
| `fda-device-mfg` | **openFDA 라이브**(계약제조사) | ✅ 키 불필요, 즉시 실행 | CC0(판매가능) |
| `rra-cert-kr` | RRA(data.go.kr) KC/전파 인증 | 키 있으면 라이브, 없으면 샘플 | per-dataset(확인 후 판매) |

```bash
node pipeline.mjs --niche=fda-device-mfg   # 라이브 openFDA → 255 페이지(판매가능, CC0)
node pipeline.mjs --niche=rra-cert-kr      # 샘플 폴백(DATA_GO_KR_KEY+RRA_ENDPOINT 설정 시 라이브)
node pipeline.mjs --niche=sample
```

> RRA 착수 전 게이트: data.go.kr 적합성평가 데이터셋이 'LINK형'이 아니라 전건 벌크 적재·재배포 허용인지 1건 확인(`source-rra.mjs` 상단 주석).

산출(`data/`):
- `processed/<niche>.json` — 사이트 생성 입력(전체, 플래그 포함)
- `processed/<niche>.sellable.json` — §7 법무게이트 통과 직판 후보
- `review-queue.json` — 사람 승인 큐(§4.1)
- `processed/<niche>.stats.json` — 단계별 통계

## 스테이지 ↔ 계획 매핑

| 파일 | 스테이지 | 계획 |
|---|---|---|
| `fetch.mjs` + `adapters/` | A 수집 + 스냅샷 캐싱 | §4-A, R16 |
| `normalize.mjs` | B 정규화 + 경계 LLM | §4-B, §3.2 |
| `lib/dedupe-embed.mjs` + `dedupe.mjs` | 근접중복 병합(출처 보존) | §4-B |
| `crossvalidate.mjs` | H2 2출처 대조→stale-flag | §4.2 |
| `qualitygate.mjs` | C thin-page·noindex | §5 |
| `lib/licensegate.mjs` | 판매 적법성 게이트 | §7 |

## 실제 니치 추가(복제 노동, §3.3)

1. `fetch.mjs`의 `NICHE_SOURCES`에 니치 키 + 소스 어댑터 등록
2. 소스별 필드 → 표준 스키마 매핑(`normalize.mjs` pick* 함수 확장 또는 어댑터 map)
3. `lib/licensegate.mjs` `LICENSES`에 소스 라이선스 등록 + `LEGAL_CHECKLIST` 수행
4. `node pipeline.mjs --niche=<key>` 실행

> ⚠️ 새 소스마다 파서/라이선스 검증이 필요합니다(복제비용 ≠ 0). 위성 니치는 'low-touch' 유지 가능할 때만 추가(§3.3, G7).

## 무인 운영(§4)에서 빠진 조각 — 후속 구현 TODO

- `needs_review` 승인 UI(2출처 자동 병치, §4.1) — 현재는 큐 JSON만 산출
- self-heal 파서 자동패치 PR(§4.7), 수익 A/B(§4.8), 콜드아웃리치 발송(§3.4)
- Cloudflare Worker(리드폼·스폰서 웹훅·정정신고 수집)
