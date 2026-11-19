// Evidence packs: deterministic, role-aware retrieval of passages.
// Each agent sees only the passages relevant to what it owns and cares about,
// coverage-first: the best passage for every requirement is included before
// anything else. Same pack for every model, so model comparisons are fair.

import type { PageSnapshot } from './snapshot.js';

export interface Passage {
  vendor: string;
  url: string;
  pos: number; // order within page
  text: string;
}

export interface Query {
  id: string;
  terms: string[];
  weight: number;
}

const STOP = new Set(
  'the and for with that this from your you our are can all any but not have has will into more than then they their them what when where which while who how its it’s it'.split(
    ' ',
  ),
);

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9€$%.\s-]/g, ' ')
    .split(/[\s-]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ''))
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

/** Split page text into passages of up to ~maxChars, never splitting a line. */
export function toPassages(vendor: string, page: PageSnapshot, maxChars = 420): Passage[] {
  const out: Passage[] = [];
  let buf: string[] = [];
  let len = 0;
  const flush = () => {
    if (buf.length) out.push({ vendor, url: page.url, pos: out.length, text: buf.join('\n') });
    buf = [];
    len = 0;
  };
  for (const line of page.text.split('\n')) {
    if (len + line.length > maxChars && buf.length) flush();
    buf.push(line);
    len += line.length + 1;
  }
  flush();
  return out;
}

/** BM25 score of one passage for a query (multi-word terms matched as phrases). */
function bm25(p: Passage, q: Query, idf: Map<string, number>, avgLen: number, k1 = 1.2, b = 0.75): number {
  const toks = tokenize(p.text);
  const lower = p.text.toLowerCase();
  const len = toks.length || 1;
  let score = 0;
  for (const term of q.terms) {
    const t = term.toLowerCase();
    const tf = t.includes(' ') ? lower.split(t).length - 1 : toks.filter((x) => x === t).length;
    if (!tf) continue;
    const w = idf.get(t) ?? 1;
    score += w * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * len) / avgLen)));
  }
  return score * q.weight;
}

export function buildIdf(passages: Passage[], terms: string[]): Map<string, number> {
  const N = passages.length || 1;
  const idf = new Map<string, number>();
  const lowered = passages.map((p) => p.text.toLowerCase());
  const tokSets = passages.map((p) => new Set(tokenize(p.text)));
  for (const raw of new Set(terms.map((t) => t.toLowerCase()))) {
    const df = raw.includes(' ')
      ? lowered.filter((l) => l.includes(raw)).length
      : tokSets.filter((s) => s.has(raw)).length;
    idf.set(raw, Math.log(1 + (N - df + 0.5) / (df + 0.5)));
  }
  return idf;
}

export interface PackOptions {
  charsPerVendor: number;
}

/**
 * For one vendor: first the page header (title/description), then the top
 * passage for each query (coverage), then the best remaining passages by total
 * score, until the budget is used. Returned in original page order.
 */
export function packForVendor(
  passages: Passage[],
  queries: Query[],
  idf: Map<string, number>,
  avgLen: number,
  opts: PackOptions,
): Passage[] {
  const chosen = new Set<Passage>();
  let used = 0;
  const take = (p: Passage | undefined) => {
    if (!p || chosen.has(p) || used + p.text.length > opts.charsPerVendor) return;
    chosen.add(p);
    used += p.text.length;
  };
  // page headers
  for (const p of passages) if (p.pos === 0) take(p);
  // coverage: best passage per query
  for (const q of queries) {
    let best: Passage | undefined;
    let bestScore = 0;
    for (const p of passages) {
      const s = bm25(p, q, idf, avgLen);
      if (s > bestScore) [best, bestScore] = [p, s];
    }
    take(best);
  }
  // fill
  const ranked = passages
    .map((p) => ({ p, s: queries.reduce((a, q) => a + bm25(p, q, idf, avgLen), 0) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  for (const { p } of ranked) take(p);
  return [...chosen].sort((a, b) => (a.url === b.url ? a.pos - b.pos : a.url < b.url ? -1 : 1));
}

export function buildPacks(
  vendors: { name: string; pages: PageSnapshot[] }[],
  queries: Query[],
  opts: PackOptions,
): Map<string, Passage[]> {
  const all = vendors.flatMap((v) => v.pages.filter((p) => p.text).flatMap((p) => toPassages(v.name, p)));
  const idf = buildIdf(all, queries.flatMap((q) => q.terms));
  const avgLen = all.reduce((a, p) => a + tokenize(p.text).length, 0) / (all.length || 1);
  const packs = new Map<string, Passage[]>();
  for (const v of vendors) {
    packs.set(
      v.name,
      packForVendor(
        all.filter((p) => p.vendor === v.name),
        queries,
        idf,
        avgLen,
        opts,
      ),
    );
  }
  return packs;
}
