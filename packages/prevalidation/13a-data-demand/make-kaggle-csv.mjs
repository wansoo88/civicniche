// FDA 정제본(JSON) → Kaggle/Datarade용 깔끔한 FDA 전용 CSV.
// RRA용 빈 컬럼(cert_no/maker/cert_date/hours) 제거, 필드명 정돈.
// 실행: node make-kaggle-csv.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = '../../data-pipeline/data/processed/fda-device-mfg.sellable.json';
const OUT = 'kaggle-fda-contract-manufacturers.csv';

const rows = JSON.parse(readFileSync(SRC, 'utf8'));
const cols = ['name', 'country', 'state', 'address', 'reg_no', 'product_codes', 'device_names', 'device_class', 'specialty', 'k_numbers', 'source'];

const esc = (v) => {
  const s = (v ?? '').toString();
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const join = (a) => (Array.isArray(a) ? a.join('; ') : (a ?? ''));

const lines = [cols.join(',')];
for (const r of rows) {
  const a = r.attributes || {};
  lines.push([
    esc(r.name),
    esc(a.country),
    esc(r.region),
    esc(r.address),
    esc(a.reg_no),
    esc(join(a.product_codes)),
    esc(join(a.services)),
    esc(join(a.device_classes)),
    esc(join(a.specialties)),
    esc(join(a.k_numbers)),
    esc('openFDA'),
  ].join(','));
}
writeFileSync(OUT, lines.join('\n') + '\n');
console.log(`✓ ${OUT} — ${rows.length} rows, ${cols.length} cols`);
