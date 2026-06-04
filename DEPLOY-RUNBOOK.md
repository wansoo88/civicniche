# 배포 런북 — Phase 1: 인덱싱 클락 켜기 (패시브, ≈30분)

> **목적:** 이미 빌드된 큐레이션 사이트(상위 500p)를 띄워 **구글/빙 색인 시계를 시작**한다.
> 이게 (A)디렉터리 + (B)데이터판매 신뢰성 둘 다를 게이팅하는 가장 근본 가정(= 스케일 콘텐츠가 인덱싱되는가)을 **가장 싸게** 테스트한다.
> 능동 노동은 여기까지(배포+등록). 이후 4~8주는 그냥 둔다. 판정 기준은 [`LEARNING-GATES.md`](./LEARNING-GATES.md).

## 0. 전제
- 이 시점 빌드 산출물은 `packages/site/dist/` (501 페이지: 큐레이션 500 + 홈, sitemap·robots 포함).
- **도메인 없어도 시작 가능** — Cloudflare Pages 무료 서브도메인 `*.pages.dev`로 즉시 색인 테스트. 커스텀 도메인은 나중에 붙여도 됨(SEO상 더 좋지만 클락 시작엔 불필요).
- 대화형 로그인(`wrangler login`)은 제가 대신 못 합니다 → 이 세션에서 `! npx wrangler login` 처럼 `!` 접두로 직접 실행하세요.

## 1. 실도메인/URL로 재빌드
`SITE_URL`이 canonical·sitemap·robots에 절대경로로 박힌다. pages.dev면 배포 후 받는 주소로, 커스텀 도메인이면 그 주소로.
```bash
# civicniche/ 에서. 처음엔 임시로 pages.dev 예상주소를 넣고, 배포 후 실제 주소로 1회 재빌드해도 됨.
SITE_URL="https://civicniche.pages.dev" \
NICHE="fda-device-mfg" \
NICHE_TITLE="FDA Medical Device Contract Manufacturers" \
SITE_MAX_RECORDS=500 \
npm --prefix packages/site run build
```
- `SITE_MAX_RECORDS`로 색인 페이지 수 조절(기본 500). **스케일 콘텐츠 방어상 초기엔 300~500 권장**(65k 전건 발행 금지 — 그건 상품으로만 판다).

## 2. Cloudflare Pages 배포 (무료)
```bash
! npx wrangler login                       # 대화형 OAuth (당신 계정) — 최초 1회
npx wrangler pages deploy packages/site/dist --project-name=civicniche
# 최초 실행 시 프로젝트 생성 프롬프트 → 배포되면 https://civicniche.pages.dev 발급
```
- 토큰 방식 선호 시: `CLOUDFLARE_API_TOKEN`(Pages:Edit 권한) 환경변수 설정 후 deploy(로그인 생략).
- 배포 후 실제 주소가 1단계 `SITE_URL`과 다르면 → `SITE_URL` 그 주소로 1회 재빌드 후 재배포(canonical/sitemap 정합).

## 3. 구글 Search Console 등록 (색인 테스트의 본체)
1. https://search.google.com/search-console → 속성 추가.
   - **pages.dev**: DNS 인증 불가 → **URL 접두어** 속성 + **HTML 파일** 인증. 받은 `googXXXX.html`을 `packages/site/public/`에 넣고 재빌드·재배포 → "확인".
   - **커스텀 도메인**: 도메인 속성 + DNS TXT 인증(가장 깔끔).
2. **Sitemaps** 메뉴 → `sitemap.xml` 제출.
3. 1~2일 후 **페이지(색인 생성)** 리포트에서 "크롤됨/색인됨" 추이 관찰 시작.

## 4. 빙 웹마스터 (보너스 채널)
- https://www.bing.com/webmasters → 사이트 추가 → **GSC에서 가져오기**(원클릭) 또는 sitemap 직접 제출.

## 5. (선택) IndexNow — 빙·얀덱스 즉시 색인 (구글은 미사용)
```bash
# 8~128 hex 키 생성 → 키파일을 public 루트에 배치 → 빌드·배포
KEY=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
echo "$KEY" > packages/site/public/$KEY.txt
SITE_URL="https://civicniche.pages.dev" NICHE=fda-device-mfg NICHE_TITLE="FDA Medical Device Contract Manufacturers" npm --prefix packages/site run build
npx wrangler pages deploy packages/site/dist --project-name=civicniche
SITE_URL="https://civicniche.pages.dev" INDEXNOW_KEY="$KEY" node scripts/indexnow-submit.mjs
```
- `INDEXNOW_KEY`는 GitHub Actions 시크릿에도 넣으면 크론이 자동 핑(`.github/workflows/pipeline.yml` 이미 배선).

## 6. 무인 운영 자동화(이미 배선됨 — 시크릿만)
`.github/workflows/pipeline.yml`이 매일 fetch→정제→diff시 빌드→IndexNow 핑. 활성화하려면 레포 Settings>Secrets:
- `SITE_URL`, `INDEXNOW_KEY`, (선택) `ANTHROPIC_API_KEY`, `PUBLIC_*`.
- Cloudflare 자동배포 원하면 워크플로 73~80행 주석 해제 + `CF_API_TOKEN`·`CF_ACCOUNT_ID` 시크릿.
- ⚠️ **공개 레포 권장**(Actions 무제한). Pages 월 500빌드 한도는 build-trigger가 diff 게이트로 관리.

## 7. 끝나면
- 능동 작업 종료. **4~8주 관찰**만 → [`LEARNING-GATES.md`](./LEARNING-GATES.md) Gate I.
- 병행으로 [`packages/prevalidation/13a-data-demand/OUTREACH-KIT.md`](./packages/prevalidation/13a-data-demand/OUTREACH-KIT.md) 실행(13-A 수요검증).

## 정직한 한계
- 구글 색인은 **며칠~수주** 걸리고, 신생 도메인은 더 느리다. pages.dev는 시작엔 OK이나 장기 SEO엔 커스텀 도메인이 낫다.
- **색인됨 ≠ 랭킹됨.** 이 단계는 "색인 자체가 되는가"(디인덱싱 회피)만 테스트한다. 랭킹·트래픽은 그 다음 문제.
