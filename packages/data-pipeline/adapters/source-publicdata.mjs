// 한국 공공데이터포털 OpenAPI 어댑터(§4.6). DATA_GO_KR_KEY 있으면 실제 조회, 없으면 빈 배열.
// ⚠️ 데이터셋별 이용허락범위 상이 — 상업적 재배포 전 개별 확인(licensegate.mjs: per-dataset).

const KEY = process.env.DATA_GO_KR_KEY;

/**
 * @param {{ endpoint:string, params?:Record<string,string>, datasetName?:string, map?:(item)=>object }} opts
 * @returns {Promise<Array>} raw 레코드
 */
export async function fetchPublicData(opts = {}) {
  if (!KEY) return [];
  if (!opts.endpoint) return [];
  const datasetName = opts.datasetName || 'gov-generic';
  const license = { name: `data.go.kr:${datasetName}`, url: opts.endpoint, license: 'KOGL-variant' };
  try {
    const url = new URL(opts.endpoint);
    url.searchParams.set('serviceKey', KEY);
    url.searchParams.set('type', 'json');
    for (const [k, v] of Object.entries(opts.params || {})) url.searchParams.set(k, v);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`data.go.kr ${res.status}`);
    const data = await res.json();
    // 응답 구조는 데이터셋마다 다름 — opts.map으로 매핑 주입(스키마 드리프트 격리, §4.7)
    const items = opts.pick ? opts.pick(data) : (data?.response?.body?.items?.item || data?.items || []);
    const mapFn = opts.map || ((x) => x);
    return items.map((it) => ({ _source: license, ...mapFn(it) }));
  } catch (e) {
    console.warn(`⚠️  공공데이터 fetch 실패(${e.message}) → 스킵`);
    return [];
  }
}
