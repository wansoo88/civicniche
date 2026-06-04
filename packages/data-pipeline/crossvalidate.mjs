// 스테이지 H2: 교차검증(§4.2). 2개 이상 출처가 있는 레코드의 핵심 필드를 대조해
// '살아있지만 틀린' 값을 탐지. 일치 → crossValidated(신뢰↑), 불일치 → stale-flag + needs_review.
// 단일 출처는 보수적으로 비공개 기본값에 가깝게(판매 보류) 둔다.

/** 변동 민감 필드(틀리면 사용자 손해) 우선 — 영업시간·서비스. */
function compareRecord(rec) {
  const sourceCount = (rec.sources || []).length;
  const issues = [];

  // 병합 시 수집된 영업시간 변형이 2개 이상이면 불일치
  const hoursVariants = (rec._hoursVariants || []).filter(Boolean);
  if (hoursVariants.length > 1) {
    issues.push(`영업시간 출처간 불일치: ${hoursVariants.join(' vs ')}`);
  }

  let crossValidated = false;
  if (sourceCount >= 2 && issues.length === 0) crossValidated = true;

  return { crossValidated, singleSource: sourceCount < 2, issues };
}

/**
 * @returns {{records:Array, crossValidated:number, conflicts:number, singleSource:number}}
 */
export function crossValidate(records) {
  let crossValidated = 0, conflicts = 0, singleSource = 0;
  const out = records.map((rec) => {
    const r = { ...rec, flags: { ...rec.flags } };
    const { crossValidated: cv, singleSource: ss, issues } = compareRecord(r);
    r.flags.crossValidated = cv;
    if (cv) crossValidated += 1;
    if (issues.length) {
      conflicts += 1;
      r.flags.stale = true;
      r.status = 'needs_review';
      r.reviewReasons = [...(r.reviewReasons || []), ...issues];
    }
    if (ss) {
      singleSource += 1;
      // 단일 출처 = 가공 창작성/판매는 보류(노출은 허용). 신뢰도 약간 하향.
      r.confidence = Math.min(r.confidence ?? 1, 0.7);
      r._singleSource = true;
    }
    return r;
  });
  return { records: out, crossValidated, conflicts, singleSource };
}
