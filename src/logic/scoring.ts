import {
  CATEGORY_SUGGESTIONS,
  GENERIC_CLAIMS,
  INDUSTRY_TOKENS,
  KNOWN_CATEGORIES,
  KNOWN_VENDORS,
  MECHANISM_TOKENS,
  MONEY_TOKENS,
  OUTCOME_VERBS,
  PROOF_TOKENS,
  ROLE_TOKENS,
  SIZE_PATTERNS,
  SOFT_BUZZWORDS,
  STACK_TOKENS,
  STATUS_QUO_ALTERNATIVES,
  SUPERLATIVES,
  VAGUE_ALTERNATIVES,
  VAGUE_TARGET,
  VAGUE_VALUE,
} from '../data/lexicon';
import { composeStatement } from './compose';
import {
  PLACEHOLDER_RE,
  QUANT_RE,
  clamp,
  contentWords,
  countPlaceholders,
  hasNumber,
  matchedTokens,
  stripPlaceholders,
  uniqueBuzzwords,
  wordCount,
} from './text';
import type { ComponentKey, ComponentScore, Fields, PressureMode, ScoreResult, Weights } from './types';

export const COMPONENT_KEYS: ComponentKey[] = ['target', 'alternatives', 'unique', 'value', 'category'];

export const DEFAULT_WEIGHTS: Weights = {
  target: 20,
  alternatives: 20,
  unique: 25,
  value: 20,
  category: 15,
};

interface Strictness {
  bonus: number;
  penalty: number;
}

export const STRICTNESS: Record<PressureMode, Strictness> = {
  friendly: { bonus: 1.12, penalty: 0.7 },
  tough: { bonus: 1, penalty: 1 },
  brutal: { bonus: 0.9, penalty: 1.4 },
};

type Entry = { delta: number; reason: string };

class Ledger {
  entries: Entry[] = [];
  constructor(
    private base: number,
    private k: Strictness,
  ) {}
  add(delta: number, reason: string) {
    this.entries.push({ delta, reason });
  }
  total(): number {
    let t = this.base;
    for (const e of this.entries) t += e.delta > 0 ? e.delta * this.k.bonus : e.delta * this.k.penalty;
    // Soft floor: very weak text still separates from merely weak text instead of all hitting zero.
    const soft = t >= 35 ? t : 35 * Math.exp((t - 35) / 45);
    return Math.round(clamp(soft, 2, 100));
  }
  result(goodLine: string): ComponentScore {
    const score = this.total();
    const penalties = this.entries.filter((e) => e.delta < 0).sort((a, b) => a.delta - b.delta);
    const bonuses = this.entries.filter((e) => e.delta > 0).sort((a, b) => b.delta - a.delta);
    let explanation: string;
    if (score >= 75 && penalties.length === 0) explanation = goodLine;
    else if (score >= 70 && bonuses.length) explanation = `${bonuses[0].reason}${penalties.length ? `, but ${lower(penalties[0].reason)}` : ''}.`;
    else if (penalties.length) explanation = `${penalties[0].reason}.`;
    else explanation = bonuses.length ? `${bonuses[0].reason}.` : goodLine;
    const findings = [
      ...penalties.map((e) => `− ${e.reason}`),
      ...bonuses.map((e) => `+ ${e.reason}`),
    ];
    return { score, explanation, findings };
  }
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const lower = (s: string) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** True when a [placeholder] in the text mentions one of the hint words. */
function placeholderFor(text: string, hint: RegExp): boolean {
  return (text.match(PLACEHOLDER_RE) || []).some((p) => hint.test(p));
}

function buzzPenalty(l: Ledger, text: string, hard: number) {
  const buzz = uniqueBuzzwords(text);
  if (!buzz.length) return;
  const cost = buzz.reduce((s, b) => s + (SOFT_BUZZWORDS.has(b) ? hard / 2 : hard), 0);
  l.add(-cost, `Buzzwords: ${buzz.map((b) => `“${b}”`).join(', ')}`);
}

const empty = (label: string): ComponentScore => ({ score: 0, explanation: label, findings: [`− ${label}`] });

export function properNouns(text: string): string[] {
  const clean = stripPlaceholders(text);
  const tokens = clean.split(/\s+/);
  const out = new Set<string>();
  tokens.forEach((t, i) => {
    const w = t.replace(/[^A-Za-z0-9.&-]/g, '');
    if (!w || w.length < 2) return;
    if (/^[A-Z][A-Za-z0-9.&-]*$/.test(w) && (i > 0 || KNOWN_VENDORS.includes(w.toLowerCase())) && !/^(I|A|An|The|And|Or|Unlike|Built|Tier(-\d)?)$/.test(w)) {
      out.add(w);
    }
  });
  for (const v of KNOWN_VENDORS) {
    const re = new RegExp(`(?<![a-z])${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`, 'i');
    const m = clean.match(re);
    if (m) out.add(m[0]);
  }
  return [...out];
}

/** Systems and vendors named in the text, in their original casing. */
export function namedSystems(text: string): string[] {
  const clean = stripPlaceholders(text);
  const out: string[] = [];
  for (const v of [...STACK_TOKENS, ...KNOWN_VENDORS]) {
    const m = clean.match(new RegExp(`(?<![A-Za-z])${escapeRe(v)}(?![A-Za-z])`, 'i'));
    if (m && !out.some((o) => o.toLowerCase().includes(m[0].toLowerCase()))) out.push(m[0]);
  }
  return out;
}

// ─── Components ────────────────────────────────────────────────────────────

function scoreTarget(t: string, k: Strictness): ComponentScore {
  if (!t.trim()) return empty('No target customer named, so every buyer assumes it is not for them');
  const l = new Ledger(30, k);
  const clean = stripPlaceholders(t);
  const roles = matchedTokens(clean, ROLE_TOKENS);
  if (roles.length) l.add(25, `Names a buyer role (“${roles[0]}”)`);
  else if (/\bteams?\b/i.test(clean)) {
    l.add(10, 'Names a team');
    l.add(-8, 'Names a team but not the person who signs');
  } else if (placeholderFor(t, /role|title|buyer|persona|who/i)) l.add(12, 'Role placeholder in place. Fill it to earn full credit');
  else l.add(-12, 'No buyer role, so nobody knows who signs');

  if (SIZE_PATTERNS.some((re) => re.test(clean))) l.add(20, 'Sizes the company');
  else if (placeholderFor(t, /size|employees|stage|segment/i)) l.add(10, 'Company-size placeholder in place');
  else l.add(-8, 'No company size or stage');

  const ind = matchedTokens(clean, INDUSTRY_TOKENS);
  if (ind.length) l.add(15, `Names an industry (“${ind[0]}”)`);
  else if (placeholderFor(t, /industry|vertical|segment/i)) l.add(8, 'Industry placeholder in place');

  const stack = matchedTokens(clean, STACK_TOKENS);
  if (stack.length) l.add(12, `Describes their environment (“${stack[0]}”)`);
  else if (wordCount(clean) >= 9 && /\b(who|running|using|with|that)\b/i.test(clean)) l.add(8, 'Describes the buyer’s situation');

  const vague = matchedTokens(clean, VAGUE_TARGET);
  if (vague.length) l.add(-22, `“${vague[0]}” describes everyone, which means no one`);
  if (wordCount(clean) < 3 && !countPlaceholders(t)) l.add(-10, 'Too short to picture a real buyer');
  buzzPenalty(l, t, 8);
  return l.result('A buyer you could build a target account list from.');
}

function scoreAlternatives(a: string, k: Strictness): ComponentScore {
  if (!a.trim()) return empty('No competitive alternative named. Buyers will compare you to whatever they already use');
  const l = new Ledger(30, k);
  const clean = stripPlaceholders(a);
  const named = properNouns(clean);
  const quo = matchedTokens(clean, STATUS_QUO_ALTERNATIVES);
  const vague = matchedTokens(clean, VAGUE_ALTERNATIVES);
  if (named.length) l.add(32, `Names a real alternative (“${named[0]}”)`);
  if (quo.length) l.add(18, `Includes the status quo (“${quo[0]}”)`);
  if (!named.length && !quo.length) {
    if (placeholderFor(a, /alternative|tool|competitor|vendor|status quo|named/i)) l.add(14, 'Alternative placeholder in place. Name it to earn full credit');
    else if (!vague.length) l.add(-12, 'Too abstract to compare against');
  }
  if (vague.length) l.add(-24, `“${vague[0]}” names nothing a buyer could compare against`);
  if (/,|\band\b|\bor\b|\+/.test(a)) l.add(8, 'Covers more than one alternative');
  if (wordCount(a) >= 4) l.add(6, 'Specific enough to argue with');
  buzzPenalty(l, a, 8);
  return l.result('A named alternative a buyer would actually shortlist.');
}

function scoreUnique(u: string, alternatives: string, k: Strictness): ComponentScore {
  if (!u.trim()) return empty('No unique attribute. Without one, you are the alternative');
  const l = new Ledger(25, k);
  const clean = stripPlaceholders(u);
  const low = ` ${u.toLowerCase()} `;
  const mech = MECHANISM_TOKENS.filter((t) => low.includes(t));
  if (mech.length) l.add(22, `Explains the mechanism (“${mech[0].trim()}…”)`);
  else if (placeholderFor(u, /mechanism|how|works/i)) l.add(11, 'Mechanism placeholder in place');
  else l.add(-14, 'Says what it does, not how');

  if (/\byour own\b|\byour\b.*\b(data|history|verdicts|runbooks|calls|contracts)\b/i.test(clean)) l.add(14, 'Anchored in the buyer’s own data');
  if (hasNumber(clean)) l.add(6, 'Contains a checkable specific');
  const nouns = properNouns(clean);
  if (nouns.length) l.add(8, `Names concrete integrations (“${nouns[0]}”)`);

  const generic = matchedTokens(clean, GENERIC_CLAIMS);
  if (generic.length) l.add(-Math.min(18, generic.length * 6), `${generic.map((g) => `“${g}”`).join(', ')} could be claimed by anyone`);

  const uw = contentWords(u);
  const aw = new Set(contentWords(alternatives));
  if (!alternatives.trim()) l.add(-8, 'Different from what? No alternative to contrast against');
  else if (uw.length) {
    const overlap = uw.filter((w) => aw.has(w)).length / uw.length;
    if (overlap >= 0.25) l.add(-Math.round(overlap * 40), `${Math.round(overlap * 100)}% of the differentiator repeats the alternatives’ own language`);
  }

  const wc = wordCount(u);
  if (wc >= 8 && wc <= 40) l.add(15, 'Specific enough to be checked');
  else if (wc < 6) l.add(-10, 'Too short to be a differentiator');
  else if (wc > 45) l.add(-8, 'Too long for anyone to repeat');
  buzzPenalty(l, u, 10);
  return l.result('A differentiator a competitor can’t claim with a straight face.');
}

function scoreValue(v: string, k: Strictness): ComponentScore {
  if (!v.trim()) return empty('No value or proof, so a CFO has nothing to approve');
  const l = new Ledger(15, k);
  const clean = stripPlaceholders(v);
  if (hasNumber(clean)) l.add(22, 'Includes a number');
  else if (placeholderFor(v, /metric|number|%|x\b|amount|time|\$|kpi/i)) l.add(11, 'Metric placeholder in place. Fill it to earn full credit');
  else l.add(-12, 'No number anywhere');

  if (QUANT_RE.test(clean)) l.add(13, 'Quantifies the outcome');

  const proof = matchedTokens(clean, PROOF_TOKENS);
  if (proof.length) l.add(18, `Says where the proof comes from (“${proof[0].trim()}”)`);
  else if (placeholderFor(v, /proof|source|customer|case|benchmark/i)) l.add(9, 'Proof-source placeholder in place');
  else l.add(-6, 'No proof source');

  const verbs = matchedTokens(clean, OUTCOME_VERBS);
  if (verbs.length) l.add(10, `Leads with an outcome verb (“${verbs[0]}”)`);
  const money = matchedTokens(clean, MONEY_TOKENS);
  if (money.length) l.add(10, 'Speaks to cost or payback');

  const vague = matchedTokens(clean, VAGUE_VALUE);
  if (vague.length) l.add(-Math.min(16, vague.length * 8), `${vague.slice(0, 3).map((x) => `“${x}”`).join(', ')} ${vague.length > 1 ? 'are' : 'is'} not a measurable outcome`);
  buzzPenalty(l, v, 10);
  return l.result('A quantified outcome with a source a CFO can check.');
}

export function matchCategory(c: string) {
  const low = c.toLowerCase();
  return KNOWN_CATEGORIES.find((k) => new RegExp(`(?<![a-z])${k.term}`, 'i').test(low)) ?? null;
}

function scoreCategory(c: string, k: Strictness): ComponentScore {
  if (!c.trim()) return empty('No market category, so analysts and buyers can’t file you');
  const l = new Ledger(20, k);
  const clean = stripPlaceholders(c);
  const buzz = uniqueBuzzwords(c);
  const known = matchCategory(clean);
  if (known) {
    l.add(40, `Fits a box buyers already budget for (${known.label})`);
    if (!buzz.length) l.add(12, 'Plain-language category');
  } else if (placeholderFor(c, /category|box|market/i)) l.add(15, 'Category placeholder in place');
  else if (!buzz.length && wordCount(clean) >= 2 && wordCount(clean) <= 5) l.add(6, 'Possibly a new category, which means paying to educate the market');
  else l.add(-10, 'Not a category anyone searches or budgets for');

  const wc = wordCount(clean);
  if (wc && wc <= 5) l.add(12, 'Short enough to fit on a slide');
  else if (wc > 8) l.add(-15, 'A category should be 2–4 words');

  const sup = matchedTokens(clean, SUPERLATIVES);
  if (sup.length) l.add(-12, `“${sup[0]}” is a claim, not a category`);
  buzzPenalty(l, c, 12);
  return l.result('A category box analysts and buyers already recognise.');
}

function readability(statement: string) {
  const sentences = statement.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
  const wc = wordCount(statement);
  const wps = sentences.length ? wc / sentences.length : 0;
  const buzzDensity = wc ? uniqueBuzzwords(statement).length / wc : 0;
  let adjustment = 0;
  let note = 'Sentences are short enough to say out loud.';
  if (!wc) return { adjustment: 0, wordsPerSentence: 0, note: 'Nothing to read yet.' };
  if (wps <= 22) adjustment += 2;
  else if (wps > 36) {
    adjustment -= 6;
    note = `Averages ${Math.round(wps)} words per sentence. Nobody can say that in one breath.`;
  } else if (wps > 28) {
    adjustment -= 3;
    note = `Averages ${Math.round(wps)} words per sentence. Trim it for sales calls.`;
  }
  if (buzzDensity > 0.08) {
    adjustment -= 3;
    note = `${Math.round(buzzDensity * 100)}% of the words are buzzwords, so it reads like every other vendor.`;
  }
  return { adjustment, wordsPerSentence: Math.round(wps * 10) / 10, note };
}

export function scorePositioning(company: string, f: Fields, mode: PressureMode, weights: Weights = DEFAULT_WEIGHTS): ScoreResult {
  const k = STRICTNESS[mode];
  const components: Record<ComponentKey, ComponentScore> = {
    target: scoreTarget(f.target, k),
    alternatives: scoreAlternatives(f.alternatives, k),
    unique: scoreUnique(f.unique, f.alternatives, k),
    value: scoreValue(f.value, k),
    category: scoreCategory(f.category, k),
  };
  const totalW = COMPONENT_KEYS.reduce((s, key) => s + Math.max(0, weights[key]), 0) || 1;
  const weighted = COMPONENT_KEYS.reduce((s, key) => s + components[key].score * Math.max(0, weights[key]), 0) / totalW;
  const statement = composeStatement(company, f);
  const r = readability(statement);
  const anyContent = COMPONENT_KEYS.some((key) => f[key].trim());
  const overall = anyContent ? Math.round(clamp(weighted + r.adjustment)) : 0;
  const all = COMPONENT_KEYS.map((key) => f[key]).join(' ');
  return {
    overall,
    weighted: Math.round(weighted),
    readability: r,
    components,
    buzzwords: uniqueBuzzwords(all),
    placeholders: countPlaceholders(all),
  };
}

export function suggestCategory(f: Fields): string {
  const all = `${f.category} ${f.unique} ${f.target} ${f.value} ${f.alternatives}`;
  return CATEGORY_SUGGESTIONS.find((c) => c.match.test(all))?.suggestion ?? 'a category buyers already budget for';
}

export function scoreBand(score: number): { label: string; tone: 'bad' | 'warn' | 'ok' | 'good' } {
  if (score >= 80) return { label: 'Launch-ready', tone: 'good' };
  if (score >= 60) return { label: 'Holds up', tone: 'ok' };
  if (score >= 40) return { label: 'Wobbly', tone: 'warn' };
  return { label: 'Won’t survive a call', tone: 'bad' };
}

export const COMPONENT_LABELS: Record<ComponentKey, string> = {
  alternatives: 'Competitive alternatives',
  unique: 'Unique attributes',
  value: 'Value and proof',
  target: 'Target customer',
  category: 'Market category',
};

export const COMPONENT_SHORT: Record<ComponentKey, string> = {
  alternatives: 'Alternatives',
  unique: 'Unique',
  value: 'Value',
  target: 'Target',
  category: 'Category',
};

/** Scores a saved run or version. */
export function scoreSnapshot(s: { company: string; fields: Fields; mode: PressureMode }, weights: Weights = DEFAULT_WEIGHTS): ScoreResult {
  return scorePositioning(s.company, s.fields, s.mode, weights);
}
