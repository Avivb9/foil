import { BUZZWORDS } from '../data/lexicon';

export interface Match {
  term: string;
  index: number;
  length: number;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buzzRegex = new RegExp(
  `(?<![a-z0-9])(${[...BUZZWORDS]
    .sort((a, b) => b.length - a.length)
    .map((t) => escape(t).replace(/-/g, '[-\\s]?'))
    .join('|')})s?(?![a-z0-9-])`,
  'gi',
);

/** Finds buzzwords with their positions. Hyphenated terms also match "AI powered". */
export function findBuzzwords(text: string): Match[] {
  const out: Match[] = [];
  if (!text) return out;
  buzzRegex.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = buzzRegex.exec(text))) {
    out.push({ term: canonicalBuzz(m[0]), index: m.index, length: m[0].length });
  }
  return out;
}

function canonicalBuzz(raw: string): string {
  const low = raw.toLowerCase().replace(/\s+/g, '-');
  const hit = BUZZWORDS.find((b) => low === b || low === `${b}s` || low.replace(/-/g, '') === b.replace(/-/g, ''));
  return hit ?? low;
}

export function uniqueBuzzwords(text: string): string[] {
  return [...new Set(findBuzzwords(text).map((m) => m.term))];
}

export const PLACEHOLDER_RE = /\[[^\]]{1,80}\]/g;

export function countPlaceholders(text: string): number {
  return (text.match(PLACEHOLDER_RE) || []).length;
}

export function stripPlaceholders(text: string): string {
  return text.replace(PLACEHOLDER_RE, ' ').replace(/\s+/g, ' ').trim();
}

export function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9%$#+.\-\s']/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/^[.'-]+|[.'-]+$/g, ''))
    .filter(Boolean);
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** Case-insensitive token check; multi-word or symbol tokens use substring match. */
export function containsToken(text: string, token: string): boolean {
  const low = ` ${text.toLowerCase()} `;
  if (/[^a-z0-9]/.test(token.trim()) || token.startsWith(' ') || token.endsWith(' ')) {
    return low.includes(token.toLowerCase());
  }
  return new RegExp(`(?<![a-z0-9])${escape(token)}(?![a-z0-9])`, 'i').test(low);
}

export function matchedTokens(text: string, tokens: readonly string[]): string[] {
  return tokens.filter((t) => containsToken(text, t));
}

export const hasNumber = (text: string) => /\d/.test(stripPlaceholders(text));

export const QUANT_RE =
  /(\d[\d.,]*\s*(%|x\b|×|percent|pts|points|minutes?|mins?|hours?|hrs?|days?|weeks?|months?|seconds?)|\$\s?\d|from\s+\$?\d[\d.,]*\s*\w*\s+to\s+\$?\d)/i;

export const STOPWORDS = new Set(
  'a an the and or of to for in on with by via at from your our their its it is are be that this who which as than into over more less all any each every we you they them us not no but so if then while when'.split(
    ' ',
  ),
);

export function contentWords(text: string): string[] {
  return words(stripPlaceholders(text)).filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Deterministic string hash, used to choose between phrasings stably. */
export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function pick<T>(arr: T[], seed: string): T {
  return arr[hash(seed) % arr.length];
}

/** Pulls a short, quotable phrase from the user's text, centred on the first buzzword if any. */
export function quotePhrase(text: string, maxWords = 9, focus?: string[]): string {
  const clean = text.trim().replace(/\s+/g, ' ').replace(/[.]+$/, '');
  if (!clean) return '';
  const tokens = clean.split(' ');
  if (tokens.length <= maxWords) return clean;
  let center = -1;
  const lowTokens = tokens.map((t) => t.toLowerCase());
  const targets = focus && focus.length ? focus : findBuzzwords(clean).map((m) => m.term);
  for (const t of targets) {
    const first = t.toLowerCase().split(/[-\s]/)[0];
    const idx = lowTokens.findIndex((w) => w.includes(first));
    if (idx >= 0) {
      center = idx;
      break;
    }
  }
  if (center < 0) return `${tokens.slice(0, maxWords).join(' ').replace(/[,;:]$/, '')}…`;
  const start = Math.max(0, Math.min(center - Math.floor(maxWords / 3), tokens.length - maxWords));
  const slice = tokens.slice(start, start + maxWords).join(' ').replace(/[,;:]$/, '');
  return `${start > 0 ? '…' : ''}${slice}${start + maxWords < tokens.length ? '…' : ''}`;
}

export function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

export function lcFirst(s: string) {
  if (!s) return s;
  // keep acronyms / proper nouns (two leading capitals, or known product-ish words)
  if (/^[A-Z]{2,}/.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function ucFirst(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function trimEnd(s: string) {
  return s.trim().replace(/[\s.;,]+$/, '');
}
