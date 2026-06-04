// 빌드 타임 데이터 로더: 파이프라인 산출(processed/<niche>.json)을 읽어 색인 대상만 반환.
// 파일이 없으면(파이프라인 미실행) 작은 임베드 폴백으로 빌드는 성공시키되 경고.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NICHE = process.env.NICHE || 'sample';
const processedPath = join(__dirname, '..', '..', '..', 'data-pipeline', 'data', 'processed', `${NICHE}.json`);

const FALLBACK = [
  {
    id: 'sample-0', name: '예시 시설(파이프라인 미실행)', region: '서울', address: '서울특별시 ...',
    lat: 37.55, lng: 126.9, hours: '09:00-18:00',
    attributes: { services: ['예시'], reg_no: '0000-0' },
    sources: [{ name: 'osm', url: 'https://www.openstreetmap.org', license: 'ODbL' }],
    flags: { thin: false, noindex: false, crossValidated: true, sellable: false, stale: false },
    confidence: 0.8,
  },
];

// 색인 페이지 상한(§5 디인덱싱 방어): 상품(전건 판매)과 사이트(큐레이션 발행)를 분리한다.
// 전체 데이터셋이 수만 건이어도 사이트는 '데이터 밀도 높은 상위 N건'만 정적 발행해
// scaled-content(대량 thin-page) 트리거를 구조적으로 회피한다. 0/미설정이면 기본 500.
const SITE_MAX_RECORDS = Number(process.env.SITE_MAX_RECORDS || 500);

// 데이터 밀도(페이지 깊이) 점수 — 높을수록 thin-content에서 멀다(§5). 큐레이션 정렬 기준.
function richness(r) {
  const a = r.attributes || {};
  return (a.services?.length || 0)
    + (a.product_codes?.length || 0) * 2
    + (a.k_numbers?.length || 0)
    + (a.specialties?.length || 0)
    + (a.device_classes?.length || 0)
    + (r.flags?.crossValidated ? 5 : 0)
    + (r.address ? 1 : 0)
    + (r.hours ? 1 : 0);
}

export function loadRecords() {
  if (!existsSync(processedPath)) {
    console.warn(`⚠️  ${processedPath} 없음 → 폴백 데이터로 빌드. 먼저 'node packages/data-pipeline/pipeline.mjs' 실행 권장.`);
    return FALLBACK;
  }
  const all = JSON.parse(readFileSync(processedPath, 'utf8'));
  // 색인 대상만(noindex/thin 제외, §5) → 데이터 밀도순 정렬 → 상한 컷(큐레이션 발행)
  const indexable = all
    .filter((r) => !r.flags?.noindex)
    .sort((a, b) => richness(b) - richness(a));
  return SITE_MAX_RECORDS > 0 ? indexable.slice(0, SITE_MAX_RECORDS) : indexable;
}

export function groupByRegion(records) {
  const m = new Map();
  for (const r of records) {
    const k = r.region || '기타';
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
}

export const NICHE_TITLE = process.env.NICHE_TITLE || '반려동물 장묘시설';
