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

  const eb = byRole.get('economic_buyer');
  const ebEligible = eb ? eligibleFor(eb, brief) : new Set(vendors);
  const t = tallyDecision(votes, committeeEligible, ebEligible);
  return { ...t, blockers, votes, contradictions };
}

export const DECISION_RULE = 'v2';

/**
 * Decision rule v2 (pure, so stored runs can be re-scored without new model calls).
 * - "no_decision" is a candidate like any vendor; a vote for a committee-blocked vendor counts as no_decision.
 * - The winner needs strictly more votes than "no_decision" (and than any other vendor).
 * - A tie between vendors is broken by the economic buyer's vote, if it is one of them.
 * - The economic buyer can veto a winner it found ineligible.
 * (v1 ignored no_decision votes, so a vendor could "win" with 1 of 5 votes.)
 */
export function tallyDecision(
  votes: Record<string, string>,
  committeeEligible: string[],
  ebEligible: Set<string>,
): Pick<Outcome, 'result' | 'vendor' | 'why'> {
  if (!committeeEligible.length) return { result: 'no_decision', why: 'no_eligible_vendor' };
  const tally = new Map<string, number>();
  let nd = 0;
  for (const v of Object.values(votes)) {
    if (committeeEligible.includes(v)) tally.set(v, (tally.get(v) ?? 0) + 1);
    else nd++;
  }
  const sorted = [...tally.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted.length || sorted[0][1] <= nd) return { result: 'no_decision', why: 'no_majority' };
  let winner = sorted[0][0];
  const tied = sorted.filter(([, n]) => n === sorted[0][1]).map(([v]) => v);
  if (tied.length > 1) {
    const ebVote = votes.economic_buyer;
    if (!tied.includes(ebVote)) return { result: 'no_decision', why: 'no_majority' };
    winner = ebVote;
  }
  if (!ebEligible.has(winner)) return { result: 'no_decision', why: 'economic_buyer_veto' };
  return { result: 'win', vendor: winner, why: 'majority' };
}
