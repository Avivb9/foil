// Eval set for the judge: (vendor, requirement) items, each with the exact
// evidence excerpts the judge sees. A PMM labels them; models and a keyword
// baseline are scored against those labels.
import type { Vendor } from './agent.js';
import { DEMO_BRIEF } from './demo-deal.js';
import { buildIdf, packForVendor, tokenize, toPassages, type Query } from './evidence.js';

export interface EvalRequirement {
  id: string;
  text: string;
  terms: string[];
}

// The deal's 4 requirements plus 6 probes chosen to mix clear yes / clear no / unclear.
export const EVAL_REQUIREMENTS: EvalRequirement[] = [
  ...DEMO_BRIEF.requirements.map((r) => ({
    id: r.id,
    text: r.kind === 'deal_breaker' ? `Pricing is predictable (does not scale unpredictably with event volume or seats)` : r.text,
    terms: r.terms,
  })),
  { id: 'P1', text: 'SOC 2 compliance', terms: ['soc 2', 'soc2', 'soc ii', 'compliance', 'audit', 'certified'] },
  { id: 'P2', text: 'Single sign-on (SSO / SAML)', terms: ['sso', 'saml', 'single sign-on', 'okta', 'login'] },
  { id: 'P3', text: 'Session replay included', terms: ['session replay', 'replay', 'recordings', 'session recordings'] },
  { id: 'P4', text: 'A/B testing / experiments', terms: ['experiments', 'experimentation', 'a/b', 'ab testing', 'feature flags'] },
  { id: 'P5', text: 'A free plan exists', terms: ['free', 'free plan', '$0', 'free forever', 'starts at'] },
  { id: 'P6', text: 'Raw data export or API access', terms: ['export', 'api', 'raw data', 'download', 'csv', 'query api'] },
];

export interface EvalItem {
  id: string; // `${vendor}:${reqId}`
  vendor: string;
  reqId: string;
  reqText: string;
  passages: { url: string; text: string }[];
}

export function buildEvalItems(vendors: Vendor[], charsPerItem = 1200): EvalItem[] {
  const all = vendors.flatMap((v) => v.pages.filter((p) => p.text).flatMap((p) => toPassages(v.name, p)));
  const queries: Query[] = EVAL_REQUIREMENTS.map((r) => ({ id: r.id, terms: [...r.terms, ...r.text.split(/\s+/)], weight: 1 }));
  const idf = buildIdf(all, queries.flatMap((q) => q.terms));
  const avgLen = all.reduce((a, p) => a + tokenize(p.text).length, 0) / (all.length || 1);
  const items: EvalItem[] = [];
  for (const v of vendors) {
    const vp = all.filter((p) => p.vendor === v.name);
    for (const r of EVAL_REQUIREMENTS) {
      const q = queries.find((x) => x.id === r.id)!;
      // single-query pack; skip page headers so the excerpt is about this requirement
      const pack = packForVendor(
        vp.filter((p) => p.pos !== 0),
        [q],
        idf,
        avgLen,
        { charsPerVendor: charsPerItem },
      );
      items.push({ id: `${v.name}:${r.id}`, vendor: v.name, reqId: r.id, reqText: r.text, passages: pack.map((p) => ({ url: p.url, text: p.text })) });
    }
  }
  return items;
}

/** Baseline judge: "met" if any requirement term appears in the evidence, else "unclear". Never says "not_met". */
export function keywordVerdict(item: EvalItem): 'met' | 'unclear' {
  const r = EVAL_REQUIREMENTS.find((x) => x.id === item.reqId)!;
  const text = item.passages.map((p) => p.text).join('\n').toLowerCase();
  return r.terms.some((t) => text.includes(t.toLowerCase())) ? 'met' : 'unclear';
}
