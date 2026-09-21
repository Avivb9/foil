export type ComponentKey = 'alternatives' | 'unique' | 'value' | 'target' | 'category';

export type Fields = Record<ComponentKey, string>;

export type PressureMode = 'friendly' | 'tough' | 'brutal';

export type Weights = Record<ComponentKey, number>;

export type Lens =
  | 'budget'
  | 'differentiation'
  | 'technical'
  | 'clarity'
  | 'category'
  | 'procurement'
  | 'legal';

export type Severity = 'minor' | 'serious' | 'dealbreaker';

export interface Persona {
  id: string;
  name: string;
  role: string;
  lens: Lens;
  bio: string;
  color: string; // tailwind-friendly hex
  enabled: boolean;
  custom?: boolean;
}

export interface Objection {
  personaId: string;
  component: ComponentKey | 'statement';
  gut: string;
  objection: string;
  quote: string;
  severity: Severity;
  fix: string;
  extra?: { label: string; text: string };
}

export interface ComponentScore {
  score: number;
  explanation: string;
  findings: string[];
}

export interface ScoreResult {
  overall: number;
  weighted: number;
  readability: { adjustment: number; wordsPerSentence: number; note: string };
  components: Record<ComponentKey, ComponentScore>;
  buzzwords: string[];
  placeholders: number;
}

export interface RunSnapshot {
  id: string;
  at: string; // ISO
  fields: Fields;
  company: string;
  mode: PressureMode;
  personaIds: string[];
  label?: string;
}

export type SparStatus = 'Draft' | 'Needs work' | 'In review' | 'Launch-ready';

export interface Spar {
  id: string;
  company: string;
  product: string;
  segment: string; // short descriptor for the list, e.g. "Security operations"
  owner: string;
  status: SparStatus;
  mode: PressureMode;
  draft: Fields;
  lastRun: RunSnapshot | null;
  versions: RunSnapshot[];
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: string;
  sparId: string;
  title: string;
  createdAt: string;
  createdBy: string;
  slug: string;
  snapshot: RunSnapshot;
}
