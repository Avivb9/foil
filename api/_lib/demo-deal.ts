import type { DealBrief } from './agent.js';

// Demo deal built only from public vendor pages. Illustrative, not an endorsement.
// Each requirement has an owner: the committee member for whom "unclear" is not good enough.
export const DEMO_BRIEF: DealBrief = {
  id: 'product-analytics-eu-series-b',
  buyer: 'Series B B2B SaaS company, ~120 employees, HQ in Berlin, customers mostly in the EU',
  need: 'Product analytics so PMs can answer funnel and retention questions without filing data tickets',
  stack: ['React web app', 'Segment', 'Snowflake', 'dbt'],
  budget: 'Roughly $30k-$60k per year; finance wants predictable cost',
  statusQuo: 'Keep using SQL dashboards in the BI tool, maintained by one overloaded data analyst',
  requirements: [
    {
      id: 'M1',
      kind: 'must_have',
      text: 'EU data hosting',
      owner: 'security_legal',
      terms: ['eu', 'europe', 'european', 'frankfurt', 'data residency', 'data center', 'gdpr', 'region', 'hosting'],
    },
    {
      id: 'M2',
      kind: 'must_have',
      text: 'Self-serve funnels and retention for non-technical PMs',
      owner: 'champion',
      terms: ['funnels', 'retention', 'self-serve', 'no sql', 'product managers', 'without coding', 'dashboards'],
    },
    {
      id: 'M3',
      kind: 'must_have',
      text: 'Works with the Snowflake warehouse rather than creating a second source of truth',
      owner: 'technical_evaluator',
      terms: ['warehouse', 'snowflake', 'warehouse-native', 'data warehouse', 'reverse etl', 'sync', 'connectors', 'source of truth'],
    },
    {
      id: 'D1',
      kind: 'deal_breaker',
      text: 'Pricing that scales unpredictably with event volume or seats',
      owner: 'procurement',
      terms: ['pricing', 'per event', 'events', 'seats', 'billing limits', 'volume', 'annual', 'usage-based', 'predictable', 'surprise'],
    },
  ],
};

export const DEMO_VENDORS: { name: string; urls: string[] }[] = [
  { name: 'PostHog', urls: ['https://posthog.com/product-analytics', 'https://posthog.com/pricing'] },
  { name: 'Mixpanel', urls: ['https://mixpanel.com/', 'https://mixpanel.com/pricing/'] },
  { name: 'Amplitude', urls: ['https://amplitude.com/amplitude-analytics', 'https://amplitude.com/pricing'] },
];
