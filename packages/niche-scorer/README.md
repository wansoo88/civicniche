# niche-scorer (옵션 2 · §4.4)

니치 후보를 **룰브릭**으로 점수화하고 **하드 게이트**(재배포 적법성·미점령도)로 거른 뒤 랭킹합니다.
점수만 보고 들어가면 죽는 "검색수요는 크지만 완전 점령/불법 재배포" 니치를 구조적으로 탈락시키는 게 핵심.

## 실행

```bash
node score.mjs                      # data/candidates.json(있으면) → 없으면 sample
node score.mjs path/to/custom.json  # 임의 입력
```

출력: 터미널 랭킹 표 + `data/scored.json`.

## 입력 형식

```jsonc
{ "candidates": [ { "name": "...", "market": "KR|global-EN|both",
  "scores": { "searchDemand":0-5, "cpcCommercialIntent":0-5, "publicDataOnlyFactDensity":0-5,
              "incumbentSaturation":0-5, "licenseLegality":0-5, "affiliateExists":0-5, "dataSaleDemandSignal":0-5 } } ] }
```

`niche-discovery` 워크플로우의 `vetted` 배열이 이 형식과 호환됩니다 → `data/candidates.json`으로 저장 후 실행.

## 룰브릭 가중치 (`rubric.mjs`, §4.4와 동기화)

| 차원 | 가중치 | 의미 |
|---|---|---|
| searchDemand | ×3 | 롱테일 검색수요 |
| publicDataOnlyFactDensity | ×3 | 공공데이터로만 알 수 있는 사실 밀도 (= 해자) |
| incumbentSaturation | ×3 | 미점령도(5=빈땅) |
| cpcCommercialIntent | ×2 | 상업적 의도/CPC |
| licenseLegality | ×2 | 재배포 적법성 |
| affiliateExists | ×1 | 제휴 프로그램 |
| dataSaleDemandSignal | ×1 | 데이터 직판 수요 |

**하드 게이트:** `licenseLegality < 2` 또는 `incumbentSaturation < 1` → 점수 무관 ⛔ REJECT.

> 룰브릭은 **사람의 최종 판단을 대체하지 않습니다**(§4.4). 상위 후보의 "왜 통과/탈락"을 사람이 검토·반증하세요.
