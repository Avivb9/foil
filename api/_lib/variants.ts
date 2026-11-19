// Counterfactual page variants. Each variant is a small, reviewable edit to
// ONE vendor's frozen page text; everything else in the snapshot stays
// byte-identical, so a re-run isolates the effect of the edit.
//
// These are hypothetical rewrites written to test messaging, not the vendor's
// real copy. Demo pages label them that way.
import { createHash } from 'node:crypto';
import type { Vendor } from './agent.js';

export interface Variant {
  id: string;
  vendor: string;
  url: string;
  /** inserted right after the page's TITLE/DESCRIPTION header lines */
  insert: string;
  rationale: string;
}

export const VARIANTS: Variant[] = [
  {
    id: 'posthog-proof-v1',
    vendor: 'PostHog',
    url: 'https://posthog.com/pricing',
    rationale:
      'Baseline blockers for PostHog were the warehouse requirement (technical evaluator) and predictable pricing (procurement). This adds one proof block for each, nothing else.',
    insert: [
      'Works with your data warehouse',
      'Keep Snowflake as your source of truth. Connect Snowflake, BigQuery or Redshift and query those tables next to your product events, and export PostHog events back to Snowflake on a schedule, so your data team models everything in one place.',
      'Pricing you can predict',
      'Set a hard monthly spending cap for each product. When you reach it we stop billing, not your dashboards, so your invoice never exceeds the cap you set. Use the calculator to see your exact monthly price at your event volume before you sign up.',
    ].join('\n'),
  },
];

export function applyVariant<T extends { id: string; vendors: Vendor[] }>(snap: T, v: Variant): T & { variant: string; baseSnapshot: string } {
  let applied = false;
  const vendors = snap.vendors.map((vendor) =>
    vendor.name !== v.vendor
      ? vendor
      : {
          ...vendor,
          pages: vendor.pages.map((p) => {
            if (p.url !== v.url) return p;
            applied = true;
            const lines = p.text.split('\n');
            const headerEnd = lines.findIndex((l) => !/^(TITLE|DESCRIPTION):/.test(l));
            const at = headerEnd === -1 ? lines.length : headerEnd;
            const text = [...lines.slice(0, at), v.insert, ...lines.slice(at)].join('\n');
            return { ...p, text, chars: text.length, sha256: createHash('sha256').update(text).digest('hex') };
          }),
        },
  );
  if (!applied) throw new Error(`variant ${v.id}: page ${v.url} not found for ${v.vendor}`);
  return { ...snap, id: `${snap.id}~${v.id}`, vendors, variant: v.id, baseSnapshot: snap.id };
}
