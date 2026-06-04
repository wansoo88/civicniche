#!/usr/bin/env node
// CivicNiche 부트스트랩: 환경 점검 → .env 생성 → 니치 스코어링 → 선검증(13-B) → 파이프라인(sample)
// → 상태 대시보드 + §13 게이트 체크리스트 + 다음 단계 안내.
// 사용: node scripts/init.mjs [--with-site] [--niche=sample]
import { execFileSync } from 'node:child_process';
import { existsSync, copyFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const withSite = process.argv.includes('--with-site');
const nicheArg = (process.argv.find((a) => a.startsWith('--niche=')) || '--niche=sample').split('=')[1];

const C = { g: '\x1b[32m', y: '\x1b[33m', r: '\x1b[31m', b: '\x1b[1m', d: '\x1b[2m', x: '\x1b[0m' };
const ok = (m) => console.log(`${C.g}✓${C.x} ${m}`);
const warn = (m) => console.log(`${C.y}⚠${C.x}  ${m}`);
const step = (n, m) => console.log(`\n${C.b}[${n}] ${m}${C.x}`);

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { cwd: root, stdio: 'inherit', ...opts });
}
function runQuiet(cmd, args) {
  try { return execFileSync(cmd, args, { cwd: root, encoding: 'utf8' }); }
  catch (e) { return (e.stdout || '') + (e.stderr || ''); }
}

console.log(`${C.b}\n══════════════════════════════════════════════`);
console.log(`  CivicNiche init — 부트스트랩 & 상태 점검`);
console.log(`══════════════════════════════════════════════${C.x}`);

// [0] 환경
step(0, '환경 점검');
const major = Number(process.versions.node.split('.')[0]);
if (major >= 18) ok(`Node ${process.versions.node}`);
else { console.error(`${C.r}✗ Node 18+ 필요 (현재 ${process.versions.node})${C.x}`); process.exit(1); }

// [1] .env
step(1, '.env 설정');
const envPath = join(root, '.env');
if (existsSync(envPath)) ok('.env 존재');
else if (existsSync(join(root, '.env.example'))) { copyFileSync(join(root, '.env.example'), envPath); ok('.env.example → .env 생성 (키 채우면 mock→실호출 전환)'); }
else warn('.env.example 없음 — 건너뜀');
const hasLLMKey = /ANTHROPIC_API_KEY=\S+/.test(existsSync(envPath) ? readFileSync(envPath, 'utf8') : '') || Boolean(process.env.ANTHROPIC_API_KEY);
hasLLMKey ? ok('ANTHROPIC_API_KEY 감지 → 실제 LLM 호출') : warn('ANTHROPIC_API_KEY 없음 → LLM mock 폴백(비용 0)');

// [2] 니치 스코어링
step(2, '니치 스코어링 (옵션2 · §4.4)');
run('node', ['packages/niche-scorer/score.mjs']);

// [3] 선검증 13-B
step(3, 'LLM 반복비 선검증 (옵션1 · §13-B)');
run('node', ['packages/prevalidation/13b-llm-cost/measure.mjs']);

// [4] 파이프라인
step(4, `데이터 파이프라인 (옵션3) — niche="${nicheArg}"`);
run('node', ['packages/data-pipeline/pipeline.mjs', `--niche=${nicheArg}`]);

// [5] 사이트(옵션)
step(5, 'Astro 사이트');
if (withSite) {
  warn('npm install 실행(네트워크 필요)…');
  try { run('npm', ['--prefix', 'packages/site', 'install', '--no-audit', '--no-fund']); run('npm', ['--prefix', 'packages/site', 'run', 'build']); ok('사이트 빌드 완료 → packages/site/dist'); }
  catch { warn('사이트 설치/빌드 실패 — 네트워크 확인 후 `npm --prefix packages/site install && npm --prefix packages/site run build`'); }
} else {
  console.log(`${C.d}건너뜀(--with-site 로 활성화). 수동: cd packages/site && npm install && npm run build${C.x}`);
}

// 상태 요약
let stats = {};
const statsPath = join(root, 'packages/data-pipeline/data/processed', `${nicheArg}.stats.json`);
if (existsSync(statsPath)) stats = JSON.parse(readFileSync(statsPath, 'utf8'));

console.log(`${C.b}\n──────────────────────────────────────────────`);
console.log(`  상태 대시보드`);
console.log(`──────────────────────────────────────────────${C.x}`);
console.log(`  파이프라인: raw ${stats.raw ?? '-'} → 색인 ${stats.indexable ?? '-'} · 판매 ${stats.sellable ?? '-'} · 리뷰큐 ${stats.needsReview ?? '-'}`);
console.log(`  LLM: ${stats.mocked ? 'mock(비용0)' : `$${(stats.llmCostUSD ?? 0).toFixed(4)}`}`);

console.log(`${C.b}\n  §13 착수 게이트 체크리스트${C.x}`);
console.log(`  [ ] 13-A 데이터 직판 수요: packages/prevalidation/13a-data-demand/index.html 배포 → 의향 5+ / 결제 1+`);
console.log(`  [${stats.mocked ? ' ' : 'x'}] 13-B LLM 반복비: 위 측정값이 예산 캡 이내인지 (키 설정 후 실측 권장)`);
console.log(`  → 둘 다 GO 여야 코어 니치 풀빌드 착수 (§13-결정)`);

console.log(`${C.b}\n  다음 단계${C.x}`);
console.log(`  1) niche-discovery 워크플로우 결과를 packages/niche-scorer/data/candidates.json 로 저장 후 npm run score`);
console.log(`  2) 코어 니치 확정 → fetch.mjs NICHE_SOURCES + licensegate LICENSES 등록 (§3.3)`);
console.log(`  3) 13-A 랜딩 배포해 수요 신호 수집`);
console.log(`  4) Cloudflare Pages + GitHub Actions(.github/workflows/pipeline.yml) 연결\n`);
console.log(`${C.d}전략 전문: ../EXECUTION-PLAN.md · 운영 가이드: /civicniche 스킬${C.x}\n`);
