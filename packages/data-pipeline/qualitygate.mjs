// 스테이지 C: 품질 게이트(§5 디인덱싱 방어). scaled-content abuse 트리거를 구조적으로 회피.
//  1) "한 페이지 = 한 고유 질의" — name+region 필수
//  2) 검증된 실데이터 필드 최소 1개 강제(reg_no | 좌표 | 서비스 | 교차검증 영업시간)
//  3) 미달/단일출처 저신뢰 → thin=true → noindex (발행은 하되 색인 제외)
//  4) 판매 가능성은 licenseGate로 판정(§7-법무게이트)
import { licenseGate } from './lib/licensegate.mjs';

/** 검증된 실데이터 필드 개수(LLM 요약이 아닌 '사실' 필드) */
function realDataFieldCount(rec) {
  let n = 0;
  if (rec.attributes?.reg_no) n += 1;
  if (rec.lat && rec.lng) n += 1;
  if ((rec.attributes?.services || []).length) n += 1;
  if (rec.hours && rec.flags?.crossValidated) n += 1; // 교차검증된 영업시간만 '검증된 사실'로 인정
  return n;
}

/** KW 수요 조합만 색인 — 실제로는 KW 데이터 연동. 여기선 '필수필드 충족'을 프록시로 사용. */
function isIndexworthy(rec) {
  // 지역 앵커: 주(region)가 이상적이나 국제 레코드는 주가 없을 수 있어 국가(country)로도 인정.
  // (FDA 비-US 업체는 주 정보가 없지만 name+country+reg_no+제품코드로 충분한 페이지 깊이 확보.)
  const hasLocality = Boolean(rec.region || rec.attributes?.country);
  return Boolean(rec.name && hasLocality && realDataFieldCount(rec) >= 1);
}

/**
 * @returns {{records:Array, stats:{indexable:number, noindex:number, sellable:number, needsReview:number}}}
 */
export function qualityGate(records) {
  let indexable = 0, noindex = 0, sellable = 0, needsReview = 0;
  const out = records.map((rec) => {
    const r = { ...rec, flags: { ...rec.flags } };
    const real = realDataFieldCount(r);
    const thin = !isIndexworthy(r);
    r.flags.thin = thin;
    r.flags.noindex = thin || r.status === 'needs_review';
    r._realDataFields = real;

    // 판매 가능성(§7) — 교차검증 통과 + 모든 소스 재배포 가능일 때만
    const lg = licenseGate(r);
    r.flags.sellable = lg.sellable && !r.flags.noindex;
    r._licenseReasons = lg.reasons;
    r._attribution = lg.attribution;

    if (r.flags.noindex) noindex += 1; else indexable += 1;
    if (r.flags.sellable) sellable += 1;
    if (r.status === 'needs_review') needsReview += 1;
    return r;
  });
  return { records: out, stats: { indexable, noindex, sellable, needsReview } };
}
