#!/usr/bin/env node
// 니치 후보를 룰브릭으로 점수화·랭킹하고 표로 출력 + scored.json 저장.
// 사용: node score.mjs [candidates.json]
//   기본 입력: ./data/candidates.sample.json
//   니치-발굴 워크플로우 결과를 ./data/candidates.json 로 떨구면 그걸 자동 우선 사용.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { rankCandidates, WEIGHTS, MAX_SCORE, DIMENSIONS } from './rubric.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'data');

function pickInput() {
  const arg = process.argv[2];
  if (arg) return resolve(arg);
  const real = join(dataDir, 'candidates.json');      // 워크플로우 산출물(실데이터) 우선
  if (existsSync(real)) return real;
  return join(dataDir, 'candidates.sample.json');     // 폴백: 샘플
}

const inputPath = pickInput();
let candidates;
try {
  const raw = JSON.parse(readFileSync(inputPath, 'utf8'));
  candidates = Array.isArray(raw) ? raw : raw.candidates || raw.vetted || [];
} catch (e) {
  console.error(`❌ 입력을 읽지 못했습니다: ${inputPath}\n   ${e.message}`);
  process.exit(1);
}

if (!candidates.length) {
  console.error('❌ 후보가 비어 있습니다.');
  process.exit(1);
}

const ranked = rankCandidates(candidates);

const SHORT = {
  searchDemand: '검색', cpcCommercialIntent: 'CPC', publicDataOnlyFactDensity: '데이터밀도',
  incumbentSaturation: '미점령', licenseLegality: '적법', affiliateExists: '제휴', dataSaleDemandSignal: '직판',
};

const isSample = inputPath.endsWith('candidates.sample.json');
console.log('\n════════════════════════════════════════════════════════════════');
console.log(`  CivicNiche 니치 스코어링  (입력: ${isSample ? 'SAMPLE — 워크플로우 결과로 교체 필요' : inputPath.split(/[\\/]/).pop()})`);
console.log(`  만점 ${MAX_SCORE} · 가중치 ${DIMENSIONS.map((d) => `${SHORT[d]}×${WEIGHTS[d]}`).join(' ')}`);
console.log('════════════════════════════════════════════════════════════════\n');

let rank = 0;
for (const r of ranked) {
  rank += 1;
  const bar = '█'.repeat(Math.round(r.pct / 5)).padEnd(20, '░');
  const flag = r.gatePass ? '  ' : '⛔';
  console.log(`${String(rank).padStart(2)}. ${flag} ${r.name}  [${r.market}]`);
  console.log(`     ${bar} ${r.weighted}/${MAX_SCORE} (${r.pct}%)`);
  console.log(`     ${DIMENSIONS.map((d) => `${SHORT[d]}:${r.dims[d]}`).join('  ')}`);
  if (!r.gatePass) console.log(`     ⛔ 게이트 탈락: ${r.gateReasons.join(' / ')}`);
  console.log('');
}

const passing = ranked.filter((r) => r.gatePass);
const top = passing[0];
console.log('────────────────────────────────────────────────────────────────');
if (top) {
  console.log(`✅ 추천 코어 니치(게이트 통과 최고점): "${top.name}" [${top.market}] — ${top.weighted}/${MAX_SCORE} (${top.pct}%)`);
} else {
  console.log('⚠️  게이트를 통과한 후보가 없습니다. 라이선스 재배포 가능·미점령 니치를 다시 발굴하세요.');
}
if (isSample) {
  console.log('ℹ️  지금은 SAMPLE 데이터입니다. niche-discovery 워크플로우 결과를 data/candidates.json 로 저장 후 다시 실행하세요.');
}
console.log('────────────────────────────────────────────────────────────────\n');

const out = join(dataDir, 'scored.json');
writeFileSync(out, JSON.stringify({ source: inputPath, max: MAX_SCORE, ranked }, null, 2), 'utf8');
console.log(`💾 결과 저장: ${out}\n`);
