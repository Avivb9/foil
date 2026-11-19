// GET /api/dev/judge?provider=gemini|groq&repeats=3&model=...
// Runs the neutral judge on every eval item (one call per vendor per repeat) and stores results.
import type { Vendor } from '../_lib/agent.js';
import { DEMO_SNAPSHOT_ID } from '../_lib/demo-deal.js';
import { buildEvalItems } from '../_lib/evalset.js';
import { devOnly } from '../_lib/guard.js';
import { JUDGE_PROMPT_VERSION, judgeVendor } from '../_lib/judge.js';
import type { Provider } from '../_lib/providers.js';
import { getSnapshot, saveRun } from '../_lib/store.js';

export const config = { maxDuration: 300 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(request: Request): Promise<Response> {
  const blocked = devOnly();
  if (blocked) return blocked;
  const q = new URL(request.url).searchParams;
  const provider = (q.get('provider') as Provider) || 'gemini';
  const repeats = Math.min(Number(q.get('repeats') || 1), 5);
  const model = q.get('model') || undefined;
  const experiment = q.get('experiment') || 'judge-v1';
  const snap = await getSnapshot<{ vendors: Vendor[] }>(DEMO_SNAPSHOT_ID);
  if (!snap) return Response.json({ error: 'snapshot not found' }, { status: 404 });
  const items = buildEvalItems(snap.vendors);
  const gap = provider === 'groq' ? 30_000 : 5_000;
  const t0 = Date.now();
  const done: unknown[] = [];
  const errors: string[] = [];

  outer: for (let r = 0; r < repeats; r++) {
    for (const v of snap.vendors) {
      if (Date.now() - t0 > 240_000) break outer;
      const s = Date.now();
      try {
        const res = await judgeVendor({
          provider,
          model,
          items: items.filter((i) => i.vendor === v.name),
          pages: v.pages.filter((p) => p.text),
          maxAttempts: 3,
        });
        const saved = await saveRun({
          experiment,
          dealId: 'eval',
          snapshotId: DEMO_SNAPSHOT_ID,
          provider,
          promptVersion: JUDGE_PROMPT_VERSION,
          outcome: null,
          vendor: v.name,
          ...res,
        });
        done.push({ id: saved.id, vendor: v.name, verdicts: res.verdicts.map((x) => `${x.itemId}=${x.effective}`).join(' ') });
      } catch (e) {
        const pe = e as Error & { body?: string };
        errors.push(`${v.name}: ${pe.message}${pe.body ? ' ' + pe.body.slice(0, 200) : ''}`);
        break outer;
      }
      const wait = gap - (Date.now() - s);
      if (wait > 0) await sleep(wait);
    }
  }
  return Response.json({ provider, experiment, completed: done.length, elapsedMs: Date.now() - t0, done, errors });
}
