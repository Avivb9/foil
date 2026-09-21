import { CATEGORY_SUGGESTIONS, MECHANISM_TOKENS, SUPERLATIVES, VAGUE_ALTERNATIVES, VAGUE_VALUE } from '../data/lexicon';
import { composeStatement } from './compose';
import { matchCategory, properNouns, suggestCategory } from './scoring';
import { contentWords, hasNumber, matchedTokens, stripPlaceholders, uniqueBuzzwords } from './text';
import type { ComponentKey, Fields } from './types';

export interface Change {
  component: ComponentKey;
  note: string;
}

export interface RewriteResult {
  fields: Fields;
  statement: string;
  before: string;
  changes: Change[];
  placeholders: number;
}

type Rule = { re: RegExp; to: string | ((...m: string[]) => string); note: (m: string) => string };

// Phrase-level rules run first so the result still reads as a sentence.
const PHRASE_RULES: Rule[] = [
  {
    re: /\b(empowers?|enables?|allows?)\s+(?:[\w-]+\s+){0,3}?to\s+/gi,
    to: '',
    note: (m) => `Cut “${m.trim()}”. Say what the product does, not what it lets people do.`,
  },
  {
    re: /\btransforms?\s+(their|your|the)\s+([\w-]+)/gi,
    to: (_m, _p, noun) => `speeds up [the slowest ${noun} workflow]`,
    note: (m) => `Replaced “${m}” with the specific workflow it changes.`,
  },
  {
    re: /\bwith\s+(?:cutting[-\s]edge\s+|ai[-\s]powered\s+|advanced\s+|intelligent\s+)*(automation|ai|machine learning)\b/gi,
    to: 'by automating [the manual step]',
    note: (m) => `Turned “${m}” into a mechanism: which step gets automated?`,
  },
  { re: /\bunlocks?\b/gi, to: 'gives', note: (m) => `“${m}” → “gives”.` },
  { re: /\bleverag(es|e|ing)\b/gi, to: 'uses', note: (m) => `“${m}” → “uses”.` },
  { re: /\bsupercharges?\b/gi, to: 'speeds up', note: (m) => `“${m}” → “speeds up”.` },
  { re: /\brevolutioni[sz]es?\b/gi, to: 'changes', note: (m) => `“${m}” → “changes”.` },
];

const DROP_WORDS =
  /\b(leading|innovative|cutting[-\s]edge|best[-\s]in[-\s]class|world[-\s]class|next[-\s]gen(eration)?|state[-\s]of[-\s]the[-\s]art|game[-\s]changing|revolutionary|holistic|robust|scalable|turnkey|frictionless|seamless(ly)?|ai[-\s]powered|end[-\s]to[-\s]end|all[-\s]in[-\s]one|mission[-\s]critical|disruptive|empowering)\b,?\s*/gi;

function tidy(s: string): string {
  return s
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/^\s*[,;:-]\s*/, '')
    .replace(/\s*[,;:]\s*$/, '')
    .replace(/\b(the|a|an)\s+(,|$)/gi, '$2')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function applyRules(text: string, component: ComponentKey, changes: Change[], nounFor?: string): string {
  let out = text;
  for (const r of PHRASE_RULES) {
    out = out.replace(r.re, (...args) => {
      const m = args[0] as string;
      changes.push({ component, note: r.note(m) });
      return typeof r.to === 'string' ? r.to : r.to(...(args as string[]));
    });
  }
  const dropped: string[] = [];
  out = out.replace(DROP_WORDS, (m) => {
    dropped.push(m.replace(/[,\s]+$/, ''));
    return '';
  });
  out = out.replace(/\b(platform|solution)s?\b/gi, (m) => {
    dropped.push(m);
    return nounFor ?? 'product';
  });
  if (dropped.length) {
    changes.push({
      component,
      note: `Removed ${dropped.map((d) => `“${d}”`).join(', ')}. ${dropped.length > 1 ? 'They cost' : 'It costs'} trust and ${dropped.length > 1 ? 'add' : 'adds'} no information.`,
    });
  }
  return tidy(out);
}

// ─── Per component ─────────────────────────────────────────────────────────

function rewriteTarget(t: string, changes: Change[]): string {
  if (!t.trim()) {
    changes.push({ component: 'target', note: 'Added a target-customer frame: role, company size, industry.' });
    return '[buyer role] at [company size] [industry] companies';
  }
  let out = applyRules(t, 'target', changes);
  const vagueRe = /\b(organi[sz]ations|businesses|companies|enterprises|users|customers|everyone|anyone)(\s+of\s+all\s+sizes)?\b/i;
  const qualified = /\d|mid-market|enterprise|smb|startup|series [a-d]|fintech|saas|healthcare|bank|retail|logistics|trucking|manufactur|insurance/i.test(out);
  const vm = /of\s+all\s+sizes|everyone|anyone/i.test(out) || !qualified ? out.match(vagueRe) : null;
  if (vm) {
    out = out.replace(vagueRe, '[company size] [industry] companies');
    changes.push({ component: 'target', note: `Replaced “${vm[0]}” with a segment you could build an account list from.` });
  }
  out = out.replace(/\s+of\s+all\s+sizes/i, '');
  const hasRole = /\b(cfo|ceo|cto|ciso|cio|vp|head|heads|director|directors|manager|managers|lead|leads|engineer|engineers|analyst|analysts|controller|controllers|founder|founders|owner|owners|admin|admins|officer|reps?|pmms?|marketers?)\b/i.test(out);
  if (!hasRole && !/\[buyer role/.test(out)) {
    out = /\bteams?\b/i.test(out) ? `[buyer role] on ${lcFirst(out)}` : `[buyer role] at ${lcFirst(out)}`;
    changes.push({ component: 'target', note: 'Named the person who signs, not just the organisation.' });
  }
  return tidy(out);
}

function rewriteAlternatives(a: string, changes: Change[]): string {
  if (!a.trim()) {
    changes.push({ component: 'alternatives', note: 'Added the two alternatives every buyer weighs: a named competitor and the status quo.' });
    return '[named competitor] or [what they do today without a tool]';
  }
  let out = applyRules(a, 'alternatives', changes, 'tool');
  const vague = VAGUE_ALTERNATIVES.find((v) => out.toLowerCase().includes(v));
  if (vague) {
    out = out.replace(new RegExp(vague, 'i'), '[the named tool they use today]');
    changes.push({ component: 'alternatives', note: `Replaced “${vague}” with a slot for a named alternative. Buyers compare products, not eras.` });
  }
  const named = properNouns(stripPlaceholders(out)).length > 0;
  const quo = /spreadsheet|manual|hiring|in-house|homegrown|email|status quo|agenc|consultant|script|playbook|nothing/i.test(out);
  if (!quo) {
    out = `${out} or [what they do today without a tool]`;
    changes.push({ component: 'alternatives', note: 'Added the status quo. “Do nothing” beats most vendors.' });
  } else if (!named && !/\[/.test(out)) {
    out = `[named competitor] or ${lcFirst(out)}`;
    changes.push({ component: 'alternatives', note: 'Added a slot for the competitor your AEs lose to most.' });
  }
  return tidy(out);
}

function rewriteUnique(u: string, changes: Change[]): string {
  if (!u.trim()) {
    changes.push({ component: 'unique', note: 'Added a differentiator frame: the capability plus the mechanism behind it.' });
    return '[the one thing only you do] by [how it works]';
  }
  let out = applyRules(u, 'unique', changes);
  // Stray object nouns left behind by dropped verbs ("organizations speeds up...") get cleaned.
  out = out.replace(/^(organi[sz]ations|businesses|companies|teams)\s+/i, '');
  const low = ` ${out.toLowerCase()} `;
  if (!MECHANISM_TOKENS.some((t) => low.includes(t)) && !/\[/.test(out)) {
    out = `${out} by [how it works: the mechanism]`;
    changes.push({ component: 'unique', note: 'Added the mechanism. “What” is a claim; “how” is a differentiator.' });
  }
  if (contentWords(out).length < 2) {
    out = `[the one thing only you do] by [how it works]`;
  }
  return tidy(out);
}

function rewriteValue(v: string, f: Fields, changes: Change[]): string {
  if (!v.trim()) {
    changes.push({ component: 'value', note: 'Added a quantified outcome with a proof source.' });
    return 'cuts [key metric] by [X%] in [timeframe] ([proof source, e.g. median across N customers])';
  }
  let out = applyRules(v, 'value', changes);
  const vague = matchedTokens(out, VAGUE_VALUE);
  if (vague.length || contentWords(out).length < 2) {
    if (vague.length) {
      changes.push({ component: 'value', note: `Dropped ${vague.map((x) => `“${x}”`).join(', ')}. Not measurable, so not believable.` });
    }
    // Keep the user's subject ("helps analysts …") and rebuild around one metric.
    const subject = out.match(/^(helps?|lets?)\s+([\w-]+)\s+/i);
    const domainWords = contentWords(`${out} ${f.unique} ${f.category}`);
    const domain = domainWords.find((w) =>
      /^(security|soc|alert|triage|data|finance|invoice|close|sales|pipeline|fleet|cloud|support|ticket|hiring|churn)/.test(w),
    );
    const metric = `[key ${domain ? `${domain} ` : ''}metric]`;
    out = subject ? `helps ${subject[2]} cut ${metric} by [X%] in [timeframe]` : `cuts ${metric} by [X%] in [timeframe]`;
    changes.push({ component: 'value', note: 'Rebuilt the value line around one metric a buyer already tracks.' });
  } else if (!hasNumber(out) && !/\[.*(metric|%|x)/i.test(out)) {
    out = `${out} by [X%] in [timeframe]`;
    changes.push({ component: 'value', note: 'Added a slot for the number. No number, no budget.' });
  }
  if (!/(customer|median|average|across|verified|case study|benchmark|audited|pilot)/i.test(out)) {
    out = `${out} ([proof source, e.g. median across N customers])`;
    changes.push({ component: 'value', note: 'Added a proof source. A number without a source reads as marketing.' });
  }
  return tidy(out);
}

function rewriteCategory(c: string, f: Fields, changes: Change[]): string {
  let out = c.trim() ? applyRules(c, 'category', changes, '') : '';
  const sup = SUPERLATIVES.filter((s) => new RegExp(`(?<![a-z])${s.replace('#', '\\#')}(?![a-z])`, 'i').test(out));
  for (const s of sup) out = out.replace(new RegExp(`(?<![a-z])${s.replace('#', '\\#')}(?![a-z])\\s*`, 'i'), '');
  out = tidy(out);
  if (matchCategory(out) && contentWords(out).length >= 1) return out;
  const suggestion = suggestCategory(f);
  const all = `${f.category} ${f.unique} ${f.target} ${f.value} ${f.alternatives}`;
  const trigger = CATEGORY_SUGGESTIONS.find((s) => s.match.test(all));
  const cue = trigger ? all.match(trigger.match)?.[0] : null;
  if (trigger) {
    changes.push({
      component: 'category',
      note: `Suggested “${suggestion}” because your fields mention “${cue}”. Confirm it is the box your buyers budget for.`,
    });
    return suggestion;
  }
  changes.push({ component: 'category', note: 'Left a slot for a category buyers already budget for (2–4 words).' });
  return `[category buyers already budget for]${out ? ` (${out})` : ''}`;
}

function lcFirst(s: string) {
  if (/^[A-Z]{2,}/.test(s) || /^\[/.test(s)) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Produces an improved version of the user's own fields. Gaps become [placeholders]. */
export function rewritePositioning(company: string, f: Fields): RewriteResult {
  const changes: Change[] = [];
  const fields: Fields = {
    target: rewriteTarget(f.target, changes),
    alternatives: rewriteAlternatives(f.alternatives, changes),
    unique: rewriteUnique(f.unique, changes),
    value: rewriteValue(f.value, f, changes),
    category: rewriteCategory(f.category, f, changes),
  };
  const statement = composeStatement(company, fields);
  const placeholders = (statement.match(/\[[^\]]+\]/g) || []).length;
  const leftoverBuzz = uniqueBuzzwords(statement);
  if (!changes.length && !leftoverBuzz.length) {
    changes.push({ component: 'unique', note: 'Nothing to strip. This already reads like a specific claim. Tightened wording only.' });
  }
  return { fields, statement, before: composeStatement(company, f), changes, placeholders };
}
