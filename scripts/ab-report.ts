// npx tsx scripts/ab-report.ts data/ab-posthog-proof-v1.json docs/AB-POSTHOG-PROOF.md
// Before/after comparison for one counterfactual page edit. Same model, same prompt,
// same snapshot except one page. Includes a placebo check: vendors that were NOT
// edited should not move.
import { readFileSync, writeFileSync } from 'node:fs';
import { tallyDecision } from '../api/_lib/committee';
import { twoProportion, wilson } from '../api/_lib/stats';

type Letter = 'M' | 'N' | 'U';
interface Run {
  id: number;
  votes: Record<string, string>;
  v: Record<string, string>;
}
interface Data {
  experiment: string;
  provider: string;
  requirementOrder: string[];
  owners: Record<string, string>;
  vendorCodes: Record<string, string>;
  variant: { id: string; vendor: string; insert: string; rationale: string };
  arms: { before: { runs: Run[] }; after: { runs: Run[] } };
}

const [, , inPath = 'data/ab-posthog-proof-v1.json', outPath = 'docs/AB-REPORT.md'] = process.argv;
const D: Data = JSON.parse(readFileSync(inPath, 'utf8'));
const REQ = D.requirementOrder;
const target = D.variant.vendor;
const provider = D.provider;
const REQ_TEXT: Record<string, string> = {
  D1: 'Predictable pricing',
  M1: 'EU data hosting',
  M2: 'Self-serve for PMs',
  M3: 'Works with Snowflake',
};

function parse(s: string) {
  const byVendor: Record<string, Record<string, Letter>> = {};
  for (const tok of s.split(' ')) {
    const [code, letters] = tok.split(':');
    const vendor = D.vendorCodes[code] ?? code;
    byVendor[vendor] = Object.fromEntries(REQ.map((r, i) => [r, letters[i] as Letter]));
  }
  return byVendor;
}

function score(runs: Run[]) {
  const vendors = Object.keys(parse(runs[0].v.economic_buyer));
  return runs.map((r) => {
    const parsed = Object.fromEntries(Object.entries(r.v).map(([role, s]) => [role, parse(s)]));
    const ownerOk = (v: string, req: string) => parsed[D.owners[req]][v][req] === 'M';
    const blocked = Object.fromEntries(vendors.map((v) => [v, REQ.filter((q) => !ownerOk(v, q))]));
    const eligible = vendors.filter((v) => blocked[v].length === 0);
    const eb = parsed.economic_buyer;
    const ebEligible = new Set(vendors.filter((v) => REQ.every((q) => eb[v][q] !== 'N')));
    const support = Object.values(r.votes).filter((x) => x === target).length;
    return { r, vendors, blocked, support, decision: tallyDecision(r.votes, eligible, ebEligible) };
  });
}

const A = { experiment: 'before (original page)' };
const B = { experiment: 'after (page + proof)', variant: D.variant };
const a = score(D.arms.before.runs);
const b = score(D.arms.after.runs);
const vendors = a[0].vendors;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const cell = (k: number, n: number) => {
  const w = wilson(k, n);
  return `${pct(w.p)} (${k}/${n}, CI ${pct(w.lo)}–${pct(w.hi)})`;
};
const test = (ka: number, na: number, kb: number, nb: number) => {
  const t = twoProportion(ka, na, kb, nb);
  return `${t.diff >= 0 ? '+' : ''}${Math.round(t.diff * 100)} pts, p=${t.p < 0.001 ? '<0.001' : t.p.toFixed(3)}`;
};

const out: string[] = [];
const line = (s = '') => out.push(s);
line(`# Before / after: ${B.variant?.id ?? B.experiment}`);
line();
line(`Model: ${provider} · before: \`${A.experiment}\` (n=${a.length}) · after: \`${B.experiment}\` (n=${b.length})`);
line();
if (B.variant) {
  line(`**The only change:** ${B.variant.rationale}`);
  line();
  line('Text added to the page (hypothetical copy written for this test, not the vendor\'s real page):');
  line();
  line(B.variant.insert.split('\n').map((l) => `> ${l}`).join('\n>\n'));
  line();
}

line(`## Did ${target} move?`);
line();
line('| Measure | Before | After | Change |');
line('|---|---|---|---|');
const winsA = a.filter((x) => x.decision.vendor === target).length;
const winsB = b.filter((x) => x.decision.vendor === target).length;
line(`| ${target} wins the deal | ${cell(winsA, a.length)} | ${cell(winsB, b.length)} | ${test(winsA, a.length, winsB, b.length)} |`);
const elA = a.filter((x) => x.blocked[target].length === 0).length;
const elB = b.filter((x) => x.blocked[target].length === 0).length;
line(`| ${target} clears every requirement owner | ${cell(elA, a.length)} | ${cell(elB, b.length)} | ${test(elA, a.length, elB, b.length)} |`);
for (const req of REQ) {
  const ka = a.filter((x) => x.blocked[target].includes(req)).length;
  const kb = b.filter((x) => x.blocked[target].includes(req)).length;
  line(`| Blocked on ${REQ_TEXT[req] ?? req} (${D.owners[req].replace('_', ' ')}) | ${cell(ka, a.length)} | ${cell(kb, b.length)} | ${test(ka, a.length, kb, b.length)} |`);
}
const avg = (xs: { support: number }[]) => (xs.reduce((s2, x) => s2 + x.support, 0) / xs.length).toFixed(1);
line(`| Committee members voting ${target} (avg of 5) | ${avg(a)} | ${avg(b)} | |`);
const ndA = a.filter((x) => x.decision.result === 'no_decision').length;
const ndB = b.filter((x) => x.decision.result === 'no_decision').length;
line(`| Committee ends in no decision | ${cell(ndA, a.length)} | ${cell(ndB, b.length)} | ${test(ndA, a.length, ndB, b.length)} |`);
line();

line('## Placebo check: vendors that were not edited');
line();
line('If the experiment is clean, these should not move much.');
line();
line('| Vendor | Blocked by any owner, before | After | Change |');
line('|---|---|---|---|');
for (const v of vendors.filter((x) => x !== target)) {
  const ka = a.filter((x) => x.blocked[v].length > 0).length;
  const kb = b.filter((x) => x.blocked[v].length > 0).length;
  line(`| ${v} | ${cell(ka, a.length)} | ${cell(kb, b.length)} | ${test(ka, a.length, kb, b.length)} |`);
}
line();
line('p-values are two-proportion z-tests; with n≈20 per arm only large effects are detectable, so a non-significant change is "not shown", not "no effect".');
line();

writeFileSync(outPath, out.join('\n') + '\n');
console.log(out.join('\n'));
