#!/usr/bin/env node
// §13-B 선검증: LLM 반복비 실측·추정.
// 파이프라인의 반복 LLM 비용 3종(경계 정규화 / 중복 경계분류 / 스키마 드리프트 재생성)을
// 샘플로 돌려 토큰·비용을 측정하고, 가정 볼륨으로 월비용을 외삽해 예산 캡과 비교한다.
//
// API 키 없으면 mock(비용 0)으로 토큰만 측정하되, 가격표로 '예상 청구'를 함께 보여줘 방법론을 검증.
// 사용: node measure.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { callLLM, estimateCostUSD, priceFor } from '../../shared/llm.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
const budget = Number(process.env.LLM_MONTHLY_BUDGET_USD || 30);

// --- 운영 가정(보정 가능). 실제 니치 규모로 바꿔 외삽 정확도를 높이세요. ---
const ASSUMPTIONS = {
  totalRecords: 3000,        // 코어 니치 총 레코드
  monthlyChangedPct: 0.05,   // 월 변경/신규 비율(증분 임베딩·정규화 대상)
  boundaryRate: 0.30,        // 변경분 중 규칙으로 못 거른 경계 비율(LLM 필요)
  dedupeBoundaryRate: 0.10,  // 중복 경계분류 LLM 필요 비율
  schemaDriftPerMonth: 0.5,  // 월 평균 스키마 드리프트(파서 재생성) 횟수
};

const { records } = JSON.parse(readFileSync(join(__dirname, 'sample-records.json'), 'utf8'));
const boundarySamples = records.filter((r) => r.boundary);

const NORMALIZE_SYS = '너는 데이터 정규화기다. 입력을 {name,region,services,hours,license_no,is_target} JSON으로 정규화하라. 모르면 null. JSON만 출력.';

async function measureOp(label, items, buildPrompt, maxTokens) {
  let inTok = 0, outTok = 0, cost = 0, mocked = false, n = 0;
  for (const it of items) {
    const r = await callLLM({ system: NORMALIZE_SYS, prompt: buildPrompt(it), maxTokens });
    inTok += r.usage.inputTokens;
    outTok += r.usage.outputTokens;
    cost += r.costUSD;
    mocked = mocked || r.mocked;
    n += 1;
  }
  const perCall = n ? { in: inTok / n, out: outTok / n } : { in: 0, out: 0 };
  return { label, n, inTok, outTok, cost, mocked, perCall };
}

console.log('\n════════════════════════════════════════════════════════════');
console.log('  §13-B  LLM 반복비 선검증');
console.log(`  모델 ${model} · 가격[추정] in $${priceFor(model).in}/MTok out $${priceFor(model).out}/MTok`);
console.log('════════════════════════════════════════════════════════════\n');

// 1) 경계 정규화
const opNorm = await measureOp('경계 정규화', boundarySamples, (r) => `정규화 대상:\n${r.raw}`, 300);
// 2) 중복 경계분류 (두 레코드가 동일 엔티티인지 LLM 판정)
const pairs = [];
for (let i = 0; i + 1 < boundarySamples.length; i += 2) pairs.push([boundarySamples[i], boundarySamples[i + 1]]);
const opDedupe = await measureOp('중복 경계분류', pairs, (p) => `A:${p[0].raw}\nB:${p[1].raw}\n둘은 같은 시설인가? yes/no+이유 1줄`, 120);
// 3) 스키마 드리프트 파서 재생성 (1회, 긴 출력)
const opDrift = await measureOp('스키마 드리프트 파서재생성', [{ raw: 'NEW_SCHEMA_EXAMPLE' }],
  () => '소스 응답 포맷이 바뀌었다. 아래 새 샘플에 맞는 파서 규칙(JSON 매핑)을 생성하라:\n{ "biz_nm":"...", "addr_road":"...", "oper_hr":"..." }', 800);

const measured = [opNorm, opDedupe, opDrift];
const mocked = measured.some((m) => m.mocked);

console.log(`측정 모드: ${mocked ? '🟡 MOCK (실제 키 없음 → 토큰 기반 예상 청구로 추정)' : '🟢 실제 API 청구'}\n`);
for (const m of measured) {
  console.log(`• ${m.label}: ${m.n}건  in≈${m.inTok} out≈${m.outTok} tok  콜당 in${Math.round(m.perCall.in)}/out${Math.round(m.perCall.out)}`);
}

// --- 월 비용 외삽 ---
const A = ASSUMPTIONS;
const changed = A.totalRecords * A.monthlyChangedPct;
const monthlyNormCalls = changed * A.boundaryRate;
const monthlyDedupeCalls = changed * A.dedupeBoundaryRate;
const monthlyDriftCalls = A.schemaDriftPerMonth;

function projOp(op, monthlyCalls) {
  if (!op.n) return 0;
  const inPer = op.perCall.in, outPer = op.perCall.out;
  return estimateCostUSD({ inputTokens: inPer * monthlyCalls, outputTokens: outPer * monthlyCalls, model });
}

const projNorm = projOp(opNorm, monthlyNormCalls);
const projDedupe = projOp(opDedupe, monthlyDedupeCalls);
const projDrift = projOp(opDrift, monthlyDriftCalls);
const projTotal = projNorm + projDedupe + projDrift;

console.log('\n── 월 반복비 외삽 (가정: ' +
  `레코드 ${A.totalRecords}, 월변경 ${A.monthlyChangedPct * 100}%, 경계 ${A.boundaryRate * 100}%) ──`);
console.log(`  경계 정규화:        ~${monthlyNormCalls.toFixed(0)}콜  → $${projNorm.toFixed(3)}/월`);
console.log(`  중복 경계분류:      ~${monthlyDedupeCalls.toFixed(0)}콜  → $${projDedupe.toFixed(3)}/월`);
console.log(`  스키마 드리프트:    ~${monthlyDriftCalls}회   → $${projDrift.toFixed(3)}/월`);
console.log(`  ──────────────────────────────`);
console.log(`  합계[추정]:         $${projTotal.toFixed(2)}/월   (예산 캡 $${budget})`);

const verdict = projTotal <= budget;
console.log('\n────────────────────────────────────────────────────────────');
if (verdict) {
  console.log(`✅ PASS: 추정 반복비 $${projTotal.toFixed(2)}/월 ≤ 예산 $${budget}. §3.2 산식(반복 $5~25/월[추정]) 범위 부합 여부 확인.`);
} else {
  console.log(`⚠️  ADJUST: 추정 반복비 $${projTotal.toFixed(2)}/월 > 예산 $${budget}. 규칙 통과율↑·소스 단순화·니치 교체 검토(§13-결정).`);
}
if (mocked) {
  console.log('ℹ️  지금은 MOCK 추정입니다. ANTHROPIC_API_KEY 설정 후 실제 청구로 확정하세요(§0 [추정]→[검증]).');
}
console.log('────────────────────────────────────────────────────────────\n');
