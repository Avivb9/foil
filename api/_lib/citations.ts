// Deterministic citation check. No LLM involved: a quote counts only if it
// appears in the snapshot text after normalisation (case, whitespace, curly
// quotes, dashes). This is what lets Foil drop invented reasons.

export function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’‛′`]/g, "'")
    .replace(/["“”„″]/g, '')
    .replace(/[‐‑‒–—―−]/g, '-')
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["'\s.,;:!?-]+|["'\s.,;:!?-]+$/g, '');
}

export type CitationStatus = 'verified' | 'not_found' | 'too_short' | 'missing';

export interface CitationCheck {
  status: CitationStatus;
  quote: string | null;
  url: string | null;
}

export const MIN_QUOTE_CHARS = 12;

/**
 * pages: url -> normalised page text (pre-normalise once per snapshot).
 * If url is given we check that page first, then any page of the same vendor
 * (agents sometimes attribute a real quote to the wrong page; we record the
 * true url instead of rejecting a real quote).
 */
export function checkQuote(
  quote: string | null | undefined,
  url: string | null | undefined,
  pages: Map<string, string>,
): CitationCheck {
  if (!quote || !quote.trim()) return { status: 'missing', quote: null, url: url ?? null };
  const q = normalise(quote);
  if (q.length < MIN_QUOTE_CHARS) return { status: 'too_short', quote, url: url ?? null };
  if (url && pages.get(url)?.includes(q)) return { status: 'verified', quote, url };
  for (const [u, text] of pages) if (text.includes(q)) return { status: 'verified', quote, url: u };
  return { status: 'not_found', quote, url: url ?? null };
}

export function normalisedPages(pages: { url: string; text: string }[]): Map<string, string> {
  return new Map(pages.map((p) => [p.url, normalise(p.text)]));
}
