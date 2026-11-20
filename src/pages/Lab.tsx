import { ArrowDown, ArrowRight, Code2 as Github } from 'lucide-react';
import type { ReactNode } from 'react';
import lab from '../data/lab.json';
import { Logo } from '../components/Logo';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const ROLE: Record<string, string> = {
  economic_buyer: 'Economic buyer',
  technical_evaluator: 'Technical evaluator',
  champion: 'Champion',
  procurement: 'Procurement',
  security_legal: 'Security & legal',
};
const REQ_SHORT: Record<string, string> = {
  M1: 'EU data hosting',
  M2: 'Self-serve funnels for PMs',
  M3: 'Works with our Snowflake warehouse',
  D1: 'Predictable pricing',
};
const SITE = 'https://avivbraun.com/?utm_source=foil&utm_medium=app&utm_campaign=portfolio&utm_content=lab_footer';
const REPO = 'https://github.com/Avivb9/foil';

function Section({ id, eyebrow, title, children }: { id?: string; eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="border-t border-neutral-200 py-14">
      <div className="font-mono text-xs uppercase tracking-[0.14em] text-ember-600">{eyebrow}</div>
      <h2 className="mt-2 max-w-3xl font-display text-3xl leading-tight text-neutral-900">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function heat(p: number) {
  if (p >= 0.75) return 'bg-rose-100 text-rose-900';
  if (p >= 0.4) return 'bg-amber-100 text-amber-900';
  return 'bg-emerald-50 text-emerald-900';
}

function Bar({ value, tone }: { value: number; tone: 'before' | 'after' }) {
  return (
    <div className="h-2.5 w-full rounded-full bg-neutral-100">
      <div className={`h-2.5 rounded-full ${tone === 'before' ? 'bg-neutral-400' : 'bg-ember-500'}`} style={{ width: `${Math.max(value * 100, 1.5)}%` }} />
    </div>
  );
}

export default function Lab() {
  const { brief, baseline, ab, reliability, judgeEval, totals } = lab;
  const [gem, groq] = reliability;

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-neutral-800">
      <nav className="sticky top-0 z-20 border-b border-neutral-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <a href="/lab" aria-label="Foil lab home">
            <Logo />
          </a>
          <div className="flex items-center gap-1 text-sm">
            <a href="#result" className="hidden rounded-md px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 sm:block">Results</a>
            <a href={REPO} className="hidden rounded-md px-3 py-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 sm:block">GitHub</a>
            <a href="/" className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-ember-500 px-3.5 py-1.5 font-medium text-white shadow-card hover:bg-ember-600">
              Open the app <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </nav>
      <div className="mx-auto max-w-5xl px-6">
        {/* Hero */}
        <header className="pb-14 pt-16">
          <div className="font-mono text-xs uppercase tracking-[0.14em] text-neutral-500">Foil · positioning lab</div>
          <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[1.05] text-neutral-900">
            Put your website in front of a buying committee of AI agents. See who blocks the deal, and which sentence changes their mind.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neutral-600">
            Foil simulates a B2B buying committee with five AI agents. Each one reads a frozen copy of competing vendors' pages and judges every requirement it owns, quoting the page. Code verifies every quote, code decides the deal, and every finding is re-run until it's statistically clear. Then you edit one paragraph and measure whether the committee moves.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {[
              [`${totals.committeeRuns}`, 'committee runs'],
              [`${totals.agentCalls}`, 'agent calls'],
              [`$${totals.costUsd}`, 'spent (free tiers)'],
              [pct(judgeEval.gemini.agreement), 'agreement with a PMM'],
            ].map(([n, l]) => (
              <div key={l} className="rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-card">
                <div className="font-display text-2xl text-neutral-900">{n}</div>
                <div className="text-xs text-neutral-500">{l}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-4 text-sm">
            <a href="#result" className="inline-flex items-center gap-1.5 rounded-lg bg-ember-500 px-4 py-2 font-medium text-white shadow-card hover:bg-ember-600">
              See the result <ArrowDown size={15} />
            </a>
            <a href={REPO} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-4 py-2 font-medium shadow-card hover:border-neutral-300">
              <Github size={15} /> Code, data and evals
            </a>
          </div>
        </header>

        {/* The deal */}
        <Section eyebrow="The deal" title="A Series B in Berlin is choosing product analytics.">
          <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
            <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm leading-relaxed">
              <p><b>Buyer:</b> {brief.buyer}</p>
              <p className="mt-2"><b>Need:</b> {brief.need}</p>
              <p className="mt-2"><b>Budget:</b> {brief.budget}</p>
              <p className="mt-2"><b>If nothing is bought:</b> {brief.statusQuo}</p>
              <p className="mt-4 text-neutral-500">Vendors: PostHog, Mixpanel, Amplitude. Two public pages each, frozen on 19 Nov 2026, so every run reads exactly the same text.</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <div className="text-sm font-medium text-neutral-900">Every requirement has an owner</div>
              <p className="mt-1 text-xs text-neutral-500">For its owner, "unclear" is a blocker. Like a real committee.</p>
              <ul className="mt-4 space-y-3 text-sm">
                {brief.requirements.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-3">
                    <span>{r.kind === 'deal_breaker' ? 'No unpredictable pricing' : r.text}</span>
                    <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-[11px] text-neutral-600">{ROLE[r.owner]}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* Finding 1 */}
        <Section eyebrow="Finding 1" title={`On public pages alone, nobody wins: ${pct(baseline.noDecision.p)} of committees end in "no decision".`}>
          <p className="max-w-3xl text-neutral-600">
            Share of {baseline.runs} runs in which the requirement's owner could not confirm it from the vendor's pages. EU hosting and self-serve are settled. Two things block everyone: the warehouse and pricing. That's a messaging gap, not a product gap.
          </p>
          <p className="mt-6 font-mono text-[11px] text-neutral-500">Cells: % of runs in which the owner blocked the vendor</p>
          <div className="mt-2 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs text-neutral-500">
                  <th className="px-4 py-3 font-medium">Requirement (owner)</th>
                  {lab.vendors.map((v) => (
                    <th key={v} className="px-4 py-3 font-medium">{v}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {baseline.matrix.map((row) => (
                  <tr key={row.req} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-3">
                      {REQ_SHORT[row.req]} <span className="text-neutral-400">· {ROLE[row.owner]}</span>
                    </td>
                    {row.cells.map((c) => (
                      <td key={c.vendor} className="px-4 py-3">
                        <span className={`inline-block min-w-[3.25rem] rounded-md px-2 py-1 text-center font-mono text-xs ${heat(c.blocked.p)}`}>{pct(c.blocked.p)}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Finding 2 */}
        <Section id="result" eyebrow="Finding 2 · the experiment" title="One paragraph flipped a stakeholder. Another one backfired.">
          <p className="max-w-3xl text-neutral-600">
            We added two short proof paragraphs to the frozen copy of {ab.vendor}'s pricing page, one for the warehouse and one for pricing. The other five pages stayed byte-identical. Same model, same prompt, re-run and compared.
          </p>
          <blockquote className="mt-6 rounded-xl border-l-4 border-ember-500 bg-white p-5 text-sm leading-relaxed text-neutral-700">
            {ab.insert.split('\n').map((l, i) => (i % 2 === 0 ? <div key={i} className={`font-medium text-neutral-900 ${i ? 'mt-3' : ''}`}>{l}</div> : <p key={i}>{l}</p>))}
            <span className="mt-3 block font-mono text-[11px] text-neutral-400">Hypothetical copy written for this test, not {ab.vendor}'s real page.</span>
          </blockquote>

          <div className="mt-8 space-y-5">
            {ab.rows.map((r) => (
              <div key={r.label} className="grid items-center gap-3 md:grid-cols-[1.3fr_2fr_5.5rem]">
                <div className="text-sm">{r.label}</div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="w-14 shrink-0 font-mono text-xs text-neutral-500">before</span>
                    <Bar value={r.before.p} tone="before" />
                    <span className="w-10 text-right font-mono text-xs">{pct(r.before.p)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-14 shrink-0 font-mono text-xs text-neutral-500">after</span>
                    <Bar value={r.after.p} tone="after" />
                    <span className="w-10 text-right font-mono text-xs">{pct(r.after.p)}</span>
                  </div>
                </div>
                <div className="font-mono text-[11px] text-neutral-500">{r.p < 0.001 ? 'p < 0.001' : `p = ${r.p.toFixed(2)}`}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="font-display text-3xl text-neutral-900">
                {ab.support.before.toFixed(1)} <ArrowRight className="inline" size={20} /> {ab.support.after.toFixed(1)}
              </div>
              <div className="mt-1 text-sm text-neutral-600">committee members (of 5) backing {ab.vendor}</div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 md:col-span-2 text-sm leading-relaxed text-neutral-700">
              <b>Read it like a PMM:</b> the warehouse proof removed the technical objection completely. The pricing copy made procurement <i>more</i> suspicious: "spending cap" draws attention to usage-based billing instead of answering "what will this cost us?". With procurement owning pricing, the deal still stalls. Next test: show the price at the buyer's volume.
            </div>
          </div>
        </Section>

        {/* Finding 3 */}
        <Section eyebrow="Finding 3 · evals" title="Can you trust AI buyers? Measured, not assumed.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <div className="text-sm font-medium text-neutral-900">The judge vs. a PMM's answer key</div>
              <p className="mt-1 text-xs text-neutral-500">{judgeEval.items} vendor × requirement items, same excerpts. κ corrects for lucky guesses.</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between"><span>AI judge (Gemini)</span><span className="font-mono">{pct(judgeEval.gemini.agreement)} · κ {judgeEval.gemini.kappa.toFixed(2)}</span></div>
                <div className="flex justify-between text-neutral-500"><span>Keyword-matching baseline</span><span className="font-mono">{pct(judgeEval.keyword.agreement)} · κ {judgeEval.keyword.kappa.toFixed(2)}</span></div>
                <div className="flex justify-between text-neutral-500"><span>Same verdict across repeats</span><span className="font-mono">{pct(judgeEval.stable)}</span></div>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-neutral-500">Every miss was on pricing or the warehouse; the judge is harsher on usage-based pricing than the PMM.</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-white p-6">
              <div className="text-sm font-medium text-neutral-900">Two model families, very different reliability</div>
              <p className="mt-1 text-xs text-neutral-500">Quotes checked by exact string match against the page. No AI grades the AI.</p>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-neutral-500">
                    <th className="pb-2 font-medium" />
                    <th className="pb-2 font-medium">Gemini 3.5 Flash Lite</th>
                    <th className="pb-2 font-medium">gpt-oss-120b</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr><td className="py-1 font-sans">Quotes that exist on the page</td><td>{pct(gem.quotes.p)}</td><td>{pct(groq.quotes.p)}</td></tr>
                  <tr><td className="py-1 font-sans">Agents contradicting themselves</td><td>{pct(gem.contradictions.p)}</td><td>{pct(groq.contradictions.p)}</td></tr>
                </tbody>
              </table>
              <p className="mt-4 text-xs leading-relaxed text-neutral-500">Contradictions never change an outcome: the decision is computed by code from per-requirement verdicts, not from what the model says it prefers.</p>
            </div>
          </div>
        </Section>

        {/* How it works */}
        <Section eyebrow="How it works" title="Built so the AI can be wrong without the result being wrong.">
          <ol className="grid gap-4 md:grid-cols-3">
            {[
              ['Freeze', 'Snapshot every vendor page once, with a fingerprint. Every run reads identical text, so an edit is a controlled experiment.'],
              ['Retrieve', 'Per-role evidence packs (BM25, coverage-first): each agent sees the passages relevant to what it owns. Same evidence for every model.'],
              ['Judge', 'Five role agents rate every vendor on every requirement: met, not met or unclear, with a quote.'],
              ['Verify', 'Every quote is string-matched against the page. A "met" without a real quote is downgraded to "unclear".'],
              ['Decide', 'Code, not the model: requirement owners block, roles vote, "no decision" is a candidate, the economic buyer can veto.'],
              ['Measure', 'Repeat runs, Wilson intervals, two-proportion tests, a placebo check on unedited vendors, and a judge scored against a PMM.'],
            ].map(([t, d], i) => (
              <li key={t} className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="font-mono text-xs text-ember-600">0{i + 1}</div>
                <div className="mt-1 font-medium text-neutral-900">{t}</div>
                <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{d}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-neutral-500">
            Stack: TypeScript, Vercel functions, Supabase (Postgres + pg_cron as an unattended experiment runner), Gemini and Groq free tiers. Total model spend: $0.
          </p>
        </Section>

        {/* Limits */}
        <Section eyebrow="Limits" title="What this is not.">
          <ul className="max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-neutral-600">
            <li>A rehearsal, not ground truth. Real buyers also read reviews, ask peers and talk to sales.</li>
            <li>One deal, three vendors, two pages each. Agents read text excerpts, not full sites.</li>
            <li>Free-tier models, about 20 runs per condition: only large effects reach significance.</li>
            <li>The edited copy is hypothetical and says nothing about the vendors' actual products.</li>
          </ul>
        </Section>

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200 py-10 text-sm text-neutral-500">
          <span>
            Designed and built by{' '}
            <a href={SITE} className="text-neutral-900 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900">
              Aviv Braun
            </a>
            , product marketer.
          </span>
          <a href={REPO} className="inline-flex items-center gap-1.5 hover:text-neutral-900">
            <Github size={15} /> Avivb9/foil
          </a>
        </footer>
      </div>
    </div>
  );
}
