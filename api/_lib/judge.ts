// Neutral judge used for the eval: for one vendor, rate every eval requirement
// from exactly the excerpts the human labeller saw.
import { VERIFIED, type Verdict } from './agent.js';
import { checkQuote, normalisedPages } from './citations.js';
import type { EvalItem } from './evalset.js';
import { callModel, parseJson, type Provider } from './providers.js';

export const JUDGE_PROMPT_VERSION = 'judge-v0.1';

export interface JudgeVerdict {
  itemId: string;
  status: Verdict;
  effective: Verdict;
  quoteStatus: string;
}

export async function judgeVendor(opts: {
  provider: Provider;
  model?: string;
  items: EvalItem[]; // all items for one vendor
  pages: { url: string; text: string }[]; // full pages, for quote checking
  maxAttempts?: number;
}) {
  const system = `You are a careful B2B software analyst. For each requirement, judge ONLY from the excerpts listed under it.
- "met": an excerpt clearly shows the vendor offers it.
- "not_met": an excerpt clearly shows the vendor does not offer it.
- "unclear": the excerpts do not settle it.
For "met" or "not_met", give "quote": one continuous excerpt (8-40 words) copied exactly, and its "url". Otherwise quote null.
Reply with JSON only: {"verdicts":[{"id":string,"status":"met"|"not_met"|"unclear","quote":string|null,"url":string|null}]}`;
  const user = opts.items
    .map(
      (it) =>
        `### ${it.reqId}: ${it.reqText}\n` +
        (it.passages.length ? it.passages.map((p) => `[${p.url}]\n${p.text}`).join('\n…\n') : '(no excerpts)'),
    )
    .join('\n\n');
  const res = await callModel({ provider: opts.provider, model: opts.model, system, user: `VENDOR: ${opts.items[0].vendor}\n\n${user}` }, opts.maxAttempts);
  const raw = parseJson<{ verdicts: { id: string; status: Verdict; quote: string | null; url: string | null }[] }>(res.text);
  const norm = normalisedPages(opts.pages);
  const verdicts: JudgeVerdict[] = opts.items.map((it) => {
    const v = raw.verdicts?.find((x) => x.id === it.reqId);
    const status: Verdict = v && ['met', 'not_met', 'unclear'].includes(v.status) ? v.status : 'unclear';
    const c = checkQuote(v?.quote, v?.url, norm);
    const ok = VERIFIED.has(c.status);
    return { itemId: it.id, status, effective: status !== 'unclear' && !ok ? 'unclear' : status, quoteStatus: c.status };
  });
  return {
    model: res.model,
    modelVersion: res.modelVersion,
    verdicts,
    trace: { inputTokens: res.inputTokens, outputTokens: res.outputTokens, latencyMs: res.latencyMs, attempts: res.attempts },
  };
}
