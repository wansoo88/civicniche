# 13-A 데이터 직판 수요 검증 (배포 가능)

영업 0 프로필에서 **데이터 셀프판매가 핵심 수익원**이므로, 이 검증이 가장 중요합니다.
"이 데이터를 $29~99에 살 사람이 있나?"를 빌드 전에 확인합니다.

## 구성
- `index.html` — 정적 랜딩(상품 2종: FDA 계약제조사 / RRA KC인증). 어디든 배포 가능.
- `collector/` — Cloudflare Worker 수집기(무료·무인): 폼 제출을 KV에 저장, `/count`로 통과 확인.

## 배포 (5분, 무료)

**1) 수집기(Worker) 배포**
```bash
cd collector
npx wrangler kv namespace create SIGNALS      # 출력된 id를 wrangler.toml에 붙여넣기
npx wrangler deploy                            # → https://civicniche-13a-collector.<계정>.workers.dev
```

**2) 랜딩 배선**
`index.html`의 `COLLECTOR_URL`을 배포된 주소 + `/submit`으로 설정:
```js
const COLLECTOR_URL = "https://civicniche-13a-collector.<계정>.workers.dev/submit";
```

**3) 랜딩 배포** (정적 파일 — 택1)
- Cloudflare Pages: `npx wrangler pages deploy .`
- 또는 Netlify/Vercel/GitHub Pages에 `index.html` 업로드.

**4) 수요처에 가져가기** (사이트 트래픽에 의존 X, §7-b)
- 데이터 마켓플레이스 등록, 개발자/규제 커뮤니티 1회 공유, 콜드아웃리치 10~30건에 샘플 CSV 제시.

## 통과 확인
```bash
curl https://civicniche-13a-collector.<계정>.workers.dev/count
# → {"total":N,"byIntent":{...},"pass":true/false,"criterion":"sample>=5 OR presale>=1"}
```
`pass:true` → §13-B와 함께 GO → 본 빌드 착수. `pass:false` → 직판 비가동(G9), 수익이 트래픽 의존만 남아 취약 → 니치/상품 재검토.

> 데모: `COLLECTOR_URL` 비우면 제출이 브라우저 localStorage에 쌓입니다(콘솔 확인). 배포 전 UI 테스트용.
