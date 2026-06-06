// 스테이지 A: 수집(§4-A). 니치별 소스 어댑터를 호출해 raw 레코드 + 원본 스냅샷 캐싱(§3 D1, R16).
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fetchSampleOfficial, fetchSampleOSM } from './adapters/sample.mjs';
import { fetchOSM } from './adapters/source-osm.mjs';
import { fetchPublicData } from './adapters/source-publicdata.mjs';
import { fetchFDA, fetchFDAAll } from './adapters/source-fda.mjs';
import { fetchRRA } from './adapters/source-rra.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(__dirname, 'data', 'cache');

/** 니치 → 소스 매핑. 실제 니치 추가 시 여기 등록(복제 노동 §3.3). */
const NICHE_SOURCES = {
  sample: async () => [...fetchSampleOfficial(), ...fetchSampleOSM()],

  // ② 추천 차선 — FDA 의료기기 계약제조사 (openFDA, CC0, 키 불필요 → 라이브)
  // FDA_FULL=1 이면 국가 슬라이싱으로 전건(~65k) 수집, 아니면 샘플 페이징.
  'fda-device-mfg': async () =>
    process.env.FDA_FULL === '1'
      ? fetchFDAAll()
      : fetchFDA({ maxPages: Number(process.env.FDA_MAX_PAGES || 3) }),

  // ① 추천 1순위 — KC/전파 적합성평가 (RRA, data.go.kr, 키 있으면 라이브·없으면 샘플)
  'rra-cert-kr': async () => fetchRRA(),
};

export async function fetchNiche(niche) {
  const loader = NICHE_SOURCES[niche];
  if (!loader) throw new Error(`니치 '${niche}' 소스 미등록. fetch.mjs NICHE_SOURCES에 추가하세요.`);
  const snapshot = join(cacheDir, `${niche}.raw.json`);

  let records = [];
  try {
    records = await loader();
  } catch (e) {
    console.warn(`⚠️  수집 예외(${e.message})`);
  }

  // 자가복구(§4.7 / R16): 라이브 0건이면 마지막 정상 스냅샷으로 사이트 유지(끊김 방지)
  if (!records.length && existsSync(snapshot)) {
    console.warn('⚠️  라이브 0건 → 캐시 스냅샷으로 폴백(사이트 유지)');
    try { records = JSON.parse(readFileSync(snapshot, 'utf8')); } catch { /* ignore */ }
  }

  // 정상 수집분만 스냅샷 갱신(0건 폴백 시엔 기존 스냅샷 보존)
  if (records.length) {
    try {
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(snapshot, JSON.stringify(records, null, 2), 'utf8');
    } catch { /* 캐싱 실패는 비치명 */ }
  }
  return records;
}
