// 레코드 → CSV 변환(데이터 셀프판매 상품 자동생성, 영업 0). 중첩 필드는 평탄화.
function cell(v) {
  if (v == null) return '';
  if (Array.isArray(v)) v = v.join('; ');
  else if (typeof v === 'object') v = JSON.stringify(v);
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const COLUMNS = [
  ['id', (r) => r.id],
  ['name', (r) => r.name],
  ['region', (r) => r.region],
  ['address', (r) => r.address],
  ['hours', (r) => r.hours],
  ['reg_no', (r) => r.attributes?.reg_no],
  ['services', (r) => r.attributes?.services],
  ['product_codes', (r) => r.attributes?.product_codes],
  ['device_classes', (r) => r.attributes?.device_classes],
  ['specialties', (r) => r.attributes?.specialties],
  ['k_numbers', (r) => r.attributes?.k_numbers],
  ['cert_no', (r) => r.attributes?.cert_no],
  ['maker', (r) => r.attributes?.maker],
  ['country', (r) => r.attributes?.country],
  ['cert_date', (r) => r.attributes?.cert_date],
  ['cross_validated', (r) => r.flags?.crossValidated],
  ['sources', (r) => (r.sources || []).map((s) => s.name)],
];

export function toCSV(records) {
  const header = COLUMNS.map(([h]) => h).join(',');
  const rows = records.map((r) => COLUMNS.map(([, fn]) => cell(fn(r))).join(','));
  return [header, ...rows].join('\n') + '\n';
}
