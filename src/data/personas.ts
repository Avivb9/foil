import type { Lens, Persona } from '../logic/types';

export const LENSES: Record<Lens, { label: string; attacks: string; question: string }> = {
  budget: {
    label: 'Budget',
    attacks: 'Value and proof',
    question: 'What does it cost, what does it return, and how do I know?',
  },
  differentiation: {
    label: 'Differentiation',
    attacks: 'Unique attributes vs. alternatives',
    question: 'Why can’t the incumbent say the exact same sentence?',
  },
  technical: {
    label: 'Technical depth',
    attacks: 'Unique attributes (mechanism)',
    question: 'How does it actually work, and what does it plug into?',
  },
  clarity: {
    label: 'Clarity',
    attacks: 'The whole statement',
    question: 'Can a rep say it out loud in 8 seconds?',
  },
  category: {
    label: 'Category/evidence',
    attacks: 'Market category',
    question: 'Which box do you belong in, who else is there, and where is the evidence?',
  },
  procurement: {
    label: 'Procurement',
    attacks: 'Target customer and value',
    question: 'Whose budget is this, and what’s the vendor risk?',
  },
  legal: {
    label: 'Legal',
    attacks: 'Claims and superlatives',
    question: 'Can we defend every claim if a competitor challenges it?',
  },
};

export const LENS_ORDER: Lens[] = ['budget', 'differentiation', 'technical', 'clarity', 'category', 'procurement', 'legal'];

export const DEFAULT_PERSONAS: Persona[] = [
  {
    id: 'dana',
    name: 'Dana Whitfield',
    role: 'CFO at a 400-person SaaS company',
    lens: 'budget',
    bio: 'Signs anything over $25k. Reads the pricing page before the homepage. Wants proof, numbers, payback and a clear view of the risk.',
    color: '#b45309',
    enabled: true,
  },
  {
    id: 'marcus',
    name: 'Marcus Cole',
    role: 'Enterprise AE at your closest competitor',
    lens: 'differentiation',
    bio: 'Has sat in 40 bake-offs against you. His favourite move: “Honestly, we do that too.” Attacks anything he can blur.',
    color: '#1d4ed8',
    enabled: true,
  },
  {
    id: 'priya',
    name: 'Priya Nair',
    role: 'Director of Engineering (technical buyer)',
    lens: 'technical',
    bio: 'Owns the integration budget and the pager. Ignores adjectives. Wants the mechanism, the data flow and the systems you touch.',
    color: '#047857',
    enabled: true,
  },
  {
    id: 'tyler',
    name: 'Tyler Brooks',
    role: 'SDR, six months in',
    lens: 'clarity',
    bio: 'Makes 80 dials a day. If he can’t say your positioning from memory in 8 seconds, he’ll improvise, and it won’t be pretty.',
    color: '#7c3aed',
    enabled: true,
  },
  {
    id: 'helen',
    name: 'Helen Ortiz',
    role: 'Independent industry analyst',
    lens: 'category',
    bio: 'Writes the shortlists buyers actually use. Needs to know which box you belong in, who else is in it, and where the evidence is.',
    color: '#be123c',
    enabled: true,
  },
];

export const PERSONA_COLORS = ['#b45309', '#1d4ed8', '#047857', '#7c3aed', '#be123c', '#0f766e', '#a21caf', '#4d7c0f', '#c2410c'];

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}
