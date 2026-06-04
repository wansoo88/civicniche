#!/usr/bin/env node
// 13-A 영업용 '티저 샘플' 생성: 판매 상품(sellable.csv)에서 균등 샘플 N행을 추출해
// 잠재 구매자에게 맛보기로 제시한다(전건은 구매 시 제공). 데이터가 갱신되면 다시 돌리면 됨.
// 사용: node scripts/make-teaser.mjs   (TEASER_N=25, NICHE=fda-device-mfg 기본)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const NICHE = process.env.NICHE || 'fda-device-mfg';
const N = Number(process.env.TEASER_N || 25);
const src = join(__dirname, '..', 'packages', 'data-pipeline', 'data', 'processed', `${NICHE}.sellable.csv`);
const out = join(__dirname, '..', 'packages', 'prevalidation', '13a-data-demand', `sample-${NICHE}-teaser.csv`);

const lines = readFileSync(src, 'utf8').split(/\r?\n/).filter(Boolean);
const [header, ...rows] = lines;
const step = Math.max(1, Math.floor(rows.length / N));
const picked = [];
for (let i = 0; i < rows.length && picked.length < N; i += step) picked.push(rows[i]);

writeFileSync(out, [header, ...picked].join('\n') + '\n', 'utf8');
console.log(`✅ 티저 ${picked.length}행 → ${out}\n   (전체 ${rows.length}행 중 균등 샘플. 전건은 구매 시 제공)`);
