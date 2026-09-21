import { AlertOctagon, AlertTriangle, CircleDot } from 'lucide-react';
import { useMemo } from 'react';
import { composeStatement } from '../logic/compose';
import { diffWords } from '../logic/diff';
import { formatDate } from '../logic/format';
import { generateObjections } from '../logic/objections';
import { rewritePositioning } from '../logic/rewrite';
import { COMPONENT_LABELS, scoreBand, scoreSnapshot } from '../logic/scoring';
import type { Persona, Report, Weights } from '../logic/types';
import { ScoreRing } from './spar/bits';
import { ComponentBars, ScoreRadar } from './spar/charts';
import { DiffView, PersonaCard, PreviewLegend, StatementPreview } from './spar/panels';
import { Badge } from './ui';

export function useReportData(report: Report, personas: Persona[], weights: Weights) {
  return useMemo(() => {
    const s = report.snapshot;
    const panel = s.personaIds.map((id) => personas.find((p) => p.id === id)).filter(Boolean) as Persona[];
    const list = panel.length ? panel : personas.filter((p) => p.enabled);
    const result = scoreSnapshot(s, weights);
    const objections = generateObjections(s.company, s.fields, s.mode, list, weights);
    const rewrite = rewritePositioning(s.company, s.fields);
    return { result, objections, panel: list, rewrite };
  }, [report, personas, weights]);
}

export function ReportDocument({ report, personas, weights }: { report: Report; personas: Persona[]; weights: Weights }) {
  const { result, objections, panel, rewrite } = useReportData(report, personas, weights);
  const s = report.snapshot;
  const counts = {
    dealbreaker: objections.filter((o) => o.severity === 'dealbreaker').length,
    serious: objections.filter((o) => o.severity === 'serious').length,
    minor: objections.filter((o) => o.severity === 'minor').length,
  };
  const weakest = (Object.keys(result.components) as (keyof typeof result.components)[]).sort((a, b) => result.components[a].score - result.components[b].score)[0];

  return (
    <article className="space-y-6">
      <header className="card overflow-hidden">
        <div className="grain border-b border-sand-200/80 bg-sand-900 px-6 py-6 text-sand-50 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ember-400">Positioning report</p>
          <h1 className="display mt-2 text-[30px] font-semibold leading-tight">{report.title}</h1>
          <p className="mt-2 text-sm text-sand-300">
            {s.company} · {s.mode} mode · run {formatDate(s.at)} · prepared by {report.createdBy}
          </p>
        </div>
        <div className="grid gap-6 px-6 py-6 sm:px-8 md:grid-cols-[auto_1fr]">
          <div className="flex items-center gap-5">
            <ScoreRing score={result.overall} size={128} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Summary icon={<AlertOctagon className="h-4 w-4 text-red-600" />} label="Deal-breakers" value={counts.dealbreaker} />
            <Summary icon={<AlertTriangle className="h-4 w-4 text-amber-600" />} label="Serious" value={counts.serious} />
            <Summary icon={<CircleDot className="h-4 w-4 text-sand-500" />} label="Minor" value={counts.minor} />
            <p className="text-[13.5px] leading-relaxed text-sand-700 sm:col-span-3">
              <span className="font-semibold text-sand-900">Verdict: {scoreBand(result.overall).label}.</span> The weakest component is{' '}
              <span className="font-semibold">{COMPONENT_LABELS[weakest].toLowerCase()}</span> ({result.components[weakest].score}/100):{' '}
              {result.components[weakest].explanation.charAt(0).toLowerCase() + result.components[weakest].explanation.slice(1)}
            </p>
          </div>
        </div>
      </header>

      <section className="card p-6 sm:p-8">
        <p className="label mb-3">Positioning statement as tested</p>
        <StatementPreview company={s.company} fields={s.fields} />
        <div className="mt-4 border-t border-sand-200/80 pt-3">
          <PreviewLegend />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <p className="label">Shape of the positioning</p>
          <ScoreRadar result={result} />
        </div>
        <div className="card p-6">
          <p className="label mb-4">Component scores</p>
          <ComponentBars result={result} weights={weights} />
        </div>
      </section>

      <section>
        <h2 className="display mb-3 text-xl font-semibold">What the panel said</h2>
        <div className="space-y-4">
          {objections.map((o) => {
            const p = panel.find((x) => x.id === o.personaId);
            return p ? <PersonaCard key={o.personaId} persona={p} objection={o} /> : null;
          })}
        </div>
      </section>

      <section className="card p-6 sm:p-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="display text-xl font-semibold">Suggested rewrite</h2>
          {rewrite.placeholders > 0 && <Badge tone="amber">{rewrite.placeholders} gaps to fill</Badge>}
        </div>
        <div className="rounded-xl bg-sand-50 p-4">
          <DiffView ops={diffWords(composeStatement(s.company, s.fields), rewrite.statement)} />
        </div>
        <ul className="mt-4 grid gap-x-6 gap-y-1.5 text-[13px] text-sand-600 md:grid-cols-2">
          {rewrite.changes.slice(0, 8).map((c, i) => (
            <li key={i}>
              <span className="font-semibold text-sand-800">{COMPONENT_LABELS[c.component]}:</span> {c.note}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}

function Summary({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-sand-200 bg-white px-4 py-3">
      <p className="flex items-center gap-1.5 text-[12px] font-medium text-sand-500">
        {icon}
        {label}
      </p>
      <p className="display mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
