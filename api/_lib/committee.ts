// Committee decision, computed by code from the agents' per-requirement
// verdicts. The model's own "preferred" vendor is recorded but never trusted:
// when it disagrees with its own verdicts, that is counted as a contradiction.

import type { AgentRun, DealBrief, RoleKey } from './agent.js';

export interface Blocker {
  vendor: string;
  requirement: string;
  owner: RoleKey;
  effective: 'not_met' | 'unclear';
}

export interface Outcome {
  result: 'win' | 'no_decision';
  vendor?: string;
  why: 'majority' | 'no_eligible_vendor' | 'no_majority' | 'economic_buyer_veto';
  blockers: Blocker[];
  votes: Record<RoleKey, string>;
  contradictions: RoleKey[];
}

/** A vendor is eligible for a role if that role saw no requirement as not_met (and none of its OWN requirements as unclear). */
export function eligibleFor(run: AgentRun, brief: DealBrief): Set<string> {
  const owned = new Set(brief.requirements.filter((r) => r.owner === run.role).map((r) => r.id));
  return new Set(
    run.vendors
      .filter((v) =>
        v.requirements.every((r) => r.effective === 'met' || (r.effective === 'unclear' && !owned.has(r.id))),
      )
      .map((v) => v.vendor),
  );
}

export function roleVote(run: AgentRun, brief: DealBrief): string {
  const eligible = eligibleFor(run, brief);
  const ranked = run.vendors.filter((v) => eligible.has(v.vendor)).sort((a, b) => b.fitScore - a.fitScore);
  return ranked[0]?.vendor ?? 'no_decision';
}

export function decide(runs: AgentRun[], brief: DealBrief): Outcome {
  const byRole = new Map(runs.map((r) => [r.role, r]));
  const vendors = runs[0]?.vendors.map((v) => v.vendor) ?? [];

  // Blockers: each requirement is judged by its owner.
  const blockers: Blocker[] = [];
  for (const req of brief.requirements) {
    const owner = byRole.get(req.owner);
    if (!owner) continue;
    for (const v of owner.vendors) {
      const r = v.requirements.find((x) => x.id === req.id);
      if (r && r.effective !== 'met') blockers.push({ vendor: v.vendor, requirement: req.id, owner: req.owner, effective: r.effective });
    }
  }
  const blocked = new Set(blockers.map((b) => b.vendor));
  const committeeEligible = vendors.filter((v) => !blocked.has(v));

  const votes = Object.fromEntries(runs.map((r) => [r.role, roleVote(r, brief)])) as Record<RoleKey, string>;
  const contradictions = runs
    .filter((r) => r.preferred !== 'no_decision' && !eligibleFor(r, brief).has(r.preferred))
    .map((r) => r.role);

  const base = { blockers, votes, contradictions };
  if (!committeeEligible.length) return { result: 'no_decision', why: 'no_eligible_vendor', ...base };

  const tally = new Map<string, number>();
  for (const v of Object.values(votes)) if (committeeEligible.includes(v)) tally.set(v, (tally.get(v) ?? 0) + 1);
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return { result: 'no_decision', why: 'no_majority', ...base };

  let winner = sorted[0][0];
  if (sorted.length > 1 && sorted[1][1] === sorted[0][1]) {
    // tie: economic buyer's vote breaks it if it is among the tied
    const tied = sorted.filter(([, n]) => n === sorted[0][1]).map(([v]) => v);
    const eb = votes.economic_buyer;
    if (!tied.includes(eb)) return { result: 'no_decision', why: 'no_majority', ...base };
    winner = eb;
  }

  const eb = byRole.get('economic_buyer');
  if (eb && !eligibleFor(eb, brief).has(winner)) return { result: 'no_decision', why: 'economic_buyer_veto', ...base };

  return { result: 'win', vendor: winner, why: 'majority', ...base };
}
