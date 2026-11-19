import { describe, expect, it } from 'vitest';
import { applyVariant, VARIANTS } from '../api/_lib/variants';

const page = (url: string, text: string) => ({ url, status: 200, fetchedAt: '', sha256: 'x', chars: text.length, text, truncated: false, fullChars: text.length });

describe('applyVariant', () => {
  const snap = {
    id: 'base',
    vendors: [
      { name: 'PostHog', pages: [page('https://posthog.com/pricing', 'TITLE: Pricing\nDESCRIPTION: d\nLine one'), page('https://posthog.com/product-analytics', 'P')] },
      { name: 'Mixpanel', pages: [page('https://mixpanel.com/', 'M')] },
    ],
  };
  const v = VARIANTS[0];
  const out = applyVariant(snap, v);
  it('inserts the block after the header on the target page only', () => {
    const t = out.vendors[0].pages[0].text.split('\n');
    expect(t[0]).toBe('TITLE: Pricing');
    expect(t[1]).toBe('DESCRIPTION: d');
    expect(t[2]).toBe(v.insert.split('\n')[0]);
    expect(t[t.length - 1]).toBe('Line one');
  });
  it('leaves every other page untouched', () => {
    expect(out.vendors[0].pages[1]).toBe(snap.vendors[0].pages[1]);
    expect(out.vendors[1]).toBe(snap.vendors[1]);
  });
  it('gives the variant its own id and records the base', () => {
    expect(out.id).toBe('base~posthog-proof-v1');
    expect(out.baseSnapshot).toBe('base');
  });
});
