#!/usr/bin/env node
// §4-E IndexNow 제출: 빌드된 sitemap의 URL 목록을 IndexNow에 일괄 POST(빙·얀덱스 즉시 색인 유도).
// ⚠️ 구글은 IndexNow를 쓰지 않는다 — 구글 색인은 Search Console sitemap 제출 + 오가닉 크롤에 의존(DEPLOY-RUNBOOK.md).
// 사용: SITE_URL=https://yourdomain.com INDEXNOW_KEY=<8~128 hex> node scripts/indexnow-submit.mjs
// 전제: public/<INDEXNOW_KEY>.txt (내용=키) 가 배포돼 있어야 IndexNow가 소유권을 확인한다.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');
const KEY = process.env.INDEXNOW_KEY || '';
if (!SITE_URL || !KEY) {
  console.error('❌ SITE_URL·INDEXNOW_KEY 환경변수가 필요합니다.');
  process.exit(1);
}
const host = new URL(SITE_URL).host;

const __dirname = dirname(fileURLToPath(import.meta.url));
const sitemapPath = join(__dirname, '..', 'packages', 'site', 'dist', 'sitemap.xml');
let urlList = [`${SITE_URL}/`];
if (existsSync(sitemapPath)) {
  const xml = readFileSync(sitemapPath, 'utf8');
  const found = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (found.length) urlList = found;
} else {
  console.warn('⚠️  dist/sitemap.xml 없음 → 홈 URL만 제출. 먼저 site:build 하세요.');
}

const body = { host, key: KEY, keyLocation: `${SITE_URL}/${KEY}.txt`, urlList: urlList.slice(0, 10000) };
try {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  console.log(`IndexNow 제출 ${body.urlList.length}건 → HTTP ${res.status} ${res.statusText}`);
  console.log('(200/202 = 접수. 구글은 별도 — Search Console에서 sitemap을 제출하세요.)');
} catch (e) {
  console.error('IndexNow 제출 실패:', e.message);
}
