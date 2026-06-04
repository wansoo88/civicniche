import { defineConfig } from 'astro/config';

// §3 정적 생성. 사이트맵은 외부 통합 대신 자체 엔드포인트(src/pages/sitemap.xml.js)로 생성
// — 의존성 리스크 제거 + noindex 페이지 제외를 직접 제어(§5).
export default defineConfig({
  site: process.env.SITE_URL || 'https://example.com',
  build: { format: 'directory' },
});
