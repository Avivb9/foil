// HTML -> readable text, deterministic and dependency-free.
// Good enough for marketing pages: drops scripts, styles, nav chrome and SVG,
// keeps headings, paragraphs, list items and table cells as separate lines.

const DROP_BLOCKS = /<(script|style|noscript|svg|iframe|template|head)\b[\s\S]*?<\/\1>/gi;
const BLOCK_TAGS =
  /<\/?(p|div|section|article|header|footer|main|aside|li|ul|ol|h[1-6]|tr|td|th|table|br|hr|blockquote|figcaption|dt|dd|summary|details|button|a)\b[^>]*>/gi;

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&mdash;': '—',
  '&ndash;': '–',
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&rdquo;': '”',
  '&ldquo;': '“',
  '&hellip;': '…',
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

export function htmlToText(html: string): string {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const metaDesc = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1];
  let s = html.replace(/<!--[\s\S]*?-->/g, ' ').replace(DROP_BLOCKS, ' ');
  s = s.replace(BLOCK_TAGS, '\n').replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s);
  const lines = s
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter((l) => l.length > 1);
  // collapse consecutive duplicates (menus repeated for mobile/desktop)
  const out: string[] = [];
  for (const l of lines) if (out[out.length - 1] !== l) out.push(l);
  const head = [title && `TITLE: ${decodeEntities(title)}`, metaDesc && `DESCRIPTION: ${decodeEntities(metaDesc)}`]
    .filter(Boolean)
    .join('\n');
  return (head ? head + '\n' : '') + out.join('\n');
}
