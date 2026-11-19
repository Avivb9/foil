// GET /api/dev/arm — hands the Vercel automation bypass (set by the owner as
// FOIL_BYPASS) to the scheduler's config table, so the database scheduler can
// reach protected preview deployments. Never echoes the value.
import { devOnly } from '../_lib/guard.js';
import { saveBypass } from '../_lib/store.js';

export async function GET(): Promise<Response> {
  const blocked = devOnly();
  if (blocked) return blocked;
  const v = process.env.FOIL_BYPASS;
  if (!v) return Response.json({ ok: false, error: 'FOIL_BYPASS not set' }, { status: 500 });
  await saveBypass(v);
  return Response.json({ ok: true, stored: true, length: v.length });
}
