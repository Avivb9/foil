// POST /api/dev/labels {itemId, label, note?} — saves one human label.
import { devOnly } from '../_lib/guard.js';
import { saveLabel } from '../_lib/store.js';

const OK = new Set(['met', 'not_met', 'unclear']);

export async function POST(request: Request): Promise<Response> {
  const blocked = devOnly();
  if (blocked) return blocked;
  const body = (await request.json().catch(() => null)) as { itemId?: string; label?: string; note?: string } | null;
  if (!body?.itemId || !body.label || !OK.has(body.label) || body.itemId.length > 80) {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }
  await saveLabel(body.itemId, body.label, body.note?.slice(0, 500) || null);
  return Response.json({ ok: true });
}
