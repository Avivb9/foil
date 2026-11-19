// Working storage: a locked-down schema in Supabase. The only way in is two
// SECURITY DEFINER functions that check a shared secret, so the publishable
// key alone cannot read or write anything.

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const url = process.env.FOIL_SUPABASE_URL;
  const key = process.env.FOIL_SUPABASE_KEY;
  const secret = process.env.FOIL_INGEST_SECRET;
  if (!url || !key || !secret) throw new Error('storage not configured');
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ secret, ...args }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`storage ${fn} ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text) as T;
}

export const saveSnapshot = (body: unknown) => rpc<{ ok: boolean; id: string }>('foil_ingest', { kind: 'snapshot', body });
export const saveRun = (body: unknown) => rpc<{ ok: boolean; id: number }>('foil_ingest', { kind: 'run', body });
export const getSnapshot = <T>(snapshotId: string) => rpc<T | null>('foil_get_snapshot', { snapshot_id: snapshotId });
