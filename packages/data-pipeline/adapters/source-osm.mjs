// OSM Overpass 어댑터(§4.6 벤더 추상화). 네트워크 가능 시 실제 조회, 실패 시 빈 배열.
// ODbL 라이선스 — 재배포 시 출처표시·동일조건(licensegate.mjs 참조).

const OVERPASS = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';

/**
 * @param {{ overpassQL?: string, bbox?: string }} opts
 * @returns {Promise<Array>} raw OSM 레코드
 */
export async function fetchOSM(opts = {}) {
  const ql = opts.overpassQL;
  if (!ql) return [];
  try {
    const res = await fetch(OVERPASS, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(ql),
    });
    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    const data = await res.json();
    const license = { name: 'osm', url: 'https://www.openstreetmap.org', license: 'ODbL' };
    return (data.elements || []).map((el) => ({
      _source: license,
      name: el.tags?.name,
      addr: [el.tags?.['addr:city'], el.tags?.['addr:street']].filter(Boolean).join(' '),
      opening_hours: el.tags?.opening_hours,
      lat: el.lat ?? el.center?.lat,
      lon: el.lon ?? el.center?.lon,
      _osm_id: el.id,
    })).filter((r) => r.name);
  } catch (e) {
    console.warn(`⚠️  OSM fetch 실패(${e.message}) → 스킵`);
    return [];
  }
}
