#!/usr/bin/env node
// 데이터 파이프라인 오케스트레이터(§3-4): fetch → normalize → dedupe → crossvalidate → qualitygate.
// 산출: data/processed/<niche>.json (사이트 생성용), review-queue.json, sellable.json, stats.
// 사용: node pipeline.mjs --niche=sample
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fetchNiche } from './fetch.mjs';
import { normalizeAll } from './normalize.mjs';
import { dedupe } from './dedupe.mjs';
import { crossValidate } from './crossvalidate.mjs';
import { qualityGate } from './qualitygate.mjs';
import { toCSV } from './lib/csv.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'data', 'processed');

function arg(name, def) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : def;
}

const niche = arg('niche', 'sample');

function bar(label) { console.log(`\n▶ ${label}`); }

(async () => {
  console.log('\n══════════════════════════════════════════════');
  console.log(`  CivicNiche 데이터 파이프라인 — niche="${niche}"`);
  console.log('══════════════════════════════════════════════');

  bar('A. 수집(fetch)');
  const raw = await fetchNiche(niche);
  console.log(`  raw 레코드: ${raw.length} (소스 스냅샷 캐싱됨)`);

  bar('B. 정규화(normalize) + 경계 LLM');
  const norm = await normalizeAll(raw);
  console.log(`  정규화: ${norm.records.length}  | LLM 콜 ${norm.llmCalls} ${norm.mocked ? '(mock)' : ''} | 비용 $${norm.llmCostUSD.toFixed(4)}`);

  bar('중복제거(dedupe)');
  const dd = dedupe(norm.records);
  console.log(`  ${dd.before} → ${dd.after}  (병합 클러스터 ${dd.mergedClusters}개)`);

  bar('H2. 교차검증(cross-validate)');
  const cv = crossValidate(dd.records);
  console.log(`  교차검증 통과 ${cv.crossValidated} | 불일치(stale) ${cv.conflicts} | 단일출처 ${cv.singleSource}`);

  bar('C. 품질 게이트(quality-gate) + 법무 게이트');
  const qg = qualityGate(cv.records);
  console.log(`  색인가능 ${qg.stats.indexable} | noindex ${qg.stats.noindex} | 판매가능 ${qg.stats.sellable} | needs_review ${qg.stats.needsReview}`);

  // --- 산출물 저장 ---
  mkdirSync(outDir, { recursive: true });
  const processed = qg.records;
  const indexable = processed.filter((r) => !r.flags.noindex);
  const reviewQueue = processed.filter((r) => r.status === 'needs_review');
  const sellable = processed.filter((r) => r.flags.sellable);

  writeFileSync(join(outDir, `${niche}.json`), JSON.stringify(processed, null, 2), 'utf8');
  writeFileSync(join(__dirname, 'data', 'review-queue.json'), JSON.stringify(reviewQueue, null, 2), 'utf8');
  writeFileSync(join(outDir, `${niche}.sellable.json`), JSON.stringify(sellable, null, 2), 'utf8');
  // 데이터 셀프판매 상품 자동생성(영업 0): 판매가능분 + 색인분 CSV
  writeFileSync(join(outDir, `${niche}.sellable.csv`), toCSV(sellable), 'utf8');
  writeFileSync(join(outDir, `${niche}.csv`), toCSV(indexable), 'utf8');

  const stats = {
    niche, raw: raw.length, normalized: norm.records.length,
    deduped: dd.after, mergedClusters: dd.mergedClusters,
    crossValidated: cv.crossValidated, conflicts: cv.conflicts, singleSource: cv.singleSource,
    ...qg.stats, llmCalls: norm.llmCalls, llmCostUSD: norm.llmCostUSD, mocked: norm.mocked,
  };
  writeFileSync(join(outDir, `${niche}.stats.json`), JSON.stringify(stats, null, 2), 'utf8');

  console.log('\n──────────────────────────────────────────────');
  console.log(`✅ 완료. 색인대상 ${indexable.length}p · needs_review ${reviewQueue.length} · 판매가능 ${sellable.length}`);
  console.log(`   → data/processed/${niche}.json (사이트 생성 입력)`);
  console.log(`   → data/review-queue.json (사람 승인 큐, §4.1)`);
  console.log(`   → data/processed/${niche}.sellable.json/.csv (직판 상품 자동생성, §7 통과분)`);
  if (norm.mocked) console.log('ℹ️  LLM mock 모드(키 없음). 실제 정규화 품질·비용은 키 설정 후 확정.');
  console.log('──────────────────────────────────────────────\n');
})().catch((e) => { console.error('❌ 파이프라인 실패:', e.message); process.exit(1); });
