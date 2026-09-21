import type { Fields, PressureMode, Report, RunSnapshot, Spar, SparStatus } from '../logic/types';
import { EXAMPLES } from './examples';

export const CURRENT_USER = {
  name: 'Aviv Braun',
  title: 'Product Marketing',
  email: 'aviv@northbeam.io',
};

export const WORKSPACE_NAME = 'Northbeam';

export interface Member {
  id: string;
  name: string;
  email: string;
  title: string;
  role: 'Owner' | 'Admin' | 'Editor' | 'Viewer';
  status: 'Active' | 'Invited';
  lastActive: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  href: string;
  kind: 'share' | 'score' | 'objection' | 'digest' | 'member';
}

const HOUR = 3600_000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

const ALL_PERSONAS = ['dana', 'marcus', 'priya', 'tyler', 'helen'];

function snap(id: string, company: string, fields: Fields, at: string, mode: PressureMode, label: string): RunSnapshot {
  return { id, at, fields, company, mode, personaIds: ALL_PERSONAS, label };
}

interface SeedSpar {
  id: string;
  company: string;
  product: string;
  segment: string;
  owner: string;
  status: SparStatus;
  mode: PressureMode;
  createdDaysAgo: number;
  versions: { label: string; daysAgo: number; fields: Fields }[];
}

const weak = EXAMPLES.find((e) => e.id === 'weak')!.fields;

const SEED_SPARS: SeedSpar[] = [
  {
    id: 'kestrel',
    company: 'Kestrel',
    product: 'Kestrel Triage',
    segment: 'Security operations',
    owner: 'Aviv Braun',
    status: 'Needs work',
    mode: 'tough',
    createdDaysAgo: 9,
    versions: [
      {
        label: 'Launch brief draft',
        daysAgo: 9,
        fields: {
          alternatives: '',
          unique: 'empowers organizations to seamlessly transform their SOC with cutting-edge automation',
          value: '',
          target: 'organizations of all sizes',
          category: 'leading AI-powered, end-to-end security platform',
        },
      },
      { label: 'Website v1', daysAgo: 2, fields: weak },
    ],
  },
  {
    id: 'ledgerline',
    company: 'Ledgerline',
    product: 'Ledgerline AP',
    segment: 'Finance operations',
    owner: 'Maya Chen',
    status: 'Launch-ready',
    mode: 'brutal',
    createdDaysAgo: 41,
    versions: [
      {
        label: 'Kickoff',
        daysAgo: 41,
        fields: {
          alternatives: 'manual processes',
          unique: 'AI-powered invoice processing that streamlines accounts payable',
          value: 'save time at month-end',
          target: 'finance teams',
          category: 'finance automation platform',
        },
      },
      {
        label: 'After CFO interviews',
        daysAgo: 30,
        fields: {
          alternatives: 'NetSuite’s native AP module and spreadsheets',
          unique: 'matches invoices to purchase orders automatically',
          value: 'closes the books faster',
          target: 'Controllers at multi-entity companies',
          category: 'AP automation software',
        },
      },
      {
        label: 'Sales feedback round',
        daysAgo: 16,
        fields: {
          alternatives: 'NetSuite’s native AP module, Bill.com, and a shared inbox plus spreadsheets',
          unique: 'reconciles invoices across NetSuite subsidiaries by matching each one to the PO and receipt',
          value: 'cuts month-end close by 4.5 days for multi-entity teams',
          target: 'Controllers at multi-entity SaaS companies (500–5,000 employees) running NetSuite',
          category: 'AP automation software',
        },
      },
      {
        label: 'Launch final',
        daysAgo: 3,
        fields: {
          alternatives: 'NetSuite’s native AP module, Bill.com, and a shared inbox plus spreadsheets',
          unique:
            'reconciles invoices across up to 40 NetSuite subsidiaries by matching each one to the PO, receipt and intercompany entry in a single pass',
          value: 'cuts month-end close by 4.5 days (median across 63 finance teams), with payback in under 3 months',
          target: 'Controllers at multi-entity SaaS and healthcare companies (500–5,000 employees) running NetSuite',
          category: 'AP automation software',
        },
      },
    ],
  },
  {
    id: 'tessera',
    company: 'Tessera',
    product: 'Tessera Lineage',
    segment: 'Data infrastructure',
    owner: 'Jonah Reyes',
    status: 'In review',
    mode: 'tough',
    createdDaysAgo: 22,
    versions: [
      {
        label: 'First pass',
        daysAgo: 22,
        fields: {
          alternatives: 'legacy data quality tools',
          unique: 'end-to-end visibility into your data stack',
          value: 'trustworthy data and better decisions',
          target: 'data-driven companies',
          category: 'data trust platform',
        },
      },
      {
        label: 'Post win/loss review',
        daysAgo: 11,
        fields: {
          alternatives: 'Monte Carlo and dbt tests written by hand',
          unique: 'shows which dashboards break when a dbt model changes',
          value: 'fewer broken dashboards',
          target: 'Analytics engineering teams on dbt',
          category: 'data observability tool',
        },
      },
      {
        label: 'Rewrite with Foil',
        daysAgo: 1,
        fields: {
          alternatives: 'Monte Carlo and dbt tests written by hand',
          unique: 'traces every broken dashboard back to the exact dbt model and commit that caused it, using your own git history',
          value: 'helps data teams find root causes faster',
          target: 'Analytics engineering leads at Series B–D startups on Snowflake and dbt',
          category: 'data observability tool',
        },
      },
    ],
  },
  {
    id: 'quillmate',
    company: 'Quillmate',
    product: 'Quillmate Coach',
    segment: 'Revenue enablement',
    owner: 'Sofia Alvarez',
    status: 'Needs work',
    mode: 'tough',
    createdDaysAgo: 14,
    versions: [
      {
        label: 'Board deck language',
        daysAgo: 14,
        fields: {
          alternatives: 'traditional sales training',
          unique: 'next-gen AI-powered coaching platform for revenue teams',
          value: 'drives growth',
          target: 'revenue teams',
          category: 'revenue platform',
        },
      },
      {
        label: 'Enablement draft',
        daysAgo: 4,
        fields: {
          alternatives: 'Gong and manager ride-alongs',
          unique: 'AI-powered coaching that gives reps real-time feedback',
          value: 'improves win rates and ramps reps faster',
          target: 'Sales teams',
          category: 'revenue intelligence platform',
        },
      },
    ],
  },
  {
    id: 'harborline',
    company: 'Harborline',
    product: 'Harborline Fleet',
    segment: 'Logistics',
    owner: 'Aviv Braun',
    status: 'Draft',
    mode: 'friendly',
    createdDaysAgo: 6,
    versions: [
      {
        label: 'Discovery notes',
        daysAgo: 6,
        fields: {
          alternatives: 'Fleetio, paper inspection sheets, and the shop manager’s whiteboard',
          unique: 'predicts which trucks will fail inspection next week using the fault codes they already send to Samsara',
          value: 'reduces roadside breakdowns',
          target: 'Maintenance directors at regional trucking fleets with 50–500 trucks',
          category: 'fleet maintenance software',
        },
      },
    ],
  },
];

export function buildSpars(): Spar[] {
  return SEED_SPARS.map((s) => {
    const versions = s.versions.map((v, i) =>
      snap(`${s.id}-v${i + 1}`, s.company, v.fields, ago(v.daysAgo * DAY + (i + 2) * HOUR), s.mode, v.label),
    );
    const last = versions[versions.length - 1];
    return {
      id: s.id,
      company: s.company,
      product: s.product,
      segment: s.segment,
      owner: s.owner,
      status: s.status,
      mode: s.mode,
      draft: { ...last.fields },
      lastRun: { ...last },
      versions,
      createdAt: ago(s.createdDaysAgo * DAY),
      updatedAt: last.at,
    };
  });
}

export function buildReports(spars: Spar[]): Report[] {
  const find = (id: string) => spars.find((s) => s.id === id)!;
  const mk = (id: string, sparId: string, title: string, versionIdx: number, daysAgo: number, by: string, slug: string): Report => {
    const sp = find(sparId);
    const v = sp.versions[Math.min(versionIdx, sp.versions.length - 1)];
    return { id, sparId, title, createdAt: ago(daysAgo * DAY), createdBy: by, slug, snapshot: { ...v } };
  };
  return [
    mk('r-ledgerline-launch', 'ledgerline', 'Ledgerline launch readiness review', 3, 0.1, 'Maya Chen', 'ldg-7f3k2q'),
    mk('r-tessera-sko', 'tessera', 'Tessera SKO messaging check', 2, 1, 'Jonah Reyes', 'tsr-9a1m4x'),
    mk('r-quillmate', 'quillmate', 'Quillmate enablement draft teardown', 1, 4, 'Sofia Alvarez', 'qml-2c8v6p'),
    mk('r-kestrel-baseline', 'kestrel', 'Kestrel baseline before repositioning', 1, 2, 'Aviv Braun', 'kst-5h7d1w'),
    mk('r-ledgerline-v1', 'ledgerline', 'Ledgerline kickoff baseline', 0, 40, 'Maya Chen', 'ldg-1b4n8r'),
  ];
}

export function buildMembers(): Member[] {
  return [
    { id: 'm-maya', name: 'Maya Chen', email: 'maya@northbeam.io', title: 'Head of Product Marketing', role: 'Owner', status: 'Active', lastActive: ago(1 * HOUR) },
    { id: 'm-aviv', name: 'Aviv Braun', email: 'aviv@northbeam.io', title: 'Product Marketing', role: 'Admin', status: 'Active', lastActive: ago(0) },
    { id: 'm-jonah', name: 'Jonah Reyes', email: 'jonah@northbeam.io', title: 'Senior PMM', role: 'Editor', status: 'Active', lastActive: ago(5 * HOUR) },
    { id: 'm-sofia', name: 'Sofia Alvarez', email: 'sofia@northbeam.io', title: 'Sales Enablement Lead', role: 'Editor', status: 'Active', lastActive: ago(1 * DAY) },
    { id: 'm-dev', name: 'Dev Patel', email: 'dev@northbeam.io', title: 'VP Sales', role: 'Viewer', status: 'Active', lastActive: ago(3 * DAY) },
    { id: 'm-ren', name: 'Ren Takahashi', email: 'ren@northbeam.io', title: 'Founder’s Office', role: 'Viewer', status: 'Invited', lastActive: ago(2 * DAY) },
  ];
}

export function buildNotifications(): AppNotification[] {
  return [
    { id: 'n1', kind: 'share', title: 'Maya Chen shared a report', body: 'Ledgerline launch readiness review', at: ago(2 * HOUR), read: false, href: '/reports/r-ledgerline-launch' },
    { id: 'n2', kind: 'score', title: 'Tessera moved up 14 points', body: 'Jonah’s rewrite cleared two deal-breakers', at: ago(1 * DAY), read: false, href: '/spars/tessera' },
    { id: 'n3', kind: 'objection', title: 'New deal-breaker on Quillmate', body: 'Helen Ortiz: “revenue intelligence platform” puts you next to Gong', at: ago(2 * DAY), read: false, href: '/spars/quillmate' },
    { id: 'n4', kind: 'digest', title: 'Your weekly positioning digest', body: '5 spars · average score 51 · 3 reports shared', at: ago(4 * DAY), read: true, href: '/reports' },
    { id: 'n5', kind: 'member', title: 'Sofia Alvarez joined Northbeam', body: 'Added as Editor by Maya Chen', at: ago(6 * DAY), read: true, href: '/settings/workspace' },
  ];
}

export const INVOICES = [
  { id: 'INV-2026-009', date: '2026-09-01', amount: 294, status: 'Paid', seats: 6 },
  { id: 'INV-2026-008', date: '2026-08-01', amount: 245, status: 'Paid', seats: 5 },
  { id: 'INV-2026-007', date: '2026-07-01', amount: 245, status: 'Paid', seats: 5 },
  { id: 'INV-2026-006', date: '2026-06-01', amount: 196, status: 'Paid', seats: 4 },
];
