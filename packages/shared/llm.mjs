// 공유 LLM 헬퍼: ANTHROPIC_API_KEY가 있으면 실제 호출, 없으면 결정적 mock(비용 0)으로 폴백.
// 파이프라인 정규화·경계분류(§4)와 반복비 선검증(§13-B)이 공통 사용.

const API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * 토큰 대략 추정(문자수/4 휴리스틱). 정확치 아님 — 실청구로 보정(§3.2).
 */
export function estTokens(str) {
  return Math.ceil((str || '').length / 4);
}

/**
 * 모델별 가격(USD per 1M tokens). [추정/확인필요] — 벤더 페이지로 재확인, 변동 가능.
 * 환경변수 LLM_PRICE_IN / LLM_PRICE_OUT 로 override 가능.
 */
export const PRICES = {
  'claude-haiku-4-5-20251001': { in: 1.0, out: 5.0 },
  'claude-sonnet-4-6': { in: 3.0, out: 15.0 },
  _default: { in: 1.0, out: 5.0 },
};

export function priceFor(model) {
  const envIn = Number(process.env.LLM_PRICE_IN);
  const envOut = Number(process.env.LLM_PRICE_OUT);
  const base = PRICES[model] || PRICES._default;
  return {
    in: Number.isFinite(envIn) ? envIn : base.in,
    out: Number.isFinite(envOut) ? envOut : base.out,
  };
}

export function estimateCostUSD({ inputTokens, outputTokens, model }) {
  const p = priceFor(model);
  return (inputTokens / 1e6) * p.in + (outputTokens / 1e6) * p.out;
}

/** 결정적 mock 응답: 입력 해시 기반으로 그럴듯한 정규화 결과를 만들어 오프라인 동작 보장. */
function mockResponse(prompt) {
  // 아주 단순한 결정적 변환(테스트/오프라인용). 실제 정규화 품질을 의미하지 않음.
  const cleaned = (prompt || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
  return JSON.stringify({ _mock: true, normalized: cleaned });
}

/**
 * LLM 호출. 반환: { text, mocked, usage:{inputTokens,outputTokens}, costUSD }
 */
export async function callLLM({ system = '', prompt, maxTokens = 512, model } = {}) {
  const useModel = model || process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
  const key = process.env.ANTHROPIC_API_KEY;
  const inputTokens = estTokens(system) + estTokens(prompt);

  if (!key) {
    const text = mockResponse(prompt);
    return {
      text,
      mocked: true,
      usage: { inputTokens, outputTokens: estTokens(text) },
      costUSD: 0,
    };
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: useModel,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`LLM API ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || '').join('');
  const usage = {
    inputTokens: data.usage?.input_tokens ?? inputTokens,
    outputTokens: data.usage?.output_tokens ?? estTokens(text),
  };
  return {
    text,
    mocked: false,
    usage,
    costUSD: estimateCostUSD({ ...usage, model: useModel }),
  };
}
