// npx tsx scripts/build-lab-data.ts  ->  src/data/lab.json
// Precomputes every number shown on the public /lab page from the committed
// data files, using the same decision and stats code as the experiments.
import { readFileSync, writeFileSync } from 'node:fs';
import { tallyDecision } from '../api/_lib/committee';
import { DEMO_BRIEF } from '../api/_lib/demo-deal';
import { agreement, cohenKappa, mode, twoProportion, wilson } from '../api/_lib/stats';

type Letter = 'M' | 'N' | 'U';
const ab = JSON.parse(readFileSync('data/ab-posthog-proof-v1.json', 'utf8'));
const base = JSON.parse(readFileSync('data/baseline-v1.json', 'utf8'));
const judge = JSON.parse(readFileSync('data/judge-eval-v1.json', 'utf8'));
const REQ: string[] = ab.requirementOrder;
const OWNERS: Record<string, string> = ab.owners;
const VENDORS = ['PostHog', 'Mixpanel', 'Amplitude'];

function parseShort(s: string) {
  const out: Record<string, Record<string, Letter>> = {};
  for (const tok of s.split(' ')) {
    const [code, letters] = tok.split(':');
    out[ab.vendorCodes[code] ?? code] = Object.fromEntries(REQ.map((r, i) => [r, letters[i] as Letter]));
  }
  return out;
}

function arm(runs: { votes: Record<string, string>; v: Record<string, string> }[]) {
  return runs.map((r) => {
    const p = Object.fromEntries(Object.entries(r.v).map(([role, s]) => [role, parseShort(s)]));
    const blocked = Object.fromEntries(VENDORS.map((v) => [v, REQ.filter((q) => p[OWNERS[q]][v][q] !== 'M')]));
    const owner = Object.fromEntries(VENDORS.map((v) => [v, Object.fromEntries(REQ.map((q) => [q, p[OWNERS[q]][v][q]]))]));
    const eligible = VENDORS.filter((v) => blocked[v].length === 0);
    const ebOk = new Set(VENDORS.filter((v) => REQ.every((q) => p.economic_buyer[v][q] !== 'N')));
    return { votes: r.votes, blocked, owner, decision: tallyDecision(r.votes, eligible, ebOk) };
  });
}

const before = arm(ab.arms.before.runs);
const after = arm(ab.arms.after.runs);
const rate = (k: number, n: number) => {
  const w = wilson(k, n);
  return { k, n, p: w.p, lo: w.lo, hi: w.hi };
};

// 1. Baseline blocker matrix (owner verdicts, Gemini, n=20)
const matrix = REQ.map((q) => ({
  req: q,
  owner: OWNERS[q],
  cells: VENDORS.map((v) => {
    const ls = before.map((x) => x.owner[v][q]);
    return { vendor: v, blocked: rate(ls.filter((l) => l !== 'M').length, ls.length), notMet: ls.filter((l) => l === 'N').length, unclear: ls.filter((l) => l === 'U').length };
  }),
}));

// 2. Before / after
const T = ab.variant.vendor;
const m = (xs: typeof before, f: (x: (typeof before)[0]) => boolean) => rate(xs.filter(f).length, xs.length);
const cmp = (f: (x: (typeof before)[0]) => boolean) => {
  const a = m(before, f);
  const b = m(after, f);
  return { before: a, after: b, p: twoProportion(a.k, a.n, b.k, b.n).p };
};
const support = (xs: typeof before) => xs.reduce((s, x) => s + Object.values(x.votes).filter((v) => v === T).length, 0) / xs.length;
const abResult = {
  vendor: T,
  insert: ab.variant.insert,
  rationale: ab.variant.rationale,
  rows: [
    { label: `Technical evaluator blocks ${T} on the warehouse`, ...cmp((x) => x.blocked[T].includes('M3')) },
    { label: `Procurement blocks ${T} on pricing`, ...cmp((x) => x.blocked[T].includes('D1')) },
    { label: `${T} wins the deal`, ...cmp((x) => x.decision.vendor === T) },
    { label: 'Mixpanel blocked (not edited)', ...cmp((x) => x.blocked.Mixpanel.length > 0) },
    { label: 'Amplitude blocked (not edited)', ...cmp((x) => x.blocked.Amplitude.length > 0) },
  ],
  support: { before: support(before), after: support(after) },
};

// 3. Model reliability (baseline-v1, both providers)
const reliability = ['gemini', 'groq'].map((prov) => {
  const rs = base.runs.filter((r: { p: string }) => r.p === prov);
  const chk = rs.reduce((a: number, r: { s: { checked: number } }) => a + r.s.checked, 0);
  const ver = rs.reduce((a: number, r: { s: { verified: number } }) => a + r.s.verified, 0);
  const con = rs.reduce((a: number, r: { contra: string[] }) => a + r.contra.length, 0);
  return { provider: prov, runs: rs.length, quotes: rate(ver, chk), contradictions: rate(con, rs.length * 5) };
});

// 4. Judge vs PMM answer key
const items = Object.keys(judge.labels);
const ref = items.map((i) => judge.labels[i][0]);
const byItem: Record<string, string[]> = {};
for (const run of judge.judges.gemini as string[])
  for (const tok of run.split(' ')) {
    const [id, c] = tok.split('=');
    (byItem[id] ??= []).push({ m: 'met', n: 'not_met', u: 'unclear' }[c[0]]!);
  }
const gem = items.map((i) => mode(byItem[i]) as string);
const kw = items.map((i) => judge.keywordBaseline[i]);
const judgeEval = {
  items: items.length,
  gemini: { agreement: agreement(gem, ref), kappa: cohenKappa(gem, ref) },
  keyword: { agreement: agreement(kw, ref), kappa: cohenKappa(kw, ref) },
  stable: items.filter((i) => new Set(byItem[i]).size === 1).length / items.length,
};

const lab = {
  generatedFrom: ['data/ab-posthog-proof-v1.json', 'data/baseline-v1.json', 'data/judge-eval-v1.json'],
  brief: {
    buyer: DEMO_BRIEF.buyer,
    need: DEMO_BRIEF.need,
    budget: DEMO_BRIEF.budget,
    statusQuo: DEMO_BRIEF.statusQuo,
    requirements: DEMO_BRIEF.requirements.map((r) => ({ id: r.id, kind: r.kind, text: r.text, owner: r.owner })),
  },
  vendors: VENDORS,
  baseline: { runs: before.length, noDecision: rate(before.filter((x) => x.decision.result === 'no_decision').length, before.length), matrix },
  ab: abResult,
  reliability,
  judgeEval,
  totals: {
    committeeRuns: before.length + after.length + base.runs.filter((r: { p: string }) => r.p === 'groq').length,
    agentCalls: (before.length + after.length + base.runs.filter((r: { p: string }) => r.p === 'groq').length) * 5,
    costUsd: 0,
  },
};
writeFileSync('src/data/lab.json', JSON.stringify(lab, null, 2) + '\n');
console.log(JSON.stringify({ ab: abResult.rows.map((r) => [r.label, r.before.p.toFixed(2), r.after.p.toFixed(2), r.p.toFixed(3)]), support: abResult.support, judgeEval, reliability: reliability.map((r) => [r.provider, r.quotes.p.toFixed(2), r.contradictions.p.toFixed(2)]), totals: lab.totals }, null, 1));
