#!/usr/bin/env node
// 캐시 재처리: 이미 수집된 raw 스냅샷(data/cache/<niche>.raw.json)을 다시 fetch 하지 않고
// normalize→dedupe→crossvalidate→qualitygate 만 재실행한다(로직 수정 후 API 호출 없이 산출물 갱신).
// 사용: node rebuild-from-cache.mjs --niche=fda-device-mfg
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { normalizeAll } from './normalize.mjs';
import { dedupe } from './dedupe.mjs';
import { crossValidate } from './crossvalidate.mjs';
import { qualityGate } from './qualitygate.mjs';
import { toCSV } from './lib/csv.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split('=')[1];
const niche = arg('niche', 'fda-device-mfg');
const cacheFile = join(__dirname, 'data', 'cache', `${niche}.raw.json`);
const outDir = join(__dirname, 'data', 'processed');

const raw = JSON.parse(readFileSync(cacheFile, 'utf8'));
console.log(`캐시 재처리 niche="${niche}" raw=${raw.length}`);
const norm = await normalizeAll(raw);
const dd = dedupe(norm.records);
const cv = crossValidate(dd.records);
const qg = qualityGate(cv.records);

mkdirSync(outDir, { recursive: true });
const processed = qg.records;
const indexable = processed.filter((r) => !r.flags.noindex);
const sellable = processed.filter((r) => r.flags.sellable);
writeFileSync(join(outDir, `${niche}.json`), JSON.stringify(processed, null, 2));
writeFileSync(join(outDir, `${niche}.sellable.json`), JSON.stringify(sellable, null, 2));
writeFileSync(join(outDir, `${niche}.sellable.csv`), toCSV(sellable));
writeFileSync(join(outDir, `${niche}.csv`), toCSV(indexable));
const stats = { niche, raw: raw.length, normalized: norm.records.length, deduped: dd.after,
  mergedClusters: dd.mergedClusters, ...qg.stats, llmCalls: norm.llmCalls, mocked: norm.mocked };
writeFileSync(join(outDir, `${niche}.stats.json`), JSON.stringify(stats, null, 2));
console.log(`✅ deduped ${dd.after} · sellable ${sellable.length} · indexable ${indexable.length}`);
