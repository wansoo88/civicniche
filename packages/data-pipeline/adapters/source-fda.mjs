// openFDA 어댑터(§4.6) — 의료기기 등록·리스팅. API 키 불필요, CC0 퍼블릭도메인(데이터판매에 가장 깨끗).
// 추천 니치: FDA 등록 '계약 제조사(Contract Manufacturer)'를 제품코드·디바이스 타입별로 정리.
// 각 레코드에 device명·제품코드·510(k)·규제번호를 담아 페이지 깊이를 확보(thin-content 페널티 회피, §5).

const BASE = 'https://api.fda.gov/device/registrationlisting.json';
const CONTRACT_MFG = 'Manufacture Medical Device for Another Party (Contract Manufacturer)';

function buildAddress(reg) {
  return [reg.address_line_1, reg.city, reg.state_code, reg.iso_country_code, reg.zip_code]
    .filter(Boolean).join(' ');
}

const asArray = (v) => (Array.isArray(v) ? v : v ? [v] : []);

function mapResult(res) {
  const reg = res.registration || {};
  const products = res.products || [];
  // 서비스 = 이 업체가 만드는 디바이스명(검색 대상). 중복 제거·상위 8개.
  const deviceNames = [...new Set(products.map((p) => p.openfda?.device_name).filter(Boolean))].slice(0, 8);
  const productCodes = [...new Set(products.map((p) => p.product_code).filter(Boolean))];
  const specialties = [...new Set(products.map((p) => p.openfda?.medical_specialty_description).filter(Boolean))];
  const deviceClasses = [...new Set(products.map((p) => p.openfda?.device_class).filter(Boolean))];
  const kNumbers = [...new Set([...asArray(res.k_number), ...products.flatMap((p) => asArray(p.k_number))])].slice(0, 10);
  const estabTypes = (res.establishment_type || []).filter((t) => /Contract Manufacturer|Manufacture Medical Device/i.test(t));

  return {
    _source: { name: 'openfda', url: BASE, license: 'CC0' },
    name: reg.name,
    region: reg.state_code || reg.iso_country_code || null, // 어댑터가 region 직접 지정
    road_addr: buildAddress(reg),
    reg_no: reg.registration_number || reg.fei_number || null,
    svc: deviceNames.join(','),                              // normalize가 services로 분해
    // normalize가 병합할 추가 속성(페이지 깊이·필터 축)
    attributes: {
      product_codes: productCodes,
      device_classes: deviceClasses,
      specialties,
      k_numbers: kNumbers,
      establishment_types: estabTypes,
      country: reg.iso_country_code || null,
      owner_operator: res.registration?.owner_operator?.firm_name || null,
    },
  };
}

/**
 * @param {{ search?:string, limit?:number, maxPages?:number }} opts
 * @returns {Promise<Array>} raw 레코드
 */
export async function fetchFDA(opts = {}) {
  const search = opts.search || `establishment_type:"${CONTRACT_MFG}"`;
  const limit = Math.min(opts.limit || 100, 100); // openFDA 페이지 상한 100
  const maxPages = opts.maxPages ?? 3;             // 무키 레이트리밋 존중(샘플). 0 허용(테스트)
  const out = [];
  for (let page = 0; page < maxPages; page += 1) {
    const url = `${BASE}?search=${encodeURIComponent(search)}&limit=${limit}&skip=${page * limit}`;
    try {
      const res = await fetch(url);
      if (res.status === 404) break; // openFDA는 결과 없으면 404
      if (!res.ok) throw new Error(`openFDA ${res.status}`);
      const data = await res.json();
      const results = data.results || [];
      for (const r of results) out.push(mapResult(r));
      if (results.length < limit) break;
    } catch (e) {
      console.warn(`⚠️  openFDA fetch 실패(p${page}, ${e.message}) → 중단`);
      break;
    }
  }
  return out.filter((r) => r.name);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, tries = 3) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.status === 404) return { results: [] }; // openFDA: 결과 없음
      if (res.status === 429) { await sleep(2000 * (i + 1)); continue; } // 레이트리밋 백오프
      if (!res.ok) throw new Error(`openFDA ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(800 * (i + 1));
    }
  }
  return { results: [] };
}

/**
 * 전건 수집(§3.2 skip 상한 우회). openFDA skip 상한(~25k)을 국가 슬라이싱으로 우회한다.
 * 어떤 국가도 25k 미만이면(현재 최대 US ~24.7k) 국가별 단순 페이징으로 전건 확보.
 * @returns {Promise<Array>} raw 레코드(약 65k)
 */
export async function fetchFDAAll(opts = {}) {
  const baseSearch = `establishment_type:"${CONTRACT_MFG}"`;
  const limit = 100;
  const delayMs = opts.delayMs ?? 300; // 무키 240/min 존중
  // 1) 국가 분포
  const countURL = `${BASE}?search=${encodeURIComponent(baseSearch)}&count=registration.iso_country_code`;
  const countData = await getJSON(countURL);
  const countries = (countData.results || []).map((x) => ({ term: x.term, count: x.count }));
  if (!countries.length) {
    console.warn('⚠️  국가 분포 0 → 단순 페이징 폴백');
    return fetchFDA({ maxPages: 250 });
  }
  const total = countries.reduce((s, c) => s + c.count, 0);
  console.log(`  openFDA 전건 수집: ${countries.length}개국, 합계 ${total} 레코드`);
  const out = [];
  let calls = 0;
  for (const { term, count } of countries) {
    if (count > 25000) console.warn(`  ⚠️  ${term} ${count} > 25k: skip 상한 초과분 누락 가능(주 단위 재분할 필요)`);
    const search = `${baseSearch} AND registration.iso_country_code:${term}`;
    const pages = Math.ceil(Math.min(count, 25000) / limit);
    for (let p = 0; p < pages; p += 1) {
      const url = `${BASE}?search=${encodeURIComponent(search)}&limit=${limit}&skip=${p * limit}`;
      const data = await getJSON(url);
      const results = data.results || [];
      for (const r of results) out.push(mapResult(r));
      calls += 1;
      if (results.length < limit) break;
      await sleep(delayMs);
    }
    console.log(`  ${term}: ${count}건 수집 (누적 ${out.length}, 호출 ${calls})`);
  }
  return out.filter((r) => r.name);
}
