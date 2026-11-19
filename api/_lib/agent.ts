import { checkQuote, normalisedPages, type CitationCheck } from './citations.js';
import { callModel, parseJson, type ModelResult, type Provider } from './providers.js';
import type { PageSnapshot } from './snapshot.js';

export const PROMPT_VERSION = 'committee-v0.1';

export type RoleKey = 'economic_buyer' | 'technical_evaluator' | 'champion' | 'procurement' | 'security_legal';

export const ROLES: Record<RoleKey, { title: string; mandate: string; canVeto: boolean }> = {
  economic_buyer: {
    title: 'Economic buyer (VP / budget owner)',
    mandate:
      'You own the budget and the outcome. You care about business impact, total cost over 2-3 years, risk of a failed rollout, and whether this beats doing nothing. You are sceptical of vendor claims that are not backed by proof.',
    canVeto: true,
  },
  technical_evaluator: {
    title: 'Technical evaluator (staff engineer / data lead)',
    mandate:
      'You will implement and maintain this. You care about how it actually works, integrations with the current stack, data model, performance, lock-in and migration effort.',
    canVeto: false,
  },
  champion: {
    title: 'Champion (the team lead who raised the need)',
    mandate:
      'You want the problem solved and need a story you can sell internally. You care about time-to-value, ease of use for your team, and proof you can show your boss.',
    canVeto: false,
  },
  procurement: {
    title: 'Procurement',
    mandate:
      'You care about pricing clarity, how cost scales, contract terms, vendor viability and whether the pricing model can blow up the budget.',
    canVeto: false,
  },
  security_legal: {
    title: 'Security & legal',
    mandate:
      'You care about data residency, compliance certifications, data processing terms, access controls and any claim that would not survive scrutiny. Missing evidence on a hard requirement is a blocker.',
    canVeto: false,
  },
};

export interface Vendor {
  name: string;
  pages: PageSnapshot[];
}

export interface DealBrief {
  id: string;
  buyer: string;
  need: string;
  stack: string[];
  budget: string;
  mustHaves: string[];
  dealBreakers: string[];
  statusQuo: string;
}

interface RawPoint {
  claim: string;
  quote: string | null;
  url: string | null;
}
interface RawAssessment {
  vendor: string;
  fitScore: number;
  strengths: RawPoint[];
  concerns: (RawPoint & { missingProof?: boolean })[];
}
interface RawMemo {
  criteria: { name: string; weight: number }[];
  assessments: RawAssessment[];
  vote: string;
  voteReason: string;
  blocker: string | null;
  confidence: number;
}

export interface CheckedPoint extends RawPoint {
  citation: CitationCheck;
  missingProof?: boolean;
}

export interface AgentRun {
  role: RoleKey;
  provider: Provider;
  model: string;
  promptVersion: string;
  memo: Omit<RawMemo, 'assessments'> & {
    assessments: (Omit<RawAssessment, 'strengths' | 'concerns'> & {
      strengths: CheckedPoint[];
      concerns: CheckedPoint[];
    })[];
  };
  citationStats: { total: number; verified: number; notFound: number; tooShort: number; missingProofFlags: number };
  trace: Pick<ModelResult, 'inputTokens' | 'outputTokens' | 'latencyMs' | 'rateLimit'>;
}

function renderSources(vendors: Vendor[]): string {
  return vendors
    .map(
      (v) =>
        `=== VENDOR: ${v.name} ===\n` +
        v.pages
          .filter((p) => p.text)
          .map((p) => `--- PAGE ${p.url} ---\n${p.text}`)
          .join('\n\n'),
    )
    .join('\n\n');
}

export function buildPrompt(role: RoleKey, brief: DealBrief, vendors: Vendor[]) {
  const r = ROLES[role];
  const system = `You are the ${r.title} on a B2B buying committee.
${r.mandate}

You are evaluating vendors ONLY from the page text provided. You know nothing else about them.
Rules:
- Every strength must include a "quote": a verbatim excerpt (8-40 words) copied exactly from the page text, plus the page "url" it came from. No paraphrase inside "quote".
- A concern can have a quote, or set "quote": null and "missingProof": true when the pages simply do not show evidence you need.
- If no vendor clears your bar, or the evidence is too thin, vote "no_decision". Staying with the status quo is a legitimate outcome; do not pick a vendor just to pick one.
- "blocker": a hard requirement a vendor fails or cannot evidence, or null.
- fitScore is 0-10 for each vendor. confidence is 0-1.
Reply with JSON only, exactly this shape:
{"criteria":[{"name":string,"weight":number}],"assessments":[{"vendor":string,"fitScore":number,"strengths":[{"claim":string,"quote":string,"url":string}],"concerns":[{"claim":string,"quote":string|null,"url":string|null,"missingProof":boolean}]}],"vote":string,"voteReason":string,"blocker":string|null,"confidence":number}
"vote" must be one of: ${vendors.map((v) => JSON.stringify(v.name)).join(', ')}, "no_decision".`;

  const user = `DEAL BRIEF
Buyer: ${brief.buyer}
Need: ${brief.need}
Current stack: ${brief.stack.join(', ')}
Budget: ${brief.budget}
Must-haves: ${brief.mustHaves.join('; ')}
Deal-breakers: ${brief.dealBreakers.join('; ')}
Status quo if nothing is bought: ${brief.statusQuo}

SOURCES (the only evidence you may use)
${renderSources(vendors)}`;
  return { system, user };
}

export async function runAgent(opts: {
  role: RoleKey;
  brief: DealBrief;
  vendors: Vendor[];
  provider: Provider;
  model?: string;
  apiKey?: string;
}): Promise<AgentRun> {
  const { system, user } = buildPrompt(opts.role, opts.brief, opts.vendors);
  const res = await callModel({ provider: opts.provider, model: opts.model, system, user, apiKey: opts.apiKey });
  const raw = parseJson<RawMemo>(res.text);

  const allPages = opts.vendors.flatMap((v) => v.pages.filter((p) => p.text));
  const norm = normalisedPages(allPages);
  const stats = { total: 0, verified: 0, notFound: 0, tooShort: 0, missingProofFlags: 0 };

  const check = (p: RawPoint & { missingProof?: boolean }, isConcern: boolean): CheckedPoint => {
    if (isConcern && p.missingProof && !p.quote) {
      stats.missingProofFlags++;
      return { ...p, citation: { status: 'missing', quote: null, url: p.url ?? null } };
    }
    const c = checkQuote(p.quote, p.url, norm);
    stats.total++;
    if (c.status === 'verified') stats.verified++;
    else if (c.status === 'too_short') stats.tooShort++;
    else stats.notFound++;
    return { ...p, citation: c };
  };

  return {
    role: opts.role,
    provider: res.provider,
    model: res.model,
    promptVersion: PROMPT_VERSION,
    memo: {
      ...raw,
      assessments: (raw.assessments ?? []).map((a) => ({
        ...a,
        strengths: (a.strengths ?? []).map((s) => check(s, false)),
        concerns: (a.concerns ?? []).map((c) => check(c, true)),
      })),
    },
    citationStats: stats,
    trace: {
      inputTokens: res.inputTokens,
      outputTokens: res.outputTokens,
      latencyMs: res.latencyMs,
      rateLimit: res.rateLimit,
    },
  };
}
