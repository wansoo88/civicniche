// 자체 사이트맵(§4-E). 색인 대상(noindex 아님)만 포함 — loadRecords가 이미 필터링.
import { loadRecords } from '../lib/data.mjs';

export function GET({ site }) {
  const base = (site?.href || 'https://example.com/').replace(/\/$/, '');
  const records = loadRecords();
  const urls = [
    `${base}/`,
    ...records.map((r) => `${base}/place/${encodeURIComponent(r.id)}/`),
  ];
  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
    '\n</urlset>\n';
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
