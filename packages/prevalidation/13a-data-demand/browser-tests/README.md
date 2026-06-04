# 13-A 랜딩 브라우저 자동테스트

`TEST-CASES.md`의 케이스를 **헤드리스 Chromium(Playwright)**으로 자동 실행한다. 사람이 클릭할 필요 없음.

## 설치 (1회)
```bash
npm install
npx playwright install chromium
```

## 실행
```bash
node run.mjs
```
- 대상 URL은 기본 `https://data.utilverse.info`. 변경: `BASE=https://... node run.mjs`
- 종료코드 0 = 전부 통과, 1 = 실패 있음.

## 데이터 리셋 (중요)
테스트는 실제 `/submit`에 `qa-pw-*@example.com` 신호를 남긴다. 실검증 오염 방지를 위해 **전/후로 리셋** 필요:
```bash
ssh -i ~/.ssh/autobtc_iwinv root@115.68.230.40 \
  'rm -f /var/lib/civicniche/13a-signals.json*; systemctl restart civicniche-13a'
```
스크립트는 `/count` 증분으로 검증하므로 시작 시 0이 아니어도 동작하지만, 깨끗한 상태에서 돌리는 걸 권장.

## 환경 메모
- 이 환경의 Chromium 내장 DNS가 막혀 있어 `--host-resolver-rules=MAP <host> <ip>`로 우회한다(`RESOLVE_IP`로 IP 지정). SNI/인증서는 호스트명으로 정상 검증됨.
- Playwright 자체 요청 컨텍스트도 DNS가 막혀, `/count`·`/export` 확인은 node 내장 `fetch`를 쓴다.

## 커버 케이스 (26 assertions)
A 로드/표시·HTTPS·언어전환·모바일 / B 해피패스(sample·presale→pass·한국어) / C 검증·중복 / **D1 오프라인 시 성공표시 금지(버그#1 회귀)** / E `/export` 401.
