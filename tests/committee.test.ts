import { describe, expect, it } from 'vitest';
import type { AgentRun, CheckedRequirement, DealBrief, RoleKey, Verdict } from '../api/_lib/agent';
import { decide, eligibleFor, roleVote, tallyDecision } from '../api/_lib/committee';
import { buildPacks } from '../api/_lib/evidence';
import { cohenKappa, twoProportion, wilson } from '../api/_lib/stats';

const brief: DealBrief = {
  id: 't',
  buyer: '',
  need: '',
  stack: [],
  budget: '',
  statusQuo: '',
  requirements: [
    { id: 'M1', kind: 'must_have', text: 'EU hosting', owner: 'security_legal', terms: ['eu'] },
    { id: 'D1', kind: 'deal_breaker', text: 'Unpredictable pricing', owner: 'procurement', terms: ['pricing'] },
  ],
};

const req = (id: string, effective: Verdict): CheckedRequirement => ({
  id,
  status: effective,
  quote: null,
  url: null,
  citation: { status: 'verified', quote: null, url: null },
  effective,
});

function run(role: RoleKey, v: Record<string, [Verdict, Verdict, number]>, preferred = 'no_decision'): AgentRun {
  return {
    role,
    provider: 'gemini',
    model: 'm',
    promptVersion: 'p',
    vendors: Object.entries(v).map(([vendor, [m1, d1, fit]]) => ({ vendor, fitScore: fit, requirements: [req('M1', m1), req('D1', d1)] })),
    preferred,
    reason: '',
    confidence: 1,
    evidenceChars: 0,
    citationStats: { checked: 0, verified: 0, downgraded: 0 },
    trace: { inputTokens: 0, outputTokens: 0, latencyMs: 0, modelVersion: null, attempts: 1 },
  };
}

const allMet = { A: ['met', 'met', 8], B: ['met', 'met', 6] } as Record<string, [Verdict, Verdict, number]>;

describe('eligibility', () => {
  it('unclear on a requirement you do not own is tolerated', () => {
    const r = run('champion', { A: ['unclear', 'met', 8] });
    expect(eligibleFor(r, brief).has('A')).toBe(true);
  });
  it('unclear on a requirement you own is a blocker', () => {
    const r = run('security_legal', { A: ['unclear', 'met', 8] });
    expect(eligibleFor(r, brief).has('A')).toBe(false);
  });
  it('not_met is a blocker for everyone', () => {
    expect(eligibleFor(run('champion', { A: ['not_met', 'met', 8] }), brief).has('A')).toBe(false);
  });
  it('a role votes for its highest-fit eligible vendor', () => {
    expect(roleVote(run('champion', allMet), brief)).toBe('A');
  });
});

describe('decide', () => {
  const roles: RoleKey[] = ['economic_buyer', 'technical_evaluator', 'champion', 'procurement', 'security_legal'];
  it('majority wins when nothing blocks', () => {
    const o = decide(roles.map((r) => run(r, allMet)), brief);
    expect(o).toMatchObject({ result: 'win', vendor: 'A', why: 'majority' });
  });
  it('the owner of a requirement can block a vendor, and votes for it then count as no_decision', () => {
    const runs = roles.map((r) => (r === 'security_legal' ? run(r, { A: ['unclear', 'met', 8], B: ['met', 'met', 6] }) : run(r, allMet)));
    const o = decide(runs, brief);
    expect(o.result).toBe('no_decision'); // four members back A, which security blocked; B has one vote
    expect(o.blockers).toContainEqual({ vendor: 'A', requirement: 'M1', owner: 'security_legal', effective: 'unclear' });
  });
  it('no eligible vendor means no decision', () => {
    const runs = roles.map((r) => (r === 'procurement' ? run(r, { A: ['met', 'not_met', 8], B: ['met', 'unclear', 6] }) : run(r, allMet)));
    expect(decide(runs, brief)).toMatchObject({ result: 'no_decision', why: 'no_eligible_vendor' });
  });
  it('counts a contradiction when a model prefers a vendor its own verdicts rule out', () => {
    const runs = roles.map((r) => (r === 'champion' ? run(r, { A: ['not_met', 'met', 9], B: ['met', 'met', 6] }, 'A') : run(r, allMet)));
    expect(decide(runs, brief).contradictions).toEqual(['champion']);
  });
});

describe('decision rule v2', () => {
  const all = new Set(['A', 'B']);
  it('a single vote against four no_decisions is not a win', () => {
    expect(tallyDecision({ a: 'A', b: 'no_decision', c: 'no_decision', d: 'no_decision', e: 'no_decision' }, ['A', 'B'], all).result).toBe('no_decision');
  });
  it('a vote for a blocked vendor counts as no_decision', () => {
    expect(tallyDecision({ a: 'B', b: 'B', c: 'B', d: 'A', e: 'A' }, ['A'], all)).toMatchObject({ result: 'no_decision' });
  });
  it('3 of 5 wins', () => {
    expect(tallyDecision({ economic_buyer: 'A', b: 'A', c: 'A', d: 'no_decision', e: 'B' }, ['A', 'B'], all)).toMatchObject({ result: 'win', vendor: 'A' });
  });
});

describe('evidence packs', () => {
  const page = (url: string, text: string) => ({ url, status: 200, fetchedAt: '', sha256: '', chars: text.length, text, truncated: false, fullChars: text.length });
  const filler = Array.from({ length: 40 }, (_, i) => `Generic marketing line number ${i} about delight and synergy.`).join('\n');
  it('includes the best passage for each requirement within budget', () => {
    const packs = buildPacks(
      [{ name: 'A', pages: [page('u', `TITLE: A\n${filler}\nData is hosted in the EU (Frankfurt) region.\n${filler}\nPricing: set billing limits, no surprise bills.`)] }],
      [
        { id: 'M1', terms: ['eu', 'frankfurt', 'hosting'], weight: 1 },
        { id: 'D1', terms: ['pricing', 'billing limits'], weight: 1 },
      ],
      { charsPerVendor: 1400 },
    );
    const text = packs.get('A')!.map((p) => p.text).join('\n');
    expect(text).toContain('Frankfurt');
    expect(text).toContain('billing limits');
    expect(text.length).toBeLessThanOrEqual(1400 + 50);
  });
});

describe('stats', () => {
  it('cohen kappa: perfect, chance-level and textbook cases', () => {
    expect(cohenKappa(['a', 'b', 'a'], ['a', 'b', 'a'])).toBe(1);
    // 20 yes/yes, 5 yes/no, 10 no/yes, 15 no/no -> kappa 0.4
    const a = [...Array(25).fill('y'), ...Array(25).fill('n')];
    const b = [...Array(20).fill('y'), ...Array(5).fill('n'), ...Array(10).fill('y'), ...Array(15).fill('n')];
    expect(cohenKappa(a, b)).toBeCloseTo(0.4, 5);
  });
  it('wilson interval brackets the estimate', () => {
    const w = wilson(7, 20);
    expect(w.p).toBeCloseTo(0.35);
    expect(w.lo).toBeGreaterThan(0.15);
    expect(w.hi).toBeLessThan(0.6);
  });
  it('two-proportion test detects a large shift and ignores a tiny one', () => {
    expect(twoProportion(4, 20, 14, 20).p).toBeLessThan(0.01);
    expect(twoProportion(10, 20, 11, 20).p).toBeGreaterThan(0.5);
  });
});
