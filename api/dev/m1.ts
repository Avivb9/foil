// GET /api/dev/m1?provider=gemini|groq&role=economic_buyer&model=...
// M1 end-to-end: snapshot demo vendor pages -> one committee agent -> deterministic citation check.
import { ROLES, runAgent, type RoleKey, type Vendor } from '../_lib/agent.js';
import { DEMO_BRIEF, DEMO_VENDORS } from '../_lib/demo-deal.js';
import { devOnly } from '../_lib/guard.js';
import { ProviderError, type Provider } from '../_lib/providers.js';
import { snapshotPage } from '../_lib/snapshot.js';

export const config = { maxDuration: 300 };

export async function GET(request: Request): Promise<Response> {
  const blocked = devOnly();
  if (blocked) return blocked;

  const q = new URL(request.url).searchParams;
  const provider = (q.get('provider') as Provider) || 'gemini';
  const role = (q.get('role') as RoleKey) || 'economic_buyer';
  if (!(role in ROLES)) return Response.json({ error: 'unknown role' }, { status: 400 });

  const t0 = Date.now();
  const vendors: Vendor[] = await Promise.all(
    DEMO_VENDORS.map(async (v) => ({ name: v.name, pages: await Promise.all(v.urls.map(snapshotPage)) })),
  );
  const snapshotMs = Date.now() - t0;
  const snapshotSummary = vendors.flatMap((v) =>
    v.pages.map((p) => ({ vendor: v.name, url: p.url, status: p.status, chars: p.chars, fullChars: p.fullChars, truncated: p.truncated, sha256: p.sha256.slice(0, 12), error: p.error })),
  );
  if (q.get('snapshotOnly')) return Response.json({ snapshotMs, snapshotSummary, sample: vendors[0].pages[0].text.slice(0, 1500) });

  try {
    const run = await runAgent({ role, brief: DEMO_BRIEF, vendors, provider, model: q.get('model') || undefined });
    return Response.json({ snapshotMs, snapshotSummary, run });
  } catch (e) {
    const pe = e as ProviderError;
    return Response.json(
      { snapshotMs, snapshotSummary, error: pe.message, status: pe.status, body: pe.body?.slice(0, 1500) },
      { status: 502 },
    );
  }
}
