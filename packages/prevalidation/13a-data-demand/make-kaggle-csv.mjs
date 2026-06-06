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

// 캐글 샘플은 전 구간에서 균등 추출(국가순 정렬이라 stride 추출 시 84개국이 고루 섞임 → 글로벌 커버리지 시연).
const stride = Math.max(1, Math.floor(rows.length / KAGGLE_SAMPLE_N));
const sample = rows.filter((_, i) => i % stride === 0).slice(0, KAGGLE_SAMPLE_N);
// 티저 25행도 균등 추출(다양한 국가가 보이게).
const teaserStride = Math.max(1, Math.floor(rows.length / 25));
const teaser = rows.filter((_, i) => i % teaserStride === 0).slice(0, 25);

writeFileSync('fda-contract-manufacturers-full.csv', csv(rows));
writeFileSync('kaggle-fda-contract-manufacturers-sample.csv', csv(sample));
writeFileSync('sample-fda-clean-teaser.csv', csv(teaser));
console.log(`✓ full ${rows.length}행 / kaggle-sample ${sample.length}행(균등) / teaser ${teaser.length}행(균등)`);
