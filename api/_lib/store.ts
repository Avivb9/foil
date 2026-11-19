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
export const countRuns = (experiment: string, provider: string) =>
  rpc<number>('foil_count_runs', { p_experiment: experiment, p_provider: provider });
export const saveBypass = (value: string) => rpc<{ ok: boolean }>('foil_ingest', { kind: 'config', body: { key: 'vercel_bypass', value } });
export const saveLabel = (item: string, label: string, note: string | null) =>
  rpc<{ ok: boolean }>('foil_label', { p_item: item, p_label: label, p_note: note });
export const getLabels = () => rpc<Record<string, { label: string; note: string | null }>>('foil_get_labels', {});
