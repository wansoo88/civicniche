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
