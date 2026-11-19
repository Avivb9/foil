import type { DealBrief } from './agent';

// Demo deal built only from public vendor pages. Illustrative, not an endorsement.
export const DEMO_BRIEF: DealBrief = {
  id: 'product-analytics-eu-series-b',
  buyer: 'Series B B2B SaaS company, ~120 employees, HQ in Berlin, customers mostly in the EU',
  need: 'Product analytics so PMs can answer funnel and retention questions without filing data tickets',
  stack: ['React web app', 'Segment', 'Snowflake', 'dbt'],
  budget: 'Roughly $30k-$60k per year; finance wants predictable cost',
  mustHaves: [
    'EU data hosting',
    'Self-serve funnels and retention for non-technical PMs',
    'Works with the warehouse (Snowflake) rather than creating a second source of truth',
  ],
  dealBreakers: ['No EU hosting option', 'Pricing that scales unpredictably with event volume or seats'],
  statusQuo: 'Keep using SQL dashboards in the BI tool, maintained by one overloaded data analyst',
};

export const DEMO_VENDORS: { name: string; urls: string[] }[] = [
  { name: 'PostHog', urls: ['https://posthog.com/product-analytics', 'https://posthog.com/pricing'] },
  { name: 'Mixpanel', urls: ['https://mixpanel.com/', 'https://mixpanel.com/pricing/'] },
  { name: 'Amplitude', urls: ['https://amplitude.com/amplitude-analytics', 'https://amplitude.com/pricing'] },
];
