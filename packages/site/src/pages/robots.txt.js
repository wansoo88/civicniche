// 동적 robots.txt — SITE_URL이 sitemap 절대경로에 반영되도록.
// (정적 public/robots.txt는 빌드 시 example.com 고정이라 색인에 잘못된 sitemap을 알리는 버그가 있었음)
export function GET({ site }) {
  const base = (site?.href || 'https://example.com/').replace(/\/$/, '');
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    '# noindex 페이지는 메타 태그로 제어(§5). sitemap은 색인 대상만 포함.',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}
