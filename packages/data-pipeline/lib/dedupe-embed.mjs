// 근접 중복 판정. 오프라인 결정성을 위해 어휘 기반(토큰 Jaccard + 정규화 키)을 사용.
// 실운영에서는 임베딩 코사인 유사도로 교체 가능(증분만 호출, §3.2). 인터페이스 동일 유지.

function tokenize(s) {
  return new Set(
    String(s || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean),
  );
}

function jaccard(a, b) {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / (a.size + b.size - inter);
}

/** 정규화 키(이름+지역)로 1차 블로킹 → 후보쌍만 유사도 계산(O(n^2) 회피) */
function blockKey(r) {
  const name = String(r.name || '').toLowerCase().replace(/\s+/g, '').slice(0, 4);
  const region = String(r.region || '').slice(0, 2);
  return `${region}:${name}`;
}

/**
 * 근접 중복 클러스터링.
 * @returns {{clusters: number[][], threshold:number}} clusters는 인덱스 그룹
 */
export function findDuplicates(records, threshold = 0.6) {
  const blocks = new Map();
  records.forEach((r, i) => {
    const k = blockKey(r);
    if (!blocks.has(k)) blocks.set(k, []);
    blocks.get(k).push(i);
  });

  const parent = records.map((_, i) => i);
  const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a, b) => { parent[find(a)] = find(b); };

  const toks = records.map((r) => tokenize(`${r.name} ${r.address || ''} ${r.region || ''}`));
  for (const idxs of blocks.values()) {
    for (let i = 0; i < idxs.length; i += 1) {
      for (let j = i + 1; j < idxs.length; j += 1) {
        if (jaccard(toks[idxs[i]], toks[idxs[j]]) >= threshold) union(idxs[i], idxs[j]);
      }
    }
  }
  const groups = new Map();
  records.forEach((_, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(i);
  });
  return { clusters: [...groups.values()], threshold };
}
