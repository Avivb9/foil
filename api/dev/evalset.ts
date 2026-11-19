// GET /api/dev/evalset            -> items with evidence + saved labels (for the labelling page)
// GET /api/dev/evalset?compact=1  -> ids, keyword-baseline verdicts and labels only (for the report)
import type { Vendor } from '../_lib/agent.js';
import { DEMO_SNAPSHOT_ID } from '../_lib/demo-deal.js';
import { buildEvalItems, EVAL_REQUIREMENTS, keywordVerdict } from '../_lib/evalset.js';
import { devOnly } from '../_lib/guard.js';
import { getLabels, getSnapshot } from '../_lib/store.js';

export async function GET(request: Request): Promise<Response> {
  const blocked = devOnly();
  if (blocked) return blocked;
  const snap = await getSnapshot<{ vendors: Vendor[] }>(DEMO_SNAPSHOT_ID);
  if (!snap) return Response.json({ error: 'snapshot not found' }, { status: 404 });
  const items = buildEvalItems(snap.vendors);
  const labels = await getLabels();
  if (new URL(request.url).searchParams.get('compact')) {
    return Response.json({
      snapshot: DEMO_SNAPSHOT_ID,
      requirements: EVAL_REQUIREMENTS.map((r) => ({ id: r.id, text: r.text })),
      items: items.map((i) => ({ id: i.id, vendor: i.vendor, reqId: i.reqId, evidenceChars: i.passages.reduce((a, p) => a + p.text.length, 0), baseline: keywordVerdict(i) })),
      labels,
    });
  }
  return Response.json({ snapshot: DEMO_SNAPSHOT_ID, items, labels });
}
