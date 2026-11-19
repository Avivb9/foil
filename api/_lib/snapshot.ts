import { createHash } from 'node:crypto';
import { htmlToText } from './extract.js';

export interface PageSnapshot {
  url: string;
  status: number;
  fetchedAt: string;
  sha256: string;
  chars: number;
  text: string;
  /** true when the extracted page was longer than the cap and got cut */
  truncated: boolean;
  fullChars: number;
  error?: string;
}

const MAX_HTML_BYTES = 3_000_000;
export const MAX_PAGE_CHARS = Number(process.env.FOIL_MAX_PAGE_CHARS || 14000);

function assertPublicUrl(raw: string): URL {
  const u = new URL(raw);
  if (!/^https?:$/.test(u.protocol)) throw new Error('only http(s) URLs');
  const h = u.hostname.toLowerCase();
  // basic SSRF guard: no localhost, no raw IPs, no internal suffixes
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || /^[\d.]+$/.test(h) || h.includes(':'))
    throw new Error('host not allowed');
  return u;
}

export async function snapshotPage(raw: string): Promise<PageSnapshot> {
  const fetchedAt = new Date().toISOString();
  try {
    const url = assertPublicUrl(raw);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12_000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'FoilBot/0.1 (+https://github.com/Avivb9/foil; positioning research)',
        accept: 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timer);
    const buf = await res.arrayBuffer();
    const html = new TextDecoder().decode(buf.slice(0, MAX_HTML_BYTES));
    const full = htmlToText(html);
    const text = full.slice(0, MAX_PAGE_CHARS);
    return {
      url: raw,
      status: res.status,
      fetchedAt,
      sha256: createHash('sha256').update(text).digest('hex'),
      chars: text.length,
      text,
      truncated: full.length > MAX_PAGE_CHARS,
      fullChars: full.length,
      ...(res.ok ? {} : { error: `HTTP ${res.status}` }),
    };
  } catch (e) {
    return { url: raw, status: 0, fetchedAt, sha256: '', chars: 0, text: '', truncated: false, fullChars: 0, error: (e as Error).message };
  }
}
