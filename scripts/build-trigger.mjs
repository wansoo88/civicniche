#!/usr/bin/env node
// §3.1 빌드 트리거 게이트: Cloudflare Pages 월 500빌드 한도 보호.
// "데이터 diff가 있을 때만 · 니치별 · 야간 묶음" 으로 빌드를 억제한다.
// CI에서 빌드 단계 앞에 두어 exit 0(빌드 진행) / exit 78(스킵)으로 분기.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const stateDir = join(__dirname, '..', '.build-state');

function arg(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : def;
}
const niche = arg('niche', 'sample');
const force = process.argv.includes('--force');

const processedPath = join(__dirname, '..', 'packages', 'data-pipeline', 'data', 'processed', `${niche}.json`);
if (!existsSync(processedPath)) {
  console.error(`처리 데이터 없음(${processedPath}) → 빌드 스킵`);
  process.exit(78);
}

const hash = createHash('sha256').update(readFileSync(processedPath)).digest('hex').slice(0, 16);
mkdirSync(stateDir, { recursive: true });
const statePath = join(stateDir, `${niche}.hash`);
const prev = existsSync(statePath) ? readFileSync(statePath, 'utf8').trim() : '';

if (!force && hash === prev) {
  console.log(`⏭  niche="${niche}" 데이터 변경 없음(${hash}) → 빌드 스킵(한도 절약)`);
  process.exit(78);
}

writeFileSync(statePath, hash, 'utf8');
console.log(`✅ niche="${niche}" 데이터 변경 감지(${prev || 'none'} → ${hash}) → 빌드 진행`);
process.exit(0);
