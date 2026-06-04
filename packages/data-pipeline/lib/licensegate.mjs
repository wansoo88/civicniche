// §7-법무게이트: 정제 데이터 유료 판매의 적법성 게이트(코드화).
// "가공물의 저작권·DB권"과 "원본 라이선스의 상업적 재배포 조건"은 별개다.
// 한 레코드의 '모든' 출처가 상업적 재배포 허용일 때만 sellable=true.
// 재배포 불허/미확인 소스가 섞이면 노출(정보제공)까지만 허용, 유료 판매에서 제외.

/** 알려진 소스 라이선스 레지스트리. 실제 데이터셋별로 개별 확인 후 갱신하세요. */
export const LICENSES = {
  osm: {
    redistribute: true, license: 'ODbL', attribution: true, shareAlike: true,
    note: 'ODbL — 재배포 가능하나 출처표시+동일조건 의무. 산출 DB에 ODbL 전파 영향 검토.',
  },
  'self-serve': {
    redistribute: true, license: 'submitter-consent', attribution: false,
    note: '등재자가 직접 제출·동의한 정보.',
  },
  openfda: {
    redistribute: true, license: 'CC0', attribution: false,
    note: 'openFDA 퍼블릭도메인(CC0) — 무제한 상업적 재배포. 단 면책고지 권장(공식 라벨 아님).',
  },
  'data.go.kr': {
    redistribute: 'per-dataset', license: 'KOGL-variant', attribution: true,
    note: '공공데이터포털은 데이터셋별 이용허락범위 상이 — 상업적 재배포 허용 여부 개별 확인 필요.',
  },
  'gov-generic': {
    redistribute: 'per-dataset', license: 'unknown', attribution: true,
    note: '정부/규제기관 공개데이터 — 약관 개별 확인.',
  },
};

/** §7 법무 체크리스트(니치/소스별로 사람이 수행, 복제 노동 §3.3에 포함) */
export const LEGAL_CHECKLIST = [
  '원본 라이선스가 상업적 재배포(유료 판매)를 허용하는가?',
  '출처표시·라이선스 호환(CC-BY/ODbL 등 승계 의무) 충족 가능한가?',
  '단순 복제가 아니라 정제·정규화·교차검증·결합으로 가공 창작성(편집저작물성)을 확보했는가?',
  '개인정보 미포함(사업자 공개정보만)인가?',
  '재배포 불허 소스는 노출까지만 허용하고 유료 판매에서 제외했는가?',
];

function sourceRedistributable(sourceName) {
  // 'data.go.kr:동물장묘업' 같은 형태도 접두 매칭
  const key = Object.keys(LICENSES).find((k) => sourceName === k || sourceName.startsWith(k + ':'));
  if (!key) return { ok: false, reason: `미등록 소스(${sourceName}) — 라이선스 확인 전 판매 불가`, license: null };
  const lic = LICENSES[key];
  if (lic.redistribute === true) return { ok: true, license: lic, key };
  if (lic.redistribute === 'per-dataset') return { ok: false, reason: `${key}: 데이터셋별 확인 필요`, license: lic, key };
  return { ok: false, reason: `${key}: 재배포 불허`, license: lic, key };
}

/**
 * 레코드의 판매 가능성 판정. 모든 소스가 재배포 가능해야 sellable.
 * @returns {{sellable:boolean, reasons:string[], attribution:string[]}}
 */
export function licenseGate(record) {
  const sources = record.sources || [];
  if (!sources.length) return { sellable: false, reasons: ['출처 없음'], attribution: [] };
  const reasons = [];
  const attribution = new Set();
  let sellable = true;
  for (const s of sources) {
    const r = sourceRedistributable(s.name);
    if (!r.ok) { sellable = false; reasons.push(r.reason); }
    if (r.license?.attribution) attribution.add(r.key || s.name);
  }
  // 가공 창작성: 교차검증을 거친 레코드만 '가공 부가가치' 인정(보수적)
  if (sellable && !record.flags?.crossValidated) {
    reasons.push('가공 창작성 보강 권장(교차검증 미통과) — 노출은 가능, 판매는 보류 권장');
  }
  return { sellable, reasons, attribution: [...attribution] };
}
