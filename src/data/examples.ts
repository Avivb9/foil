import type { Fields } from '../logic/types';

export interface Example {
  id: string;
  label: string;
  quality: 'Weak' | 'Okay' | 'Strong';
  description: string;
  company: string;
  fields: Fields;
}

/** Three Kestrel examples of visibly different quality, for the "Load example" menu. */
export const EXAMPLES: Example[] = [
  {
    id: 'weak',
    label: 'The buzzword special',
    quality: 'Weak',
    description: 'Every adjective, no specifics. The statement most launches start with.',
    company: 'Kestrel',
    fields: {
      alternatives: 'legacy tools',
      unique: 'empowers organizations to seamlessly transform their SOC with cutting-edge automation',
      value: 'faster, smarter security outcomes',
      target: 'organizations of all sizes',
      category: 'leading AI-powered, end-to-end security platform',
    },
  },
  {
    id: 'okay',
    label: 'Getting warmer',
    quality: 'Okay',
    description: 'A segment and a category, but no mechanism and no proof.',
    company: 'Kestrel',
    fields: {
      alternatives: 'Splunk SOAR playbooks',
      unique: 'uses AI to automate alert triage with fewer false positives',
      value: 'helps analysts save time and reduce burnout',
      target: 'Mid-market security teams',
      category: 'security automation platform',
    },
  },
  {
    id: 'strong',
    label: 'Sales-call ready',
    quality: 'Strong',
    description: 'Named segment, named alternative, concrete mechanism, quantified outcome.',
    company: 'Kestrel',
    fields: {
      alternatives: 'Splunk SOAR playbooks and hiring more Tier-1 analysts',
      unique:
        'auto-triages Tier-1 alerts by replaying each one against your own past incident verdicts, and shows the evidence trail behind every close',
      value: 'cuts median alert triage time from 34 to 9 minutes across 41 customer SOCs, with payback in under 5 months',
      target: 'SOC leads at mid-market fintechs (200–2,000 employees) running a 3–10 analyst team on Splunk or Microsoft Sentinel',
      category: 'SOC alert triage tool',
    },
  },
];

export const EMPTY_FIELDS: Fields = { alternatives: '', unique: '', value: '', target: '', category: '' };

export const FIELD_HELP: Record<keyof Fields, { label: string; hint: string; placeholder: string; persona: string }> = {
  alternatives: {
    label: 'Competitive alternatives',
    hint: 'What would buyers use if you didn’t exist? Include the status quo.',
    placeholder: 'e.g. Splunk SOAR playbooks and hiring more Tier-1 analysts',
    persona: 'Marcus attacks this',
  },
  unique: {
    label: 'Unique attributes',
    hint: 'What you do that the alternatives can’t, and how it works. Write it as a verb phrase.',
    placeholder: 'e.g. auto-triages alerts by replaying each one against your own past verdicts',
    persona: 'Marcus and Priya attack this',
  },
  value: {
    label: 'Value and proof',
    hint: 'The outcome those attributes create, with a number and where it comes from.',
    placeholder: 'e.g. cuts median triage time from 34 to 9 minutes across 41 customers',
    persona: 'Dana attacks this',
  },
  target: {
    label: 'Target customer',
    hint: 'Who cares most: role, company size, industry, situation.',
    placeholder: 'e.g. SOC leads at mid-market fintechs running a 3–10 analyst team',
    persona: 'Tyler needs this',
  },
  category: {
    label: 'Market category',
    hint: 'The box buyers and analysts put you in. Two to four words.',
    placeholder: 'e.g. SOC alert triage tool',
    persona: 'Helen attacks this',
  },
};

/** Field order in the workspace follows Dunford’s sequence. */
export const FIELD_ORDER: (keyof Fields)[] = ['alternatives', 'unique', 'value', 'target', 'category'];
