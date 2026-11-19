// GET /api/dev/batch?snapshot=ID&provider=gemini|groq&n=10&experiment=baseline&model=...
// Runs up to n full committee runs against a frozen snapshot, within this
// function's time budget, pacing calls to stay inside free-tier limits.
// Each run is stored; the response is a compact summary.
import { ROLE_KEYS, runAgent, type AgentRun, type Vendor } from '../_lib/agent.js';
import { decide } from '../_lib/committee.js';
import { DEMO_BRIEF } from '../_lib/demo-deal.js';
import { devOnly } from '../_lib/guard.js';
import type { Provider } from '../_lib/providers.js';
import { countRuns, getSnapshot, saveRun } from '../_lib/store.js';

export const config = { maxDuration: 300 };

const BUDGET_MS = 250_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Free-tier pacing. Gemini 3.5 Flash Lite: 15 RPM -> 5 parallel calls per 22s.
// Groq gpt-oss-120b: 8K tokens/minute -> one call roughly every 30s.
const PACING: Record<Provider, { parallel: boolean; gapMs: number }> = {
  gemini: { parallel: true, gapMs: 22_000 },
  groq: { parallel: false, gapMs: 30_000 },
};

export async function GET(request: Request): Promise<Response> {
  const blocked = devOnly();
  if (blocked) return blocked;
  const q = new URL(request.url).searchParams;
  const snapshotId = q.get('snapshot');
  const provider = (q.get('provider') as Provider) || 'gemini';
  const n = Math.min(Number(q.get('n') || 5), 20);
  const experiment = q.get('experiment') || 'baseline';
  const model = q.get('model') || undefined;
  const charsPerVendor = Number(q.get('chars') || 2800);
  if (!snapshotId) return Response.json({ error: 'snapshot required' }, { status: 400 });

  // Scheduled mode (?target=N): top the experiment up to N runs, then no-op.
  // Requires the ingest key, so a scheduler can call it without a person present.
  const target = q.get('target') ? Number(q.get('target')) : null;
  let n2 = n;
  if (target !== null) {
    if (request.headers.get('x-foil-key') !== process.env.FOIL_INGEST_SECRET) {
      return Response.json({ error: 'forbidden' }, { status: 403 });
    }
    const have = await countRuns(experiment, provider);
    if (have >= target) return Response.json({ experiment, provider, done: true, have, target });
    n2 = Math.min(n, target - have);
  }

  const snap = await getSnapshot<{ id: string; vendors: Vendor[] }>(snapshotId);
  if (!snap) return Response.json({ error: 'snapshot not found' }, { status: 404 });

  const t0 = Date.now();
  const summary: unknown[] = [];
  const errors: string[] = [];
  // Scheduled runs are gentle: agents one at a time, at most 2 tries each, so an
  // overloaded API costs a couple of requests, not thirty. The next tick retries.
  const gentle = target !== null;
  const pace = gentle ? { parallel: false, gapMs: provider === 'groq' ? 30_000 : 5_000 } : PACING[provider];
  const maxAttempts = gentle ? 2 : undefined;

  for (let i = 0; i < n2; i++) {
    // estimate whether another full run fits in the budget
    const perRun = pace.parallel ? pace.gapMs : Math.max(pace.gapMs, 12_000) * ROLE_KEYS.length;
    if (Date.now() - t0 + perRun > BUDGET_MS) break;

    const runStart = Date.now();
    let agents: AgentRun[] = [];
    try {
      const one = (role: (typeof ROLE_KEYS)[number]) =>
        runAgent({ role, brief: DEMO_BRIEF, vendors: snap.vendors, provider, model, charsPerVendor, maxAttempts });
      if (pace.parallel) {
        // stagger starts so five calls do not hit the API in the same instant
        agents = await Promise.all(ROLE_KEYS.map((role, k) => sleep(k * 1500).then(() => one(role))));
      } else {
        for (const role of ROLE_KEYS) {
          const s = Date.now();
          agents.push(await one(role));
          const wait = pace.gapMs - (Date.now() - s);
          if (wait > 0 && role !== ROLE_KEYS[ROLE_KEYS.length - 1]) await sleep(wait);
        }
      }
    } catch (e) {
      const pe = e as Error & { body?: string };
      errors.push(`${pe.message}${pe.body ? ': ' + pe.body.slice(0, 300) : ''}`);
      break; // stop the batch on hard errors; partial committees are not stored
    }

    const outcome = decide(agents, DEMO_BRIEF);
    const record = {
      experiment,
      dealId: DEMO_BRIEF.id,
      snapshotId,
      provider,
      model: agents[0].model,
      promptVersion: agents[0].promptVersion,
      charsPerVendor,
      outcome,
      agents,
    };
    const saved = await saveRun(record);
    summary.push({
      id: saved.id,
      outcome: outcome.result === 'win' ? outcome.vendor : `no_decision:${outcome.why}`,
      votes: outcome.votes,
      blockers: outcome.blockers.length,
      contradictions: outcome.contradictions.length,
      tokens: agents.reduce((a, r) => a + (r.trace.inputTokens ?? 0) + (r.trace.outputTokens ?? 0), 0),
      quotes: agents.reduce(
        (a, r) => ({ checked: a.checked + r.citationStats.checked, verified: a.verified + r.citationStats.verified, downgraded: a.downgraded + r.citationStats.downgraded }),
        { checked: 0, verified: 0, downgraded: 0 },
      ),
      ms: Date.now() - runStart,
    });

    if (pace.parallel && i < n2 - 1) {
      const wait = pace.gapMs - (Date.now() - runStart);
      if (wait > 0) await sleep(wait);
    } else if (!pace.parallel && i < n2 - 1) {
      await sleep(pace.gapMs);
    }
  }

  return Response.json({ experiment, provider, completed: summary.length, requested: n, elapsedMs: Date.now() - t0, runs: summary, errors });
}
