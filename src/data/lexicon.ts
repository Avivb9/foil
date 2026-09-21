// Word lists used by the scoring and rewrite engines. Kept here so the
// heuristics stay transparent and easy to tune.

/** Core buzzwords. Each costs points wherever it appears. */
export const BUZZWORDS = [
  'best-in-class',
  'world-class',
  'all-in-one',
  'end-to-end',
  'cutting-edge',
  'ai-powered',
  'next-gen',
  'next-generation',
  'state-of-the-art',
  'game-changing',
  'leading',
  'innovative',
  'seamless',
  'seamlessly',
  'holistic',
  'robust',
  'scalable',
  'platform',
  'solution',
  'solutions',
  'empower',
  'empowers',
  'empowering',
  'revolutionary',
  'revolutionize',
  'synergy',
  'leverage',
  'leverages',
  'disruptive',
  'unlock',
  'unlocks',
  'transform',
  'transforms',
  'supercharge',
  'frictionless',
  'turnkey',
  'mission-critical',
] as const;

/** Buzzwords that are merely weak (half penalty) rather than empty. */
export const SOFT_BUZZWORDS = new Set(['platform', 'solution', 'solutions', 'scalable', 'robust', 'leading']);

export const ROLE_TOKENS = [
  'cfo', 'ceo', 'cto', 'ciso', 'cio', 'coo', 'cmo', 'cro', 'vp', 'head', 'heads', 'director', 'directors',
  'manager', 'managers', 'lead', 'leads', 'engineer', 'engineers', 'analyst', 'analysts', 'controller',
  'controllers', 'founder', 'founders', 'pmm', 'pmms', 'marketer', 'marketers', 'admin', 'admins',
  'architect', 'architects', 'owner', 'owners', 'dispatcher', 'dispatchers', 'recruiter', 'recruiters',
  'accountant', 'accountants', 'rep', 'reps', 'ae', 'aes', 'sdr', 'sdrs', 'officer', 'officers', 'operator', 'operators',
  'buyer', 'buyers', 'clinician', 'clinicians', 'teacher', 'teachers', 'developer', 'developers',
];

export const SIZE_PATTERNS: RegExp[] = [
  /\d[\d,]*\s*(\+|–|-|to)?\s*\d*[\d,]*\s*(employees|people|staff|seats|analysts|reps|engineers|trucks|vehicles|locations|entities|stores)/i,
  /\b(mid-market|midmarket|enterprise|smb|smbs|startup|startups|series [a-d]|fortune \d+|scale-?ups?)\b/i,
  /\$\d[\d.,]*\s*(m|mm|b|k)?\s*(arr|revenue|spend)/i,
];

export const INDUSTRY_TOKENS = [
  'fintech', 'fintechs', 'bank', 'banks', 'banking', 'insurance', 'insurers', 'healthcare', 'hospital', 'hospitals',
  'saas', 'b2b', 'retail', 'retailers', 'e-commerce', 'ecommerce', 'logistics', 'trucking', 'fleet', 'fleets',
  'manufacturing', 'manufacturers', 'government', 'public sector', 'education', 'universities', 'legal', 'law firms',
  'marketplaces', 'marketplace', 'dtc', 'gaming', 'media', 'telecom', 'pharma', 'biotech', 'construction',
  'hospitality', 'restaurants', 'nonprofits', 'agencies', 'crypto', 'payments', 'lending', 'real estate',
];

export const STACK_TOKENS = [
  'splunk', 'sentinel', 'crowdstrike', 'salesforce', 'hubspot', 'snowflake', 'dbt', 'databricks', 'bigquery',
  'netsuite', 'quickbooks', 'sage', 'aws', 'azure', 'gcp', 'kubernetes', 'jira', 'zendesk', 'slack', 'okta',
  'workday', 'gong', 'outreach', 'datadog', 'pagerduty', 'looker', 'tableau', 'excel', 'google sheets', 'samsara',
  'geotab', 'coupa', 'sap', 'oracle', 'stripe', 'shopify', 'segment', 'fivetran', 'airflow', 'monte carlo',
];

export const VAGUE_TARGET = [
  'organizations', 'organisations', 'businesses', 'companies', 'enterprises of all sizes', 'all sizes', 'everyone',
  'anyone', 'teams everywhere', 'modern teams', 'forward-thinking', 'any team', 'users', 'customers',
];

export const VAGUE_ALTERNATIVES = [
  'legacy tools', 'legacy solutions', 'legacy systems', 'traditional tools', 'traditional solutions',
  'existing solutions', 'existing tools', 'other tools', 'competitors', 'the competition', 'old-school',
  'outdated tools', 'point solutions', 'incumbents', 'other vendors',
];

export const STATUS_QUO_ALTERNATIVES = [
  'spreadsheet', 'spreadsheets', 'manual', 'manually', 'hiring', 'in-house', 'homegrown', 'home-grown',
  'email', 'emails', 'doing nothing', 'status quo', 'agency', 'agencies', 'consultants', 'scripts', 'playbooks',
  'whiteboard', 'paper', 'shared inbox', 'slack threads', 'tribal knowledge', 'contractors', 'outsourcing',
];

export const MECHANISM_TOKENS = [
  ' by ', ' via ', ' using ', ' through ', ' because ', 'your own', 'reads ', 'replays', 'replaying', 'syncs',
  'maps ', 'matches', 'matching', 'flags', 'detects', 'scores', 'routes', 'pulls', 'connects', 'compares',
  'reconciles', 'predicts', 'learns from', 'generates', 'records', 'watches', 'indexes', 'traces', 'diffs',
];

export const GENERIC_CLAIMS = [
  'ai', 'automation', 'automate', 'automates', 'faster', 'easier', 'better', 'smarter', 'simple', 'simpler',
  'powerful', 'intuitive', 'efficient', 'modern', 'insights', 'visibility', 'streamline', 'streamlines',
];

export const PROOF_TOKENS = [
  'customers', 'customer', 'verified', 'median', 'average', 'avg', 'across', 'audited', 'case study',
  'benchmark', 'benchmarked', 'measured', 'per ', 'cohort', 'in production', 'independent', 'g2', 'gartner',
  'forrester', 'soc 2', 'reference', 'references', 'pilot', 'pilots',
];

export const OUTCOME_VERBS = [
  'cuts', 'cut', 'reduces', 'reduce', 'saves', 'save', 'increases', 'increase', 'grows', 'grow', 'closes',
  'recovers', 'eliminates', 'avoids', 'lifts', 'raises', 'shortens', 'halves', 'doubles', 'triples', 'prevents',
  'catches', 'shrinks', 'drops',
];

export const MONEY_TOKENS = ['payback', 'roi', 'cost', 'costs', '$', 'budget', 'spend', 'savings', 'margin', 'revenue', 'headcount'];

export const VAGUE_VALUE = [
  'efficiency', 'productivity', 'better outcomes', 'outcomes', 'peace of mind', 'save time', 'saves time',
  'value', 'success', 'growth', 'transformation', 'smarter', 'faster', 'burnout', 'digital transformation',
];

export const SUPERLATIVES = ['leading', '#1', 'number one', 'first', 'only', 'best', 'premier', 'ultimate', 'most advanced'];

/** Category boxes analysts and buyers already recognise, with a few named peers. */
export const KNOWN_CATEGORIES: { term: string; label: string; peers: string[] }[] = [
  { term: 'alert triage', label: 'SOC alert triage', peers: ['Torq', 'Dropzone AI', 'Prophet Security'] },
  { term: 'soar', label: 'SOAR', peers: ['Splunk SOAR', 'Palo Alto XSOAR', 'Swimlane'] },
  { term: 'siem', label: 'SIEM', peers: ['Splunk', 'Microsoft Sentinel', 'Sumo Logic'] },
  { term: 'xdr', label: 'XDR', peers: ['CrowdStrike', 'SentinelOne', 'Palo Alto Cortex'] },
  { term: 'email security', label: 'Email security', peers: ['Abnormal', 'Proofpoint', 'Mimecast'] },
  { term: 'vulnerability management', label: 'Vulnerability management', peers: ['Tenable', 'Qualys', 'Rapid7'] },
  { term: 'identity governance', label: 'Identity governance', peers: ['SailPoint', 'Saviynt', 'ConductorOne'] },
  { term: 'data observability', label: 'Data observability', peers: ['Monte Carlo', 'Bigeye', 'Metaplane'] },
  { term: 'data catalog', label: 'Data catalog', peers: ['Atlan', 'Alation', 'Collibra'] },
  { term: 'reverse etl', label: 'Reverse ETL', peers: ['Hightouch', 'Census'] },
  { term: 'etl', label: 'ETL / ELT', peers: ['Fivetran', 'Airbyte', 'Stitch'] },
  { term: 'product analytics', label: 'Product analytics', peers: ['Amplitude', 'Mixpanel', 'Heap'] },
  { term: 'customer data platform', label: 'Customer data platform', peers: ['Segment', 'mParticle', 'RudderStack'] },
  { term: 'accounts payable', label: 'AP automation', peers: ['Bill.com', 'Tipalti', 'Stampli'] },
  { term: 'ap automation', label: 'AP automation', peers: ['Bill.com', 'Tipalti', 'Stampli'] },
  { term: 'spend management', label: 'Spend management', peers: ['Ramp', 'Brex', 'Navan'] },
  { term: 'expense management', label: 'Expense management', peers: ['Expensify', 'Ramp', 'Navan'] },
  { term: 'procurement', label: 'Procurement software', peers: ['Coupa', 'Zip', 'Tropic'] },
  { term: 'cloud cost', label: 'Cloud cost management', peers: ['Vantage', 'CloudZero', 'Kubecost'] },
  { term: 'finops', label: 'FinOps', peers: ['Vantage', 'CloudZero', 'Apptio Cloudability'] },
  { term: 'revenue intelligence', label: 'Revenue intelligence', peers: ['Gong', 'Clari', 'Chorus'] },
  { term: 'conversation intelligence', label: 'Conversation intelligence', peers: ['Gong', 'Chorus', 'Avoma'] },
  { term: 'sales coaching', label: 'Sales coaching', peers: ['Gong', 'Mindtickle', 'Second Nature'] },
  { term: 'call coaching', label: 'Sales coaching', peers: ['Gong', 'Mindtickle', 'Second Nature'] },
  { term: 'sales engagement', label: 'Sales engagement', peers: ['Outreach', 'Salesloft', 'Apollo'] },
  { term: 'crm', label: 'CRM', peers: ['Salesforce', 'HubSpot', 'Attio'] },
  { term: 'cpq', label: 'CPQ', peers: ['Salesforce CPQ', 'DealHub', 'Conga'] },
  { term: 'subscription billing', label: 'Subscription billing', peers: ['Chargebee', 'Recurly', 'Maxio'] },
  { term: 'fleet maintenance', label: 'Fleet maintenance software', peers: ['Fleetio', 'Whip Around', 'Fullbay'] },
  { term: 'fleet management', label: 'Fleet management', peers: ['Samsara', 'Motive', 'Geotab'] },
  { term: 'cmms', label: 'CMMS', peers: ['UpKeep', 'Fiix', 'MaintainX'] },
  { term: 'help desk', label: 'Help desk', peers: ['Zendesk', 'Freshdesk', 'Help Scout'] },
  { term: 'itsm', label: 'ITSM', peers: ['ServiceNow', 'Jira Service Management', 'Freshservice'] },
  { term: 'applicant tracking', label: 'Applicant tracking', peers: ['Greenhouse', 'Lever', 'Ashby'] },
  { term: 'hris', label: 'HRIS', peers: ['Rippling', 'BambooHR', 'HiBob'] },
  { term: 'payroll', label: 'Payroll', peers: ['Gusto', 'Rippling', 'Deel'] },
  { term: 'feature flag', label: 'Feature management', peers: ['LaunchDarkly', 'Statsig', 'Split'] },
  { term: 'digital adoption', label: 'Digital adoption', peers: ['WalkMe', 'Pendo', 'Whatfix'] },
  { term: 'competitive intelligence', label: 'Competitive intelligence', peers: ['Klue', 'Crayon', 'Kompyte'] },
  { term: 'incident management', label: 'Incident management', peers: ['PagerDuty', 'incident.io', 'FireHydrant'] },
  { term: 'observability', label: 'Observability', peers: ['Datadog', 'New Relic', 'Honeycomb'] },
  { term: 'contract management', label: 'Contract management', peers: ['Ironclad', 'Juro', 'DocuSign CLM'] },
];

/** Domain keywords → a category suggestion used when the category box is missing. */
export const CATEGORY_SUGGESTIONS: { match: RegExp; suggestion: string }[] = [
  { match: /\b(soc|security|alert|threat|siem)\b/i, suggestion: 'SOC alert triage tool' },
  { match: /\b(data|pipeline|dbt|warehouse|snowflake)\b/i, suggestion: 'data observability tool' },
  { match: /\b(invoice|payable|ap|bills?)\b/i, suggestion: 'AP automation software' },
  { match: /\b(spend|expense|card)\b/i, suggestion: 'spend management software' },
  { match: /\b(sales|call|rep|reps|deal|pipeline)\b/i, suggestion: 'sales coaching tool' },
  { match: /\b(fleet|truck|trucking|vehicle|maintenance)\b/i, suggestion: 'fleet maintenance software' },
  { match: /\b(cloud|aws|cost)\b/i, suggestion: 'cloud cost management tool' },
  { match: /\b(support|ticket|help)\b/i, suggestion: 'help desk software' },
];

export const KNOWN_VENDORS = [
  'splunk', 'splunk soar', 'xsoar', 'sentinel', 'crowdstrike', 'excel', 'google sheets', 'salesforce', 'hubspot',
  'gong', 'chorus', 'clari', 'outreach', 'salesloft', 'monte carlo', 'datadog', 'bill.com', 'tipalti', 'coupa',
  'netsuite', 'ramp', 'brex', 'expensify', 'fleetio', 'samsara', 'zendesk', 'servicenow', 'jira', 'tableau',
  'looker', 'amplitude', 'mixpanel', 'segment', 'fivetran', 'great expectations', 'airflow', 'pagerduty',
  'torq', 'tines', 'swimlane', 'mindtickle', 'quickbooks', 'sap', 'oracle', 'workday',
];
