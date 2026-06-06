// TEST-CASES.md 자동 실행 — Playwright(헤드리스 Chromium)로 실제 브라우저 동작 검증.
// 대상: 라이브 https://data.utilverse.info (BASE 환경변수로 변경 가능)
// 실행: node run.mjs   (사전: npm i playwright && npx playwright install chromium)
// 데이터 리셋은 호출 측(Bash/ssh)에서 전/후로 수행 — 이 스크립트는 /count 증분으로 검증.

import { chromium } from 'playwright';

const BASE = process.env.BASE || 'https://data.utilverse.info';
let pass = 0, fail = 0;
const results = [];
const chk = (name, cond, detail = '') => {
  if (cond) { pass++; results.push(`  ✅ ${name}`); }
  else { fail++; results.push(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); }
};

// node 내장 fetch 사용(이 환경에서 Playwright 자체 요청 컨텍스트는 DNS가 막혀 ENOTFOUND → node는 정상 해석).
const count = async () => (await fetch(BASE + '/count')).json();

// 이 환경의 크로미움 내장 DNS가 막혀 ERR_NAME_NOT_RESOLVED 발생 → 호스트를 IP로 직접 매핑(DNS 우회).
// SNI/인증서는 여전히 호스트명으로 검증됨. RESOLVE_IP 로 다른 호스트/IP 지정 가능.
const HOST = new URL(BASE).hostname;
const RESOLVE_IP = process.env.RESOLVE_IP || '115.68.230.40';
const browser = await chromium.launch({
  args: ['--no-sandbox', `--host-resolver-rules=MAP ${HOST} ${RESOLVE_IP}`],
});
try {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // ---- A. 로드 & 표시 ----
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const bodyText = await page.textContent('body');
  chk('A1 영문 제목 표시', bodyText.includes('contract manufacturers') && bodyText.includes('deduplicated'));
  chk('A1 한국어 링크 존재', (await page.locator('a', { hasText: '한국어' }).count()) === 1);
  chk('A1 배지 표시', bodyText.includes('Pre-launch'));
  chk('A1 가격 표시', bodyText.includes('$29') && bodyText.includes('$49') && bodyText.includes('$99'));
  chk('A1 CSV 미리보기', bodyText.includes('reg_no'));
  chk('A1 내부용어(§13-A/§7-b) 누수 없음', !bodyText.includes('§13-A') && !bodyText.includes('§7-b'));
  chk('A2 HTTPS 로 로드됨', page.url().startsWith('https://'));

  // ---- A4. 모바일 반응형(가로 오버플로 없음) ----
  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  chk('A4 모바일 가로 오버플로 없음', overflow <= 2, `overflow=${overflow}px`);
  await page.setViewportSize({ width: 1024, height: 800 });

  // ---- B1. 샘플 제출(해피패스) ----
  const c0 = await count();
  await page.fill('input[name=email]', 'qa-pw-sample@example.com');
  await page.selectOption('select[name=persona]', { label: 'Sourcing / supplier discovery' });
  await page.fill('textarea[name=need]', 'KWQ contract manufacturers with 510(k)');
  await page.selectOption('select[name=willingness]', '49');
  await page.click('button[data-intent=sample]');
  await page.waitForSelector('#ok', { state: 'visible', timeout: 5000 }).catch(() => {});
  chk('B1 성공 메시지 표시', await page.locator('#ok').isVisible());
  chk('B1 에러 메시지 숨김', !(await page.locator('#err').isVisible()));
  const c1 = await count();
  chk('B1 /count sample +1 반영', (c1.byIntent.sample || 0) === (c0.byIntent.sample || 0) + 1);
  chk('B1 입력칸 초기화(reset)', (await page.inputValue('input[name=email]')) === '');

  // ---- B2. 사전구매 의향 → pass:true ----
  await page.fill('input[name=email]', 'qa-pw-presale@example.com');
  await page.click('button[data-intent=presale]');
  await page.waitForSelector('#ok', { state: 'visible', timeout: 5000 }).catch(() => {});
  const c2 = await count();
  chk('B2 presale 반영', (c2.byIntent.presale || 0) >= 1);
  chk('B2 pass=true(통과기준 충족)', c2.pass === true);

  // ---- C1. 이메일 누락 → 브라우저 검증이 막음(제출 안 됨) ----
  // 새로 로드해 직전 제출의 #ok 잔상을 제거(빈 상태에서 검증).
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const cBeforeC1 = (await count()).total;
  await page.click('button[data-intent=sample]');
  await page.waitForTimeout(500);
  const emailValid = await page.locator('input[name=email]').evaluate((el) => el.checkValidity());
  chk('C1 빈 이메일 → 브라우저 검증 실패(invalid)', emailValid === false);
  chk('C1 성공표시 안 뜸', !(await page.locator('#ok').isVisible()));
  chk('C1 저장 안 됨', (await count()).total === cBeforeC1);

  // ---- C3. 중복 제출(같은 이메일+상품) → 카운트 불변 ----
  const cBeforeDup = (await count()).total;
  await page.fill('input[name=email]', 'qa-pw-sample@example.com'); // B1과 동일
  await page.click('button[data-intent=sample]');
  await page.waitForSelector('#ok', { state: 'visible', timeout: 5000 }).catch(() => {});
  chk('C3 중복은 total 불변', (await count()).total === cBeforeDup);

  // ---- D1. ★오프라인 제출 → 성공표시 금지, 에러표시, 미저장 (버그#1 수정 검증) ----
  const cBeforeOffline = (await count()).total;
  await ctx.setOffline(true);
  await page.fill('input[name=email]', 'qa-pw-offline@example.com');
  await page.click('button[data-intent=sample]');
  await page.waitForSelector('#err', { state: 'visible', timeout: 5000 }).catch(() => {});
  chk('D1 오프라인 시 에러 메시지 표시', await page.locator('#err').isVisible());
  chk('D1 오프라인 시 성공표시 안 뜸(수정 확인)', !(await page.locator('#ok').isVisible()));
  await ctx.setOffline(false);
  await page.waitForTimeout(300);
  chk('D1 오프라인 신호 미저장', (await count()).total === cBeforeOffline);

  // ---- A3. 언어 전환 ----
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.click('a:has-text("한국어")');
  await page.waitForLoadState('networkidle');
  chk('A3 /ko/ 로 이동', page.url().includes('/ko'));
  const koText = await page.textContent('body');
  chk('A3 한국어 카피 표시', koText.includes('계약제조사') && koText.includes('규제·인증 데이터셋'));
  chk('A3 English 복귀 링크', (await page.locator('a', { hasText: 'English' }).count()) >= 1);

  // ---- B3. 한국어 폼 제출도 같은 컬렉터로 수집 ----
  const cBeforeKo = (await count()).total;
  await page.fill('input[name=email]', 'qa-pw-ko@example.com');
  await page.click('button[data-intent=sample]');
  await page.waitForSelector('#ok', { state: 'visible', timeout: 5000 }).catch(() => {});
  chk('B3 한국어 제출 +1 반영', (await count()).total === cBeforeKo + 1);

  // ---- E1. /export 토큰 없이 차단 ----
  const exp = await fetch(BASE + '/export');
  chk('E1 /export 토큰없음 → 401', exp.status === 401);

} finally {
  await browser.close();
}

console.log('\n' + results.join('\n'));
console.log(`\n============ 브라우저 자동테스트: ✅ ${pass} / ❌ ${fail} ============`);
process.exit(fail ? 1 : 0);
