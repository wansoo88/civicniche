// 스테이지: 중복제거(§4-B). 근접 중복을 클러스터링해 병합하되 출처(provenance)는 보존.
// 서로 다른 소스의 같은 엔티티는 '병합'되어 교차검증 대상이 된다(소스 2개 → crossValidate 가능).
import { findDuplicates } from './lib/dedupe-embed.mjs';

function mergeCluster(records) {
  // 신뢰도 높은 레코드를 기준(base)으로, 부족한 필드를 다른 레코드로 보강. 출처는 합집합.
  const sorted = [...records].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  const base = { ...sorted[0], attributes: { ...sorted[0].attributes }, flags: { ...sorted[0].flags } };
  const sources = new Map();
  const allHours = new Set();
  for (const r of sorted) {
    for (const s of r.sources || []) sources.set(s.name, s);
    if (r.hours) allHours.add(r.hours);
    for (const f of ['address', 'region', 'lat', 'lng', 'hours']) {
      if (!base[f] && r[f]) base[f] = r[f];
    }
    // 배열 속성 합집합 — 병합 시 정보 손실 방지(제품코드·디바이스클래스 등은 listing 문서마다 다를 수 있음).
    // 같은 업체의 여러 등록/listing을 합치므로 '제품코드로 브라우징' 가치가 병합으로 깎이지 않게 union 한다.
    for (const key of ['services', 'product_codes', 'device_classes', 'specialties', 'k_numbers', 'establishment_types']) {
      const u = new Set([...(base.attributes[key] || []), ...(r.attributes?.[key] || [])]);
      if (u.size) base.attributes[key] = [...u];
    }
    if (!base.attributes.reg_no && r.attributes?.reg_no) base.attributes.reg_no = r.attributes.reg_no;
    if (!base.attributes.country && r.attributes?.country) base.attributes.country = r.attributes.country;
  }
  base.sources = [...sources.values()];
  base._mergedFrom = sorted.length;
  base._hoursVariants = [...allHours]; // 교차검증에서 불일치 탐지에 사용
  // needs_review는 병합 후에도 보수적으로 전파
  if (sorted.some((r) => r.status === 'needs_review')) {
    base.status = base.status === 'ok' ? 'ok' : 'needs_review';
  }
  return base;
}

/**
 * @returns {{records:Array, before:number, after:number, mergedClusters:number}}
 */
export function dedupe(records, threshold = 0.6) {
  const { clusters } = findDuplicates(records, threshold);
  const merged = clusters.map((idxs) => (idxs.length === 1 ? records[idxs[0]] : mergeCluster(idxs.map((i) => records[i]))));
  return {
    records: merged,
    before: records.length,
    after: merged.length,
    mergedClusters: clusters.filter((c) => c.length > 1).length,
  };
}
