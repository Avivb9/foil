// npx tsx scripts/judge-report.ts data/judge-eval-v1.json docs/JUDGE-EVAL.md
// Scores each judge (model majority over repeats, single repeats, keyword baseline)
// against the reference labels. Deterministic; no model calls.
import { readFileSync, writeFileSync } from 'node:fs';
import { agreement, cohenKappa, mode, wilson } from '../api/_lib/stats';

type L = 'met' | 'not_met' | 'unclear';
const [, , inPath = 'data/judge-eval-v1.json', outPath = 'docs/JUDGE-EVAL.md'] = process.argv;
const d = JSON.parse(readFileSync(inPath, 'utf8')) as {
  experiment: string;
  snapshot: string;
  judgePrompt: string;
  referenceLabeller: string;
  labels: Record<string, [L, string]>;
  humanLabels: Record<string, L>;
  keywordBaseline: Record<string, L>;
  judges: Record<string, string[]>;
};

const LETTER: Record<string, L> = { m: 'met', n: 'not_met', u: 'unclear' };
const items = Object.keys(d.labels);
const ref = items.map((i) => d.labels[i][0]);

// per provider: item -> verdicts across repeats
const byJudge: Record<string, Record<string, L[]>> = {};
for (const [p, runs] of Object.entries(d.judges)) {
  byJudge[p] = {};
  for (const run of runs)
    for (const tok of run.split(' ')) {
      const [id, code] = tok.split('=');
      (byJudge[p][id] ??= []).push(LETTER[code[0]]);
    }
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const row = (name: string, preds: L[]) => {
  const k = preds.filter((p, i) => p === ref[i]).length;
  const w = wilson(k, preds.length);
  return { name, acc: agreement(preds, ref), lo: w.lo, hi: w.hi, kappa: cohenKappa(preds, ref), k, n: preds.length };
};

const rows = [];
for (const p of Object.keys(byJudge)) {
  const maj = items.map((i) => mode(byJudge[p][i] ?? ['unclear']) as L);
  rows.push(row(`${p} (majority of ${Math.max(...items.map((i) => byJudge[p][i]?.length ?? 0))} runs)`, maj));
  // average single-run accuracy
  const reps = Math.min(...items.map((i) => byJudge[p][i]?.length ?? 0));
  const singles = Array.from({ length: reps }, (_, r) => row('', items.map((i) => byJudge[p][i][r])));
  const avg = singles.reduce((a, s) => a + s.acc, 0) / singles.length;
  const avgK = singles.reduce((a, s) => a + s.kappa, 0) / singles.length;
  rows.push({ name: `${p} (single run, average)`, acc: avg, lo: NaN, hi: NaN, kappa: avgK, k: NaN, n: items.length });
}
rows.push(row('keyword baseline', items.map((i) => d.keywordBaseline[i])));

const out: string[] = [];
const line = (s = '') => out.push(s);
line(`# Judge evaluation — ${d.experiment}`);
line();
line(`Snapshot \`${d.snapshot}\` · judge prompt \`${d.judgePrompt}\` · ${items.length} items (3 vendors × 10 requirements)`);
line();
line(`**Answer key:** labelled by ${d.referenceLabeller}. Every label is in \`data/${inPath.split('/').pop()}\`.`);
line();
line('Question: given the same excerpts, does the AI judge reach the same verdict (met / not met / unclear)?');
line();
line('## Accuracy against the answer key');
line();
line('| Judge | Agreement | 95% CI | Cohen\'s κ |');
line('|---|---|---|---|');
for (const r of rows)
  line(`| ${r.name} | ${pct(r.acc)}${Number.isFinite(r.k) ? ` (${r.k}/${r.n})` : ''} | ${Number.isFinite(r.lo) ? `${pct(r.lo)}–${pct(r.hi)}` : '—'} | ${r.kappa.toFixed(2)} |`);
line();
line('κ corrects for chance: 0 = no better than guessing the label mix, 1 = perfect. The keyword baseline says "met" whenever a related word appears, which is right more often than you would think, but its κ is less than half that of the model.');
line();

// self-consistency
line('## Self-consistency across repeats');
line();
for (const p of Object.keys(byJudge)) {
  const stable = items.filter((i) => new Set(byJudge[p][i]).size === 1).length;
  line(`- **${p}:** gave the same verdict in every repeat on ${stable} of ${items.length} items (${pct(stable / items.length)}).`);
}
line();

// confusion + disagreements
for (const p of Object.keys(byJudge)) {
  const maj = items.map((i) => mode(byJudge[p][i]) as L);
  line(`## Where ${p} disagrees with the answer key`);
  line();
  line('| Item | Answer key | Model (all repeats) |');
  line('|---|---|---|');
  items.forEach((id, k) => {
    if (maj[k] !== ref[k]) line(`| ${id} | ${ref[k]} | ${byJudge[p][id].join(', ')} |`);
  });
  line();
  const cats: L[] = ['met', 'not_met', 'unclear'];
  line('Confusion (rows = answer key, columns = model majority):');
  line();
  line(`| | ${cats.join(' | ')} |`);
  line('|---|---|---|---|');
  for (const c of cats) line(`| **${c}** | ${cats.map((m) => items.filter((_, k) => ref[k] === c && maj[k] === m).length).join(' | ')} |`);
  line();
}

if (Object.keys(d.humanLabels).length) {
  line('## Human spot-check');
  line();
  for (const [id, l] of Object.entries(d.humanLabels))
    line(`- ${id}: human said **${l}**, reference says **${d.labels[id][0]}**${l === d.labels[id][0] ? ' (agree)' : ' (disagree: a borderline item, see reason)'}.`);
  line();
}

writeFileSync(outPath, out.join('\n') + '\n');
console.log(out.join('\n'));
