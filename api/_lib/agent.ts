import { checkQuote, normalisedPages, type CitationCheck } from './citations.js';
import { buildPacks, type Passage, type Query } from './evidence.js';
import { callModel, parseJson, type ModelResult, type Provider } from './providers.js';
import type { PageSnapshot } from './snapshot.js';

export const PROMPT_VERSION = 'committee-v0.3';

export type RoleKey = 'economic_buyer' | 'technical_evaluator' | 'champion' | 'procurement' | 'security_legal';
export const ROLE_KEYS: RoleKey[] = ['economic_buyer', 'technical_evaluator', 'champion', 'procurement', 'security_legal'];

export const ROLES: Record<RoleKey, { title: string; mandate: string; terms: string[] }> = {
  economic_buyer: {
    title: 'Economic buyer (VP / budget owner)',
    mandate:
      'You own the budget and the outcome. You care about business impact, total cost over 2-3 years, risk of a failed rollout, and whether this beats doing nothing. You are sceptical of claims that are not backed by proof.',
    terms: ['roi', 'impact', 'customers', 'trusted', 'pricing', 'cost', 'results', 'growth'],
  },
  technical_evaluator: {
    title: 'Technical evaluator (staff engineer / data lead)',
    mandate:
      'You will implement and maintain this. You care about how it actually works, integrations with the current stack, data model, performance, lock-in and migration effort.',
    terms: ['sdk', 'api', 'integrations', 'segment', 'warehouse', 'sql', 'autocapture', 'install', 'export'],
  },
  champion: {
    title: 'Champion (the team lead who raised the need)',
    mandate:
      'You want the problem solved and need a story you can sell internally. You care about time-to-value, ease of use for your team, and proof you can show your boss.',
    terms: ['easy', 'minutes', 'self-serve', 'templates', 'insights', 'teams', 'collaboration', 'ai'],
  },
  procurement: {
    title: 'Procurement',
    mandate:
      'You care about pricing clarity, how cost scales, contract terms, vendor viability and whether the pricing model can blow up the budget.',
    terms: ['pricing', 'plan', 'annual', 'contract', 'discount', 'free', 'enterprise', 'billing'],
  },
  security_legal: {
    title: 'Security & legal',
    mandate:
      'You care about data residency, compliance certifications, data processing terms, access controls and any claim that would not survive scrutiny. Missing evidence on a hard requirement is a blocker.',
    terms: ['soc 2', 'iso', 'gdpr', 'hipaa', 'sso', 'security', 'compliance', 'dpa', 'permissions', 'encryption'],
  },
};

export interface Requirement {
  id: string;
  kind: 'must_have' | 'deal_breaker';
  text: string;
  owner: RoleKey;
  terms: string[];
}

export interface DealBrief {
  id: string;
  buyer: string;
  need: string;
  stack: string[];
  budget: string;
  statusQuo: string;
  requirements: Requirement[];
}

export interface Vendor {
  name: string;
  pages: PageSnapshot[];
}

/** met/not_met for must-haves; for deal-breakers "met" means the deal-breaker is NOT triggered (vendor is safe). */
export type Verdict = 'met' | 'not_met' | 'unclear';

interface RawRequirement {
  id: string;
  status: Verdict;
  quote: string | null;
  url: string | null;
  note?: string;
}
interface RawVendor {
  vendor: string;
  requirements: RawRequirement[];
  fitScore: number;
  topConcern?: string;
}
interface RawMemo {
  vendors: RawVendor[];
  preferred: string;
  reason: string;
  confidence: number;
}

export interface CheckedRequirement extends RawRequirement {
  citation: CitationCheck;
  /** status after evidence discipline: a "met" without a verified quote becomes "unclear" */
  effective: Verdict;
}

export interface AgentRun {
  role: RoleKey;
  provider: Provider;
  model: string;
  promptVersion: string;
  vendors: { vendor: string; fitScore: number; topConcern?: string; requirements: CheckedRequirement[] }[];
  preferred: string; // what the model said it prefers
  reason: string;
  confidence: number;
  evidenceChars: number;
  citationStats: { checked: number; verified: number; downgraded: number };
  trace: Pick<ModelResult, 'inputTokens' | 'outputTokens' | 'latencyMs'> & { attempts: number };
}

export const VERIFIED = new Set(['verified', 'verified_segments']);

export function queriesFor(role: RoleKey, brief: DealBrief): Query[] {
  return [
    ...brief.requirements.map((r) => ({ id: r.id, terms: [...r.terms, ...r.text.split(/\s+/)], weight: r.owner === role ? 2 : 1 })),
    { id: 'role', terms: ROLES[role].terms, weight: 1 },
  ];
}

export function buildPrompt(role: RoleKey, brief: DealBrief, vendorNames: string[], packs: Map<string, Passage[]>) {
  const r = ROLES[role];
  const owned = brief.requirements.filter((q) => q.owner === role).map((q) => q.id);
  const system = `You are the ${r.title} on a B2B buying committee.
${r.mandate}
${owned.length ? `You personally own requirement(s) ${owned.join(', ')}: for these, "unclear" is not good enough for you.` : ''}

You judge vendors ONLY from the excerpts provided. Excerpts are partial: if something is not shown, mark it "unclear", not "not_met", unless an excerpt shows it is not offered.
For every vendor and every requirement give:
- "status": "met" | "not_met" | "unclear". For a deal_breaker, "met" means the vendor is SAFE (the deal-breaker is not triggered) and "not_met" means it IS triggered.
- "quote": one continuous excerpt (8-40 words) copied exactly from the excerpts that supports the status, or null. A "met" without an exact quote will be treated as "unclear".
- "url": the page the quote is from.
Also give each vendor a fitScore 0-10 from your role's point of view, and its topConcern.
"preferred" is the vendor you would back, or "no_decision". Staying with the status quo is legitimate.
Reply with JSON only:
{"vendors":[{"vendor":string,"requirements":[{"id":string,"status":"met"|"not_met"|"unclear","quote":string|null,"url":string|null,"note":string}],"fitScore":number,"topConcern":string}],"preferred":string,"reason":string,"confidence":number}`;

  const reqs = brief.requirements.map((q) => `${q.id} [${q.kind}] ${q.text}`).join('\n');
  const evidence = vendorNames
    .map(
      (v) =>
        `=== VENDOR: ${v} ===\n` +
        (packs.get(v) ?? [])
          .map((p) => `[${p.url}]\n${p.text}`)
          .join('\n…\n'),
    )
    .join('\n\n');

  const user = `DEAL BRIEF
Buyer: ${brief.buyer}
Need: ${brief.need}
Current stack: ${brief.stack.join(', ')}
Budget: ${brief.budget}
Status quo if nothing is bought: ${brief.statusQuo}

REQUIREMENTS
${reqs}

EXCERPTS FROM VENDOR PAGES (the only evidence you may use)
${evidence}`;
  return { system, user, evidenceChars: evidence.length };
}

export async function runAgent(opts: {
  role: RoleKey;
  brief: DealBrief;
  vendors: Vendor[];
  provider: Provider;
  model?: string;
  apiKey?: string;
  charsPerVendor?: number;
}): Promise<AgentRun> {
  const packs = buildPacks(opts.vendors, queriesFor(opts.role, opts.brief), {
    charsPerVendor: opts.charsPerVendor ?? 4200,
  });
  const names = opts.vendors.map((v) => v.name);
  const { system, user, evidenceChars } = buildPrompt(opts.role, opts.brief, names, packs);
  const res = await callModel({ provider: opts.provider, model: opts.model, system, user, apiKey: opts.apiKey });
  const raw = parseJson<RawMemo>(res.text);

  // quotes are checked against the FULL page text, not just the pack
  const norm = normalisedPages(opts.vendors.flatMap((v) => v.pages.filter((p) => p.text)));
  const stats = { checked: 0, verified: 0, downgraded: 0 };

  const vendors = names.map((name) => {
    const rv = (raw.vendors ?? []).find((x) => x.vendor?.toLowerCase() === name.toLowerCase());
    const requirements: CheckedRequirement[] = opts.brief.requirements.map((req) => {
      const rr = rv?.requirements?.find((x) => x.id === req.id);
      const status: Verdict = rr && ['met', 'not_met', 'unclear'].includes(rr.status) ? rr.status : 'unclear';
      const citation = checkQuote(rr?.quote, rr?.url, norm);
      if (rr?.quote) stats.checked++;
      const ok = VERIFIED.has(citation.status);
      if (ok) stats.verified++;
      let effective = status;
      if (status === 'met' && !ok) {
        effective = 'unclear';
        stats.downgraded++;
      }
      return { id: req.id, status, quote: rr?.quote ?? null, url: rr?.url ?? null, note: rr?.note, citation, effective };
    });
    return { vendor: name, fitScore: Number(rv?.fitScore ?? 0), topConcern: rv?.topConcern, requirements };
  });

  return {
    role: opts.role,
    provider: res.provider,
    model: res.model,
    promptVersion: PROMPT_VERSION,
    vendors,
    preferred: raw.preferred ?? 'no_decision',
    reason: raw.reason ?? '',
    confidence: Number(raw.confidence ?? 0),
    evidenceChars,
    citationStats: stats,
    trace: { inputTokens: res.inputTokens, outputTokens: res.outputTokens, latencyMs: res.latencyMs, attempts: res.attempts },
  };
}
