# site (옵션 3 · §3 Astro SSG)

파이프라인 산출(`data-pipeline/data/processed/<niche>.json`)을 읽어 정적 디렉터리 사이트를 생성.
**색인 대상(noindex 아님)만** 페이지화하고, 각 상세는 "한 페이지 = 한 고유 질의"(§5).

## 실행

```bash
# 먼저 파이프라인으로 데이터 생성
node ../data-pipeline/pipeline.mjs --niche=sample

# 설치 후 빌드(네트워크 필요)
npm install
npm run dev      # 로컬 미리보기
npm run build    # dist/ 정적 산출 → Cloudflare Pages 등에 배포
```

환경변수: `SITE_URL`(canonical/sitemap), `NICHE`(기본 sample), `NICHE_TITLE`.

## 포함 기능 (계획 매핑)

- 다축 인터랙티브 필터(지역·서비스·검색) + 현재목록 CSV 다운로드 — §5 AI Overviews 내성 완화책 + §7 직판 퍼널
- JSON-LD `LocalBusiness`(요약 수준) — §5/R12 노출↔흡수 트레이드오프 고려
- `@astrojs/sitemap` 자동 사이트맵, noindex 메타 — §4-E 인덱싱
- 상세페이지 출처·라이선스 표기, 정보 정정 폼, 면책고지 — §7 / R11
- 교차검증 배지(2출처 일치 시) — §4.2

## 배포(무료티어, §3.1)

Cloudflare Pages 권장. **월 500빌드 한도가 병목** → `scripts/build-trigger.mjs`로 diff 있을 때만·니치별·야간 묶음 빌드.
