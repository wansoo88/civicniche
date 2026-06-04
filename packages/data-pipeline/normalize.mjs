// 스테이지 B: 정규화(§4-B). 소스별 필드를 표준 스키마로 매핑 + 규칙 정규화.
// 규칙으로 못 거른 경계 케이스만 LLM 1차 분류(증분, §3.2) → 저신뢰는 needs_review.
import { callLLM } from '../shared/llm.mjs';

const REGION_PREFIX = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '충청', '전라', '경상'];

function pickName(r) { return r.biz_nm || r.name || null; }
function pickAddress(r) { return r.road_addr || r.addr || null; }
function pickLat(r) { return r.lat ?? null; }
function pickLng(r) { return r.lng ?? r.lon ?? null; }

function deriveRegion(addr) {
  if (!addr) return null;
  const hit = REGION_PREFIX.find((p) => addr.startsWith(p) || addr.includes(p));
  return hit || addr.split(/\s+/)[0] || null;
}

/** 규칙 기반 영업시간 정규화. 파싱 실패 시 null 반환(→ LLM 폴백 대상). */
function normalizeHoursRule(raw) {
  if (!raw) return { value: null, parsed: false };
  const s = String(raw).trim();
  if (/24\s*시간|24h|00:00-24:00/i.test(s)) return { value: '24시간', parsed: true };
  // "09:00~20:00", "09:00-20:00", "10시-19시", "Mo-Su 09:00-20:00"
  const m = s.match(/(\d{1,2})\s*[:시]\s*(\d{2})?\D*?(\d{1,2})\s*[:시]\s*(\d{2})?/);
  if (m) {
    const h1 = m[1].padStart(2, '0'), m1 = (m[2] || '00');
    const h2 = m[3].padStart(2, '0'), m2 = (m[4] || '00');
    return { value: `${h1}:${m1}-${h2}:${m2}`, parsed: true };
  }
  return { value: null, parsed: false };
}

function pickHoursRaw(r) { return r.oper_hr || r.opening_hours || ''; }
function pickServices(r) {
  if (r.svc) return String(r.svc).split(/[,;]/).map((x) => x.trim()).filter(Boolean);
  return [];
}

/** 필드 완전성 기반 신뢰도(0~1). 물리적 위치가 없는 레코드(인증·등록번호 등)도 공정 평가. */
function computeConfidence(rec) {
  const checks = [
    Boolean(rec.name),
    Boolean(rec.region),
    Boolean(rec.attributes?.reg_no),                       // 등록/인증번호 = 식별 앵커
    Boolean(rec.address || (rec.lat && rec.lng)),          // 물리적 위치(있으면 가점, 없어도 됨)
    (rec.attributes?.services || []).length > 0,           // 서비스/종류/디바이스
    Boolean(rec.hours),
  ];
  const score = checks.filter(Boolean).length;
  return Math.round((score / checks.length) * 100) / 100;
}

/**
 * raw 레코드 배열 → 정규화 레코드 배열. boundary(영업시간 규칙 파싱 실패 등)는 LLM 폴백.
 * @returns {Promise<{records:Array, llmCalls:number, llmCostUSD:number, mocked:boolean}>}
 */
export async function normalizeAll(rawRecords) {
  const out = [];
  let llmCalls = 0, llmCostUSD = 0, mocked = false;

  for (let i = 0; i < rawRecords.length; i += 1) {
    const r = rawRecords[i];
    const name = pickName(r);
    const address = pickAddress(r);
    const hoursRaw = pickHoursRaw(r);
    let hours = normalizeHoursRule(hoursRaw);
    let needsReview = false;
    const reviewReasons = [];

    // 경계: 영업시간 원본은 있는데 규칙 파싱 실패 → LLM 1차 분류
    if (!hours.parsed && hoursRaw) {
      const res = await callLLM({
        system: '너는 영업시간 정규화기다. 입력을 "HH:MM-HH:MM" 또는 "24시간" 또는 "unknown" 한 줄로만 출력.',
        prompt: `영업시간: ${hoursRaw}`,
        maxTokens: 20,
      });
      llmCalls += 1; llmCostUSD += res.costUSD; mocked = mocked || res.mocked;
      const guess = (res.text || '').match(/\d{1,2}:\d{2}-\d{1,2}:\d{2}|24시간/);
      if (guess) hours = { value: guess[0], parsed: true };
      else { needsReview = true; reviewReasons.push('영업시간 정규화 실패'); }
    }

    // URL-안전 슬러그(슬래시·쉼표·점·공백 등 제거, 한글·영숫자 유지)
    const slug = (name || 'item').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'item';
    const rec = {
      id: `${slug}-${i}`,
      name,
      address,
      region: r.region || deriveRegion(address), // 어댑터가 region을 직접 주면 우선
      lat: pickLat(r),
      lng: pickLng(r),
      hours: hours.value,
      // 어댑터 제공 추가 속성(product_codes·cert 등)을 병합 보존
      attributes: { services: pickServices(r), reg_no: r.reg_no || null, ...(r.attributes || {}) },
      sources: r._source ? [r._source] : [],
      flags: { thin: false, noindex: false, crossValidated: false, sellable: false, stale: false },
    };
    rec.confidence = computeConfidence(rec);

    // 필수 식별 앵커 결손 → needs_review (물리적 위치 OR 등록/인증번호 중 하나는 있어야)
    if (!rec.name) { needsReview = true; reviewReasons.push('이름 없음'); }
    if (!rec.address && !(rec.lat && rec.lng) && !rec.attributes?.reg_no) {
      needsReview = true; reviewReasons.push('식별 정보 없음(위치·등록번호 모두 없음)');
    }
    if (rec.confidence < 0.5) { needsReview = true; reviewReasons.push(`저신뢰(${rec.confidence})`); }

    rec.status = needsReview ? 'needs_review' : 'ok';
    rec.reviewReasons = reviewReasons;
    out.push(rec);
  }
  return { records: out, llmCalls, llmCostUSD, mocked };
}
