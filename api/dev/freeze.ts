// GET /api/dev/freeze — snapshot the demo vendors once and store the frozen copy.
// Every experiment then runs against this exact text (a controlled experiment).
import { createHash } from 'node:crypto';
import { DEMO_BRIEF, DEMO_VENDORS } from '../_lib/demo-deal.js';
import { devOnly } from '../_lib/guard.js';
import { snapshotPage } from '../_lib/snapshot.js';
import { saveSnapshot } from '../_lib/store.js';

export const config = { maxDuration: 60 };

export async function GET(): Promise<Response> {
  const blocked = devOnly();
  if (blocked) return blocked;
  const vendors = await Promise.all(
    DEMO_VENDORS.map(async (v) => ({ name: v.name, pages: await Promise.all(v.urls.map(snapshotPage)) })),
  );
  const fingerprint = createHash('sha256')
    .update(vendors.flatMap((v) => v.pages.map((p) => p.sha256)).join(''))
    .digest('hex')
    .slice(0, 10);
  const id = `${DEMO_BRIEF.id}@${new Date().toISOString().slice(0, 10)}-${fingerprint}`;
  await saveSnapshot({ id, dealId: DEMO_BRIEF.id, createdAt: new Date().toISOString(), vendors });
  return Response.json({
    id,
    pages: vendors.flatMap((v) => v.pages.map((p) => ({ vendor: v.name, url: p.url, status: p.status, chars: p.chars, truncated: p.truncated }))),
  });
}
