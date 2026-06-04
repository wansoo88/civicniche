// §4.4 니치 선택 스코어링 룰브릭 (코드화)
// 각 차원은 0~5 점수, 가중치를 곱해 합산. 두 개의 하드 게이트(재배포 적법성·미점령)를
// 두어 "점수는 높지만 불법 재배포/완전 점령"인 후보를 구조적으로 탈락시킨다.

/** 차원별 가중치 (EXECUTION-PLAN.md §4.4와 동일하게 유지) */
export const WEIGHTS = Object.freeze({
  searchDemand: 3,              // 롱테일 검색수요
  cpcCommercialIntent: 2,       // 상업적 의도 / CPC
  publicDataOnlyFactDensity: 3, // 공공데이터로만 알 수 있는 사실 밀도 (= 해자)
  incumbentSaturation: 3,       // 미점령도 (5=빈땅, 0=완전점령)
  licenseLegality: 2,           // 데이터 재배포 적법성
  affiliateExists: 1,           // 제휴 프로그램 존재
  dataSaleDemandSignal: 1,      // 데이터 직판 수요 신호
});

export const DIMENSIONS = Object.keys(WEIGHTS);
export const MAX_SCORE = DIMENSIONS.reduce((s, k) => s + WEIGHTS[k] * 5, 0); // = 75

/** 하드 게이트: 하나라도 걸리면 점수와 무관하게 REJECT */
export const GATES = Object.freeze({
  // 재배포/노출 적법성이 매우 낮으면(ToS 위반·재배포 불가) 탈락 (§7-법무게이트)
  minLicenseLegality: 2,
  // 대형 디렉터리/구글 비즈니스 프로필이 이미 완전 점령이면 탈락
  minIncumbentSaturation: 1,
});

function clamp05(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(5, x));
}

/**
 * 단일 후보 점수화.
 * @param {{name:string, market?:string, scores?:Record<string,number>}} c
 * @returns {{name, market, weighted, pct, gatePass, gateReasons, dims}}
 */
export function scoreCandidate(c) {
  const scores = c.scores || {};
  const dims = {};
  let weighted = 0;
  for (const k of DIMENSIONS) {
    const v = clamp05(scores[k]);
    dims[k] = v;
    weighted += v * WEIGHTS[k];
  }
  const gateReasons = [];
  if (dims.licenseLegality < GATES.minLicenseLegality) {
    gateReasons.push(`재배포 적법성<${GATES.minLicenseLegality} (현재 ${dims.licenseLegality}) → 유료판매·노출 리스크`);
  }
  if (dims.incumbentSaturation < GATES.minIncumbentSaturation) {
    gateReasons.push(`미점령도<${GATES.minIncumbentSaturation} (현재 ${dims.incumbentSaturation}) → 대형 디렉터리 완전 점령`);
  }
  return {
    name: c.name || '(이름없음)',
    market: c.market || '-',
    weighted,
    pct: Math.round((weighted / MAX_SCORE) * 1000) / 10,
    gatePass: gateReasons.length === 0,
    gateReasons,
    dims,
  };
}

/** 후보 배열을 점수화·정렬. 게이트 탈락은 뒤로 보낸다. */
export function rankCandidates(candidates) {
  return candidates
    .map(scoreCandidate)
    .sort((a, b) => {
      if (a.gatePass !== b.gatePass) return a.gatePass ? -1 : 1;
      return b.weighted - a.weighted;
    });
}
