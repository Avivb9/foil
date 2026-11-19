// GET /api/dev/variant?id=posthog-proof-v1 — builds and stores a counterfactual snapshot
// (base snapshot + one page edit). Returns the new snapshot id.
import type { Vendor } from '../_lib/agent.js';
import { DEMO_SNAPSHOT_ID } from '../_lib/demo-deal.js';
import { devOnly } from '../_lib/guard.js';
import { getSnapshot, saveSnapshot } from '../_lib/store.js';
import { applyVariant, VARIANTS } from '../_lib/variants.js';

export async function GET(request: Request): Promise<Response> {
  const blocked = devOnly();
  if (blocked) return blocked;
  const id = new URL(request.url).searchParams.get('id');
  const v = VARIANTS.find((x) => x.id === id);
  if (!v) return Response.json({ error: 'unknown variant', known: VARIANTS.map((x) => x.id) }, { status: 400 });
  const base = await getSnapshot<{ id: string; dealId: string; vendors: Vendor[] }>(DEMO_SNAPSHOT_ID);
  if (!base) return Response.json({ error: 'base snapshot not found' }, { status: 404 });
  const variant = applyVariant({ ...base, id: DEMO_SNAPSHOT_ID }, v);
  await saveSnapshot({ ...variant, createdAt: new Date().toISOString() });
  const changed = variant.vendors.flatMap((vd) => vd.pages.map((p) => ({ vendor: vd.name, url: p.url, sha: p.sha256.slice(0, 10) })));
  return Response.json({ id: variant.id, variant: v.id, rationale: v.rationale, pages: changed });
}
