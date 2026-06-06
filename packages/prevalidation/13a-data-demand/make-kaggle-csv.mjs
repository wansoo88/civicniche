// FDA 정제본(JSON) → 깔끔한 FDA 전용 CSV 3종.
//  - fda-contract-manufacturers-full.csv : 전건(유료/Datarade 납품용)
//  - kaggle-fda-contract-manufacturers-sample.csv : 무료 캐글 공개용 샘플(전건의 일부)
//  - sample-fda-clean-teaser.csv : 이메일 첨부 25행 티저
// RRA용 빈 컬럼 제거, 필드명 정돈. 실행: node make-kaggle-csv.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = '../../data-pipeline/data/processed/fda-device-mfg.sellable.json';
const KAGGLE_SAMPLE_N = 1000;

const rows = JSON.parse(readFileSync(SRC, 'utf8'));
const cols = ['name', 'country', 'state', 'address', 'reg_no', 'product_codes', 'device_names', 'device_class', 'specialty', 'k_numbers', 'source'];

const esc = (v) => {
  const s = (v ?? '').toString();
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const join = (a) => (Array.isArray(a) ? a.join('; ') : (a ?? ''));
const toRow = (r) => {
  const a = r.attributes || {};
  return [esc(r.name), esc(a.country), esc(r.region), esc(r.address), esc(a.reg_no),
    esc(join(a.product_codes)), esc(join(a.services)), esc(join(a.device_classes)),
    esc(join(a.specialties)), esc(join(a.k_numbers)), esc('openFDA')].join(',');
};
const csv = (list) => [cols.join(','), ...list.map(toRow)].join('\n') + '\n';

writeFileSync('fda-contract-manufacturers-full.csv', csv(rows));
writeFileSync('kaggle-fda-contract-manufacturers-sample.csv', csv(rows.slice(0, KAGGLE_SAMPLE_N)));
writeFileSync('sample-fda-clean-teaser.csv', csv(rows.slice(0, 25)));
console.log(`✓ full ${rows.length}행 / kaggle-sample ${Math.min(KAGGLE_SAMPLE_N, rows.length)}행 / teaser 25행`);
