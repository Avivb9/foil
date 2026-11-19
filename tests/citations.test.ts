import { describe, expect, it } from 'vitest';
import { checkQuote, normalise, normalisedPages } from '../api/_lib/citations';
import { htmlToText } from '../api/_lib/extract';

const pages = normalisedPages([
  { url: 'https://a.com/pricing', text: 'Pricing\nFree up to 1 million events — then usage‑based pricing.\nEU hosting available.' },
  { url: 'https://a.com/product', text: 'Build funnels and retention charts in seconds, no SQL needed.' },
]);

describe('normalise', () => {
  it('unifies quotes, dashes and whitespace', () => {
    expect(normalise('  “Usage‑based”  pricing — ok. ')).toBe('usage-based pricing - ok');
  });
});

describe('checkQuote', () => {
  it('verifies an exact quote on the cited page', () => {
    expect(checkQuote('Free up to 1 million events', 'https://a.com/pricing', pages).status).toBe('verified');
  });
  it('tolerates typography differences', () => {
    expect(checkQuote('free up to 1 million events - then usage-based pricing', null, pages).status).toBe('verified');
  });
  it('re-attributes a real quote cited to the wrong page', () => {
    const c = checkQuote('Build funnels and retention charts in seconds', 'https://a.com/pricing', pages);
    expect(c.status).toBe('verified');
    expect(c.url).toBe('https://a.com/product');
  });
  it('rejects a paraphrase', () => {
    expect(checkQuote('Funnels and retention without writing SQL', null, pages).status).toBe('not_found');
  });
  it('rejects a quote too short to be meaningful', () => {
    expect(checkQuote('EU hosting', null, pages).status).toBe('too_short');
  });
  it('flags missing quotes', () => {
    expect(checkQuote(null, null, pages).status).toBe('missing');
  });
});

describe('htmlToText', () => {
  it('drops scripts and keeps block structure', () => {
    const t = htmlToText(
      '<html><head><title>X &amp; Y</title></head><body><script>var a=1</script><h1>Hello</h1><p>World&nbsp;wide</p><p>World&nbsp;wide</p></body></html>',
    );
    expect(t).toContain('TITLE: X & Y');
    expect(t).toContain('Hello\nWorld wide');
    expect(t).not.toContain('var a');
    expect(t.match(/World wide/g)?.length).toBe(1);
  });
});
