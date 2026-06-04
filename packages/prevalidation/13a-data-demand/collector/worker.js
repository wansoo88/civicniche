// §13-A 수요 신호 수집기 — Cloudflare Worker (무료 등급, 무인).
// 랜딩(index.html)의 폼 제출을 KV에 저장(이메일+상품 단위 dedup), /count로 통과기준 확인,
// /export?token= 로 실제 리드(이메일·니즈)를 회수해 샘플을 발송한다.
//
// 배포(collector/ 에서):
//   npx wrangler kv namespace create SIGNALS      # 출력 id를 wrangler.toml id= 에 붙여넣기
//   npx wrangler secret put ADMIN_TOKEN           # /export 보호용 임의 토큰 입력
//   npx wrangler deploy                           # → https://civicniche-13a-collector.<subdomain>.workers.dev

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

// 이메일+상품 단위 dedup 키 — 같은 사람의 반복 제출이 신호를 부풀리지 않게(정직한 distinct 카운트).
const sigKey = (email, product) =>
  `sig:${product || '-'}:${String(email).toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 80)}`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    // 신호 저장(이메일+상품 단위 upsert)
    if (url.pathname === '/submit' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'bad json' }, 400); }
      if (!body || !body.email || !String(body.email).includes('@')) {
        return json({ ok: false, error: 'valid email required' }, 400);
      }
      const product = String(body.product || '').slice(0, 60);
      const key = sigKey(body.email, product);
      // 같은 이메일+상품 재제출은 upsert: 강신호(presale)와 기존 입력 디테일을 보존(빈 값이 덮어쓰지 않게).
      let prevRec = null;
      const prevRaw = await env.SIGNALS.get(key);
      if (prevRaw) { try { prevRec = JSON.parse(prevRaw); } catch { /* ignore */ } }
      const keep = (cur, prev) => (cur && String(cur).trim() ? String(cur) : (prev || ''));
      let intent = String(body.intent || '').slice(0, 20);
      if (prevRec && prevRec.intent === 'presale') intent = 'presale'; // 강한 신호 보존
      const rec = {
        email: String(body.email).slice(0, 200),
        product,
        intent,                                              // presale / sample
        persona: keep(body.persona, prevRec?.persona).slice(0, 60),
        need: keep(body.need, prevRec?.need).slice(0, 500),
        willingness: keep(body.willingness, prevRec?.willingness).slice(0, 20),
        ts: new Date().toISOString(),
      };
      await env.SIGNALS.put(key, JSON.stringify(rec));
      return json({ ok: true });
    }

    // 통과 기준 확인용 집계(공개 — 민감정보 없음, 이메일 본문은 노출 안 함)
    if (url.pathname === '/count') {
      const list = await env.SIGNALS.list({ prefix: 'sig:', limit: 1000 });
      const vals = await Promise.all(list.keys.map((k) => env.SIGNALS.get(k.name)));
      const byIntent = {}, byProduct = {}, byWillingness = {};
      const emails = new Set();
      for (const v of vals) {
        if (!v) continue;
        try {
          const r = JSON.parse(v);
          byIntent[r.intent || '-'] = (byIntent[r.intent || '-'] || 0) + 1;
          byProduct[r.product || '-'] = (byProduct[r.product || '-'] || 0) + 1;
          byWillingness[r.willingness || '-'] = (byWillingness[r.willingness || '-'] || 0) + 1;
          if (r.email) emails.add(r.email.toLowerCase());
        } catch { /* skip */ }
      }
      // 지불의사($29+) 선택 수 — 단순 호기심과 분리해서 본다(§13-A)
      const payIntent = ['29', '49', '99', 'gt99'].reduce((s, k) => s + (byWillingness[k] || 0), 0);
      // §13-A 통과: 샘플요청 5+ 또는 사전결제의향 1+
      const pass = (byIntent.sample || 0) >= 5 || (byIntent.presale || 0) >= 1;
      return json({
        total: list.keys.length, distinctEmails: emails.size,
        byIntent, byProduct, byWillingness, payIntent,
        pass, criterion: 'sample>=5 OR presale>=1',
      });
    }

    // 실제 리드(이메일·니즈) 회수 — 샘플 발송용. ADMIN_TOKEN 보호.
    //   curl "https://<worker>/export?token=<ADMIN_TOKEN>"
    if (url.pathname === '/export') {
      const token = url.searchParams.get('token') || '';
      if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) return json({ ok: false, error: 'unauthorized' }, 401);
      const list = await env.SIGNALS.list({ prefix: 'sig:', limit: 1000 });
      const vals = await Promise.all(list.keys.map((k) => env.SIGNALS.get(k.name)));
      const records = vals.map((v) => { try { return JSON.parse(v); } catch { return null; } }).filter(Boolean);
      return json({ count: records.length, records });
    }

    return json({ service: 'civicniche-13a-collector', endpoints: ['POST /submit', 'GET /count', 'GET /export?token='] });
  },
};
