// 수익화 설정 — 프로필 A: 최대 자동화(영업 0).
// 켜는 수익원: ① 데이터 셀프판매(트래픽 무관) ② 문맥 제휴(저트래픽에도) ③ 디스플레이 광고(규모 시).
// 끄는 수익원: ④ 스폰서/리드 영업(수동 영업 필요 → 무인 원칙과 충돌하여 제외).
//
// 모든 ID/링크는 .env(PUBLIC_* 노출) 또는 아래에서 직접 설정. 미설정 시 자리표시자만 노출(빌드는 정상).

export const PROFILE = 'max-automation'; // 영업 0, 패시브 전용

// ① 디스플레이 광고 (가장 늦게 의미화 — 트래픽 임계 필요)
//   AdSense: 소량 트래픽도 게재 가능(낮은 RPM). Ezoic 신규 250k/월 요구로 초기 진입불가[검증].
//   Mediavine Journey ~1만 세션/월, 표준 5만 세션/월[검증, 정책변동 가능].
export const ADS = {
  adsenseClient: import.meta.env.PUBLIC_ADSENSE_CLIENT || '', // 예: ca-pub-XXXXXXXX
  adsenseSlot: import.meta.env.PUBLIC_ADSENSE_SLOT || '',
};

// ② 문맥 제휴 — 카테고리/주제별 고의도 링크(B2B 인증대행·시험소 등 고단가).
//   record.attributes.category 또는 키워드로 매칭. nofollow·sponsored 표기 자동.
export const AFFILIATE = {
  // 매칭 안 될 때 기본
  default: [],
  // 카테고리 키워드 → 제휴 링크 목록
  byKeyword: {
    // 예시(실제 제휴 가입 후 url 교체):
    인증: [{ label: '인증 대행·시험 견적 받기', url: 'https://example-affiliate.com/cert?ref=civicniche', note: '제휴' }],
    certification: [{ label: 'Get a compliance testing quote', url: 'https://example-affiliate.com/test?ref=civicniche', note: 'affiliate' }],
    장묘: [{ label: '펫 상조·추모용품 보기', url: 'https://example-affiliate.com/pet?ref=civicniche', note: '제휴' }],
  },
};

// ③ 데이터 셀프판매 — 핵심 패시브 수익원(트래픽 무관). MoR 결제 링크.
//   §13-A 선검증 통과(수요 확인) 후 enabled=true 로.
export const DATA_SALE = {
  enabled: Boolean(import.meta.env.PUBLIC_DATASALE_URL),
  checkoutUrl: import.meta.env.PUBLIC_DATASALE_URL || '', // 예: Lemon Squeezy 결제 링크
  tiers: [
    { name: '스냅샷 CSV', price: '$29', desc: '1회 다운로드' },
    { name: '월 구독', price: '$49', desc: '정기 갱신 CSV' },
    { name: 'API 접근', price: '$99', desc: '최신성 보장' },
  ],
};

/** 레코드 → 매칭되는 제휴 링크 배열 */
export function affiliateFor(record) {
  const hay = [
    record?.category,
    ...(record?.attributes?.services || []),
    record?.name,
  ].filter(Boolean).join(' ').toLowerCase();
  const hits = [];
  for (const [kw, links] of Object.entries(AFFILIATE.byKeyword)) {
    if (hay.includes(kw.toLowerCase())) hits.push(...links);
  }
  return hits.length ? hits : AFFILIATE.default;
}
