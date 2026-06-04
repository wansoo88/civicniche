// §13-A 수요 신호 수집기 — 자체 호스팅판(Cloudflare Worker 대체).
// 외부 의존성 0 (Node 내장 http/fs 만). 신호를 JSON 파일에 이메일+상품 단위로 dedup 저장.
// worker.js 와 동일한 엔드포인트/판정 로직: POST /submit, GET /count, GET /export?token=
//
// 실행:
//   ADMIN_TOKEN=<임의토큰> PORT=8787 DATA_FILE=/var/lib/civicniche/13a-signals.json node server.mjs
// nginx 가 /submit /count /export 를 이 포트로 reverse-proxy 한다.

import http from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const PORT = Number(process.env.PORT || 8787);
const DATA_FILE = process.env.DATA_FILE || './13a-signals.json';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

// --- 저장소: { key: record } 맵을 통째로 파일에 persist (소규모 신호 수집엔 충분) ---
mkdirSync(dirname(DATA_FILE), { recursive: true });
let store = {};
if (existsSync(DATA_FILE)) {
  try { store = JSON.parse(readFileSync(DATA_FILE, 'utf8')) || {}; } catch { store = {}; }
}
const persist = () => writeFileSync(DATA_FILE, JSON.stringify(store, null, 0));

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const sigKey = (email, product) =>
  `sig:${product || '-'}:${String(email).toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 80)}`;

const send = (res, obj, status = 200) =>
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS }).end(JSON.stringify(obj));

const readBody = (req) => new Promise((resolve) => {
  let d = ''; req.on('data', (c) => { d += c; if (d.length > 1e6) req.destroy(); });
  req.on('end', () => resolve(d));
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'OPTIONS') return res.writeHead(204, CORS).end();

  // 신호 저장(이메일+상품 단위 upsert)
  if (url.pathname === '/submit' && req.method === 'POST') {
    let body;
    try { body = JSON.parse(await readBody(req)); } catch { return send(res, { ok: false, error: 'bad json' }, 400); }
    if (!body || !body.email || !String(body.email).includes('@')) {
      return send(res, { ok: false, error: 'valid email required' }, 400);
    }
    const product = String(body.product || '').slice(0, 60);
    const key = sigKey(body.email, product);
    const prevRec = store[key] || null;
    const keep = (cur, prev) => (cur && String(cur).trim() ? String(cur) : (prev || ''));
    let intent = String(body.intent || '').slice(0, 20);
    if (prevRec && prevRec.intent === 'presale') intent = 'presale'; // 강한 신호 보존
    store[key] = {
      email: String(body.email).slice(0, 200),
      product,
      intent,                                              // presale / sample
      persona: keep(body.persona, prevRec?.persona).slice(0, 60),
      need: keep(body.need, prevRec?.need).slice(0, 500),
      willingness: keep(body.willingness, prevRec?.willingness).slice(0, 20),
      ts: new Date().toISOString(),
    };
    persist();
    return send(res, { ok: true });
  }

  // 통과 기준 확인용 집계(공개 — 이메일 본문 비노출)
  if (url.pathname === '/count') {
    const vals = Object.values(store);
    const byIntent = {}, byProduct = {}, byWillingness = {};
    const emails = new Set();
    for (const r of vals) {
      byIntent[r.intent || '-'] = (byIntent[r.intent || '-'] || 0) + 1;
      byProduct[r.product || '-'] = (byProduct[r.product || '-'] || 0) + 1;
      byWillingness[r.willingness || '-'] = (byWillingness[r.willingness || '-'] || 0) + 1;
      if (r.email) emails.add(r.email.toLowerCase());
    }
    const payIntent = ['29', '49', '99', 'gt99'].reduce((s, k) => s + (byWillingness[k] || 0), 0);
    // §13-A 통과: 샘플요청 5+ 또는 사전결제의향 1+
    const pass = (byIntent.sample || 0) >= 5 || (byIntent.presale || 0) >= 1;
    return send(res, {
      total: vals.length, distinctEmails: emails.size,
      byIntent, byProduct, byWillingness, payIntent,
      pass, criterion: 'sample>=5 OR presale>=1',
    });
  }

  // 실제 리드(이메일·니즈) 회수 — 샘플 발송용. ADMIN_TOKEN 보호.
  if (url.pathname === '/export') {
    const token = url.searchParams.get('token') || '';
    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) return send(res, { ok: false, error: 'unauthorized' }, 401);
    const records = Object.values(store);
    return send(res, { count: records.length, records });
  }

  return send(res, { service: 'civicniche-13a-collector', endpoints: ['POST /submit', 'GET /count', 'GET /export?token='] });
});

server.listen(PORT, '127.0.0.1', () => console.log(`13a-collector on 127.0.0.1:${PORT} → ${DATA_FILE}`));
