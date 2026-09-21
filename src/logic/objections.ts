import { KNOWN_CATEGORIES, SUPERLATIVES, VAGUE_ALTERNATIVES } from '../data/lexicon';
import { composeStatement, leadSentence } from './compose';
import { matchCategory, namedSystems, properNouns, scorePositioning } from './scoring';
import {
  contentWords,
  countPlaceholders,
  findBuzzwords,
  hasNumber,
  matchedTokens,
  pick,
  quotePhrase,
  stripPlaceholders,
  trimEnd,
  wordCount,
} from './text';
import type { Fields, Lens, Objection, Persona, PressureMode, ScoreResult, Severity, Weights } from './types';

interface Ctx {
  company: string;
  f: Fields;
  s: ScoreResult;
  mode: PressureMode;
  statement: string;
  lead: string;
  seed: string;
  persona: Persona;
}

type Draft = Omit<Objection, 'personaId' | 'severity'>;

const THRESHOLDS: Record<PressureMode, [number, number]> = {
  friendly: [28, 55],
  tough: [40, 68],
  brutal: [52, 80],
};

export function severityFor(score: number, mode: PressureMode): Severity {
  const [deal, serious] = THRESHOLDS[mode];
  if (score < deal) return 'dealbreaker';
  if (score < serious) return 'serious';
  return 'minor';
}

const q = (text: string, n = 9) => `“${quotePhrase(text, n)}”`;

function firstAlternative(f: Fields): string {
  const clean = stripPlaceholders(f.alternatives);
  const named = properNouns(clean);
  if (named.length) {
    // grow the proper noun to include a following capitalised word, e.g. "Splunk SOAR"
    const m = clean.match(new RegExp(`${named[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s+[A-Z][A-Za-z0-9]+)*`));
    return m ? m[0] : named[0];
  }
  const vague = VAGUE_ALTERNATIVES.find((v) => clean.toLowerCase().includes(v));
  if (vague) return `“${vague}”`;
  if (clean) return trimEnd(clean.split(/,|\band\b|\bor\b/)[0]).toLowerCase();
  return 'every other vendor in your space';
}

function soften(text: string, ctx: Ctx, sev: Severity): string {
  if (ctx.mode === 'friendly' && sev !== 'minor') return `${pick(['Honestly, ', 'Candidly, ', 'Gently: '], ctx.seed + ctx.persona.id)}${text.charAt(0).toLowerCase()}${text.slice(1)}`;
  if (ctx.mode === 'brutal' && sev === 'dealbreaker') return `${text} ${pick(['Next.', 'Hard pass.', 'I’d walk.', 'Try again.'], ctx.seed + ctx.persona.id)}`;
  return text;
}

/** Seconds to say a line on a cold call: ~140 wpm, plus the half-second stumble every buzzword costs. */
export function readAloudSeconds(line: string): number {
  return Math.max(2, Math.round(wordCount(line) / 2.3 + findBuzzwords(line).length * 0.5));
}

/** Lowercases the first letter unless the word is an acronym (keeps “AI”, “SOC”). */
function speakable(s: string): string {
  return s.replace(/^([A-Z])(?![A-Z])/, (c) => c.toLowerCase());
}

/** Builds a spoken one-liner from the target and value fields. */
function openerFrom(f: Fields): string {
  const tgt = trimEnd(stripPlaceholders(f.target))
    .replace(/\s*\([^)]*\)/g, '')
    .split(/,|\s+(?:running|who|using|with|that)\s+/i)[0]
    .trim();
  let val = trimEnd(stripPlaceholders(f.value)).split(/,|\s+across\s+|\s+\(/i)[0].trim();
  // "cuts X" → "cut X" so it reads after "We help …"
  val = val.replace(/^(\w+?)(es|s)\b/, (_m, stem: string, suf: string) => (suf === 'es' && !/(sh|ch|x|ss)$/.test(stem) ? `${stem}e` : stem));
  if (/^(deliver|provide|offer)\b/i.test(val)) val = `get ${val.replace(/^\w+\s+/, '')}`;
  if (!tgt && !val) return 'We help teams like yours.';
  return `We help ${speakable(tgt) || 'teams like yours'}${val ? ` ${speakable(val)}` : ''}.`;
}

// ─── Lens templates ────────────────────────────────────────────────────────

const LENS_TEMPLATES: Record<Lens, (ctx: Ctx) => { draft: Draft; score: number }> = {
  budget: (ctx) => {
    const { f, s } = ctx;
    const v = f.value;
    const score = s.components.value.score;
    const num = hasNumber(v);
    const proof = /(customer|median|average|across|verified|case study|benchmark|audited|pilot)/i.test(v);
    const money = /(payback|roi|cost|\$|budget|spend|savings|headcount|month)/i.test(v);
    const quote = v.trim() ? q(v) : q(ctx.lead);
    let gut: string;
    let objection: string;
    let fix: string;
    if (!v.trim() || (!num && !countPlaceholders(v))) {
      gut = pick([`I stopped reading at ${quote}. There isn’t a number in here I could take to my CEO.`, `Nice words. Where’s the number?`], ctx.seed);
      objection = `You say ${quote}. Compared to what, and by whose count? I approve spend against a payback period, and this gives me nothing to calculate.`;
      fix = 'Add one quantified outcome with its source, e.g. “cuts X from A to B (median across N customers)”, plus a payback estimate.';
    } else if (!num) {
      gut = 'You’ve left a slot for the number. That’s honest. It’s also not something I can approve yet.';
      objection = `${quote} is a template, not a business case. Fill in the metric and I’ll run the payback math myself.`;
      fix = 'Replace the [metric] placeholder with a real before/after number from a customer you can reference.';
    } else if (!proof) {
      gut = 'There’s a number. I just can’t tell whose number it is.';
      objection = `${quote} is a nice claim. Is it one design partner or your whole base? If it’s a median across customers, say so. If it’s your best case, I’ll assume it’s your best case.`;
      fix = 'Attach a proof source to the number: sample size, median vs. best case, and a customer who’ll take a reference call.';
    } else if (!money) {
      gut = 'The proof is real. Now translate it into money.';
      objection = `${quote} tells me what improves, not what it saves me or when I break even. What’s the payback in months?`;
      fix = 'Convert the outcome into dollars or headcount and add a payback period.';
    } else {
      gut = severityFor(score, ctx.mode) === 'minor' ? 'This I can model. It’s a line I can put in a spreadsheet.' : 'I can almost model this. Almost.';
      objection = `My only remaining question is risk. If the rollout stalls at month three, what happens to ${quote}? Put a pilot or an exit clause next to the proof.`;
      fix = 'Pair the proof with a de-risking offer: a scoped pilot, a success metric, or an exit clause.';
    }
    return { draft: { component: 'value', gut, objection, fix, quote }, score };
  },

  differentiation: (ctx) => {
    const { f, s } = ctx;
    const score = Math.round(s.components.unique.score * 0.65 + s.components.alternatives.score * 0.35);
    const alt = firstAlternative(f);
    const quote = f.unique.trim() ? q(f.unique) : q(ctx.lead);
    const uw = contentWords(f.unique);
    const aw = new Set(contentWords(f.alternatives));
    const overlap = uw.length ? uw.filter((w) => aw.has(w)).length / uw.length : 0;
    let gut: string;
    let objection: string;
    const sev = severityFor(score, ctx.mode);
    if (sev === 'dealbreaker') {
      gut = `So you’re basically ${alt} with a new label.`;
      objection =
        overlap >= 0.25
          ? `Half of ${quote} is our own language. I’ll just nod and tell your prospect “we do that too,” and they’ll believe me because it’s literally the same words.`
          : `You wrote ${quote}. I say that on every call too. I’ll tell your prospect we’ve done that for years and send them our analyst report. You won’t get a second meeting.`;
    } else if (sev === 'serious') {
      gut = pick([`I can blur this. Give me one call.`, `There’s something here, but I can still say “we do that too.”`], ctx.seed);
      objection = `${quote} is closer. But you haven’t said why ${alt} can’t do it. Until you name what we structurally can’t copy, I’ll position it as a feature we’ll ship next quarter.`;
    } else {
      gut = 'Annoying. That one’s hard for me to match.';
      objection = `I can’t honestly say we do ${quote}, so I’ll attack your proof and your company size instead. Make sure your references are ready.`;
    }
    const fix =
      sev === 'minor'
        ? 'Arm the field with two references and a head-to-head proof point against the named alternative.'
        : 'Name the one thing only you do and the mechanism behind it. If a competitor can say your sentence unchanged, it’s not a differentiator.';
    return { draft: { component: 'unique', gut, objection, fix, quote }, score };
  },

  technical: (ctx) => {
    const { f, s } = ctx;
    const all = `${f.unique} ${f.target} ${f.alternatives} ${f.value}`;
    const integrations = namedSystems(all);
    const buzz = findBuzzwords(f.unique).map((m) => m.term);
    const mech = s.components.unique.findings.some((x) => x.startsWith('+ Explains the mechanism'));
    let score = s.components.unique.score;
    if (!integrations.length) score -= 8;
    const quote = f.unique.trim() ? q(f.unique, 10) : q(ctx.lead);
    let gut: string;
    let objection: string;
    let fix: string;
    if (!f.unique.trim() || (!mech && buzz.length)) {
      gut = 'I have no idea what this actually does.';
      objection = `What does ${quote} mean at the API level? What does it read, what does it write, and what do I have to wire it into?${integrations.length ? '' : ' You don’t name a single system you connect to.'}`;
      fix = 'Replace adjectives with the mechanism: the input, what it does with it, the output. Name the one or two systems it plugs into.';
    } else if (!mech) {
      gut = 'I get the what. I still don’t get the how.';
      objection = `${quote} could be a rules engine, a model or a person in a back office. Which is it? My team will ask on the first call and so should your homepage.`;
      fix = 'Add one clause that explains how it works (“by …”), in words an engineer would use.';
    } else if (!integrations.length) {
      gut = 'The mechanism makes sense. Now show me the plumbing.';
      objection = `${quote} works on what data, from which systems? If I can’t see the integration list, I assume it’s a six-month services project.`;
      fix = 'Name the systems it reads from and writes to, and how long setup takes.';
    } else {
      gut = severityFor(score, ctx.mode) === 'minor' ? 'Clear enough to scope.' : 'Clear enough to scope. Not yet clear enough to buy.';
      objection = `I’d want the ${integrations[0]} integration docs and a data-flow diagram before the second call, but ${quote} is specific enough that I can evaluate it.`;
      fix = 'Link the integration docs and a security overview from the first-call deck.';
    }
    return { draft: { component: 'unique', gut, objection, fix, quote }, score: Math.max(0, score) };
  },

  clarity: (ctx) => {
    const { s, lead, company, f } = ctx;
    const leadBuzz = findBuzzwords(lead);
    const secs = readAloudSeconds(lead);
    let score = Math.round((s.components.target.score + s.components.category.score + s.components.value.score) / 3) + s.readability.adjustment * 2;
    if (secs > 8) score -= (secs - 8) * 3;
    score -= leadBuzz.length * 6;
    score = Math.max(0, Math.min(100, score));
    const sev = severityFor(score, ctx.mode);
    const buzzQuote = leadBuzz.length ? `“${quotePhrase(lead, 6, [leadBuzz[0].term])}”` : q(lead, 7);
    const words = lead.replace(/\.$/, '').split(/\s+/);
    const opener = words.slice(company.split(/\s+/).length + 1, Math.min(words.length, 14)).join(' ');
    let gut: string;
    let objection: string;
    let extraText: string;
    if (sev !== 'minor') {
      gut =
        secs > 8
          ? `I’ve got 8 seconds before they hang up, and your first line takes ${secs} to say.`
          : `It fits in 8 seconds. It just doesn’t tell them anything they’d remember.`;
      objection = leadBuzz.length
        ? `By the time I get to ${buzzQuote}, they’ve heard it from three other vendors this week. I can’t repeat this without reading it off a card.`
        : `${q(lead, 10)} makes sense on a slide. Out loud, I lose them before I get to who it’s for.`;
      extraText = `“Hi, it’s Tyler from ${company}. So we’re, um… ${speakable(opener)}… basically?” (pause) “Sorry, what is it you do?” *click*`;
    } else {
      const line = openerFrom(f);
      const lineSecs = Math.max(2, Math.round(wordCount(line) / 2.3));
      gut = secs > 12 ? 'Long on paper, but concrete enough that I can cut it down.' : 'I could say this from memory. That never happens.';
      objection = `The first line runs ${secs} seconds as written. My version below takes about ${lineSecs}, and every word of it came from your fields.`;
      extraText = `“Hi Sam, Tyler from ${company}. ${line} Worth 20 minutes Thursday?”`;
    }
    const fix =
      sev === 'minor'
        ? 'Turn this into a two-line opener and a voicemail script for the SDR team.'
        : 'Make the first sentence say who it’s for and what changes, in under 20 words, with zero buzzwords. Test it: could Tyler say it without looking?';
    return {
      draft: { component: 'statement', gut, objection, fix, quote: q(lead, 10), extra: { label: 'How the cold call goes', text: extraText } },
      score,
    };
  },

  category: (ctx) => {
    const { f, s } = ctx;
    const score = s.components.category.score;
    const known = matchCategory(stripPlaceholders(f.category));
    const quote = f.category.trim() ? q(f.category, 8) : q(ctx.lead);
    let gut: string;
    let objection: string;
    let fix: string;
    if (!f.category.trim()) {
      gut = 'I can’t file this.';
      objection = 'You never say what you are. When a buyer asks me for a shortlist, which list do I put you on? Right now, none.';
      fix = 'Name a category buyers already search for (2–4 words), then say how you’re different inside it.';
    } else if (/\[/.test(f.category) && !known) {
      gut = 'You’ve left the box empty. At least you know it.';
      objection = 'Pick a category buyers already have budget for, or budget for a multi-year category-creation effort. There isn’t a third option.';
      fix = 'Choose an existing category and win a sub-segment of it before trying to create a new one.';
    } else if (known) {
      const peers = (KNOWN_CATEGORIES.find((k) => k.label === known.label)?.peers ?? []).join(', ');
      const sev = severityFor(score, ctx.mode);
      gut =
        sev === 'minor'
          ? `Clean. You belong in the ${known.label} box.`
          : sev === 'serious'
            ? `You’re in the ${known.label} box. Now prove you win there.`
            : `You’re in the ${known.label} box, whether you meant it or not.`;
      objection = `That puts you next to ${peers}. Where’s the evidence you win there? ${hasNumber(f.value) ? 'Your number helps, but I need to know how it was calculated.' : 'I don’t see a single number I could cite.'}`;
      fix = hasNumber(f.value)
        ? 'Publish the method behind the headline number and add a named customer I can call.'
        : `Add one proof point that beats ${peers.split(',')[0]} on a metric buyers already compare.`;
    } else {
      const sup = matchedTokens(f.category, SUPERLATIVES);
      gut = sup.length ? `“${sup[0]}” according to whom?` : 'I don’t recognise this as a category.';
      objection = `${quote} isn’t a box anyone budgets for. Buyers will file you under whatever sounds closest, and then compare you to the market leader on their terms.`;
      fix = 'Name a category buyers already search for (2–4 words), then say how you’re different inside it.';
    }
    return { draft: { component: 'category', gut, objection, fix, quote }, score };
  },

  procurement: (ctx) => {
    const { f, s } = ctx;
    const score = Math.round((s.components.target.score + s.components.value.score) / 2);
    const quote = f.target.trim() ? q(f.target) : q(ctx.lead);
    const sev = severityFor(score, ctx.mode);
    const gut = sev === 'minor' ? 'I know whose budget this is. Send the security pack.' : 'Before I care what it does: whose budget is this, and what’s the vendor risk?';
    const objection =
      sev === 'minor'
        ? `${quote} tells me the budget owner. I’ll need SOC 2, a DPA and a price range before legal gets involved.`
        : `${quote} doesn’t tell me which budget line this comes out of or who owns the vendor relationship. Without that, it sits in my queue for a quarter.`;
    const fix = 'Name the budget owner in the target customer and anchor the value to a cost line procurement already tracks.';
    return { draft: { component: 'target', gut, objection, fix, quote }, score };
  },

  legal: (ctx) => {
    const { f, s } = ctx;
    const all = `${f.category} ${f.unique} ${f.value}`;
    const sup = matchedTokens(all, SUPERLATIVES);
    const unprovenNumber = hasNumber(f.value) && !/(customer|median|average|across|verified|case study|benchmark|audited)/i.test(f.value);
    const score = sup.length ? Math.max(0, 45 - sup.length * 15 - s.buzzwords.length * 3) : unprovenNumber ? 55 : 92;
    let gut: string;
    let objection: string;
    let quote: string;
    if (sup.length) {
      quote = `“${quotePhrase(all, 6, [sup[0]])}”`;
      gut = 'I’d redline this before it ships.';
      objection = `${quote} is a comparative claim. Can we substantiate it if a competitor challenges it? If not, it’s a liability, not a message.`;
    } else if (unprovenNumber) {
      quote = q(f.value);
      gut = 'Every number needs a footnote we can defend.';
      objection = `${quote} needs a documented source, a date and a sample size in the claims file before it goes on the website.`;
    } else {
      quote = q(ctx.lead, 8);
      gut = 'Nothing I’d block.';
      objection = 'No superlatives, no unsupported numbers. Keep the source for every figure in the claims file and we’re fine.';
    }
    const fix = sup.length ? `Drop “${sup[0]}” or cite the independent source that says so.` : 'Keep a claims file: every number, its source, its date.';
    return { draft: { component: 'value', gut, objection, fix, quote }, score };
  },
};

/** Generates one objection per enabled persona, using that persona’s lens. */
export function generateObjections(
  company: string,
  f: Fields,
  mode: PressureMode,
  personas: Persona[],
  weights?: Weights,
): Objection[] {
  const s = scorePositioning(company, f, mode, weights);
  const statement = composeStatement(company, f);
  const lead = leadSentence(statement) || statement;
  return personas.map((persona) => {
    const ctx: Ctx = { company: company.trim() || 'Your product', f, s, mode, statement, lead, seed: statement, persona };
    const { draft, score } = LENS_TEMPLATES[persona.lens](ctx);
    const severity = severityFor(score, mode);
    return { ...draft, gut: soften(draft.gut, ctx, severity), personaId: persona.id, severity };
  });
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  minor: 'Minor',
  serious: 'Serious',
  dealbreaker: 'Deal-breaker',
};
