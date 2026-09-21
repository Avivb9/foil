import { AnimatePresence, motion } from 'framer-motion';
import {
  BookmarkPlus,
  ChevronDown,
  ChevronRight,
  Copy,
  CopyPlus,
  FastForward,
  FileText,
  FlaskConical,
  Gauge,
  MoreHorizontal,
  Play,
  Sparkles,
  Swords,
  Trash2,
  Users,
  Wand2,
  Eraser,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { COMPONENT_COLORS, DeltaChip, ScoreRing } from '../components/spar/bits';
import { ComponentBars, ScoreRadar, Sparkline } from '../components/spar/charts';
import { FieldsEditor } from '../components/spar/FieldsEditor';
import { HistoryPanel } from '../components/spar/HistoryPanel';
import { PersonaCard, PersonaCardSkeleton, PreviewLegend, StatementPreview } from '../components/spar/panels';
import { RewritePanel } from '../components/spar/RewritePanel';
import { Avatar, Badge, Button, EmptyState, Field, IconButton, Menu, Modal, Segmented, Tabs, cx, modKey, type BadgeTone } from '../components/ui';
import { EMPTY_FIELDS, EXAMPLES } from '../data/examples';
import { composeStatement, leadSentence } from '../logic/compose';
import { relativeTime } from '../logic/format';
import { generateObjections, readAloudSeconds } from '../logic/objections';
import { COMPONENT_KEYS, COMPONENT_SHORT, scorePositioning, scoreSnapshot } from '../logic/scoring';
import { wordCount } from '../logic/text';
import type { ComponentKey, Objection, Persona, PressureMode, RunSnapshot, ScoreResult, Spar, SparStatus } from '../logic/types';
import { uid, useApp } from '../store/app';
import { copyText, toast } from '../store/ui';
import NotFound from './NotFound';

export const STATUS_TONE: Record<SparStatus, BadgeTone> = {
  Draft: 'neutral',
  'Needs work': 'red',
  'In review': 'amber',
  'Launch-ready': 'green',
};

const MODES: { value: PressureMode; label: string; title: string }[] = [
  { value: 'friendly', label: 'Friendly', title: 'Lenient scoring, softer tone. For early drafts.' },
  { value: 'tough', label: 'Tough', title: 'The default: how a real buying committee reacts.' },
  { value: 'brutal', label: 'Brutal', title: 'Stricter scoring, harsher panel. For launch week.' },
];

type Tab = 'panel' | 'scorecard' | 'rewrite' | 'history';
type Phase = 'idle' | 'convening' | 'streaming' | 'done';

export default function SparWorkspace() {
  const { id } = useParams();
  const spar = useApp((s) => s.spars.find((x) => x.id === id));
  if (!spar) return <NotFound title="Spar not found" body="It may have been deleted, or the link is from another workspace." />;
  return <Workspace key={spar.id} spar={spar} />;
}

function Workspace({ spar }: { spar: Spar }) {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const personas = useApp((s) => s.personas);
  const weights = useApp((s) => s.weights);
  const updateDraft = useApp((s) => s.updateDraft);
  const updateSpar = useApp((s) => s.updateSpar);
  const recordRun = useApp((s) => s.recordRun);
  const saveVersion = useApp((s) => s.saveVersion);
  const createReport = useApp((s) => s.createReport);
  const duplicateSpar = useApp((s) => s.duplicateSpar);
  const deleteSpar = useApp((s) => s.deleteSpar);
  const pushNotification = useApp((s) => s.pushNotification);
  const prefs = useApp((s) => s.notificationPrefs);

  const enabled = useMemo(() => personas.filter((p) => p.enabled), [personas]);
  const [tab, setTab] = useState<Tab>('panel');
  const [phase, setPhase] = useState<Phase>('idle');
  const [run, setRun] = useState<{ snapshot: RunSnapshot; objections: Objection[]; personas: Persona[] } | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [prevResult, setPrevResult] = useState<ScoreResult | null>(null);
  const [justRan, setJustRan] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<ComponentKey, string>>>({});
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [rewriteTick, setRewriteTick] = useState(0);
  const [saveOpen, setSaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const draft = spar.draft;
  const live = useMemo(() => scorePositioning(spar.company, draft, spar.mode, weights), [spar.company, draft, spar.mode, weights]);
  const last = useMemo(() => (spar.lastRun ? scoreSnapshot(spar.lastRun, weights) : null), [spar.lastRun, weights]);
  const statement = composeStatement(spar.company, draft);
  const dirty =
    !spar.lastRun ||
    spar.lastRun.mode !== spar.mode ||
    spar.lastRun.company !== spar.company ||
    COMPONENT_KEYS.some((k) => spar.lastRun!.fields[k] !== draft[k]);
  const busy = phase === 'convening' || phase === 'streaming';

  // Objections for the last saved run (shown when no live run is on screen)
  const staticRun = useMemo(() => {
    if (!spar.lastRun) return null;
    const ps = spar.lastRun.personaIds.map((pid) => personas.find((p) => p.id === pid)).filter(Boolean) as Persona[];
    const list = ps.length ? ps : enabled;
    return { personas: list, objections: generateObjections(spar.lastRun.company, spar.lastRun.fields, spar.lastRun.mode, list, weights) };
  }, [spar.lastRun, personas, enabled, weights]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // ?example=strong deep link (from the command palette)
  useEffect(() => {
    const ex = params.get('example');
    if (ex) {
      const found = EXAMPLES.find((e) => e.id === ex);
      if (found) loadExample(found.id, true);
      params.delete('example');
      setParams(params, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (key: ComponentKey, value: string) => {
    updateDraft(spar.id, { [key]: value });
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function loadExample(exId: string, silent = false) {
    const ex = EXAMPLES.find((e) => e.id === exId)!;
    const before = { draft: { ...spar.draft }, company: spar.company };
    updateSpar(spar.id, { draft: { ...ex.fields }, company: ex.company });
    setErrors({});
    toast({
      tone: 'info',
      title: `Loaded “${ex.label}” (${ex.quality.toLowerCase()})`,
      body: silent ? 'Press Start spar to see how the panel reacts.' : ex.description,
      action: { label: 'Undo', onClick: () => updateSpar(spar.id, before) },
    });
  }

  const clearFields = () => {
    const before = { ...spar.draft };
    updateSpar(spar.id, { draft: { ...EMPTY_FIELDS } });
    toast({ title: 'Fields cleared', action: { label: 'Undo', onClick: () => updateSpar(spar.id, { draft: before }) } });
  };

  const validate = (): boolean => {
    const filled = COMPONENT_KEYS.filter((k) => draft[k].trim());
    let ok = true;
    if (!spar.company.trim()) {
      setCompanyError('Name the company or product');
      ok = false;
    }
    if (filled.length < 2) {
      const errs: Partial<Record<ComponentKey, string>> = {};
      COMPONENT_KEYS.filter((k) => !draft[k].trim())
        .slice(0, 2 - filled.length + 1)
        .forEach((k) => (errs[k] = 'The panel needs at least two components to react to'));
      setErrors(errs);
      ok = false;
    }
    if (!ok) toast({ tone: 'error', title: 'Not enough to spar with yet', body: 'Fill in at least two of the five components.' });
    return ok;
  };

  const start = useCallback(() => {
    if (busy) return;
    if (!validate()) return;
    if (!enabled.length) {
      toast({ tone: 'error', title: 'Your panel is empty', body: 'Turn on at least one persona.', action: { label: 'Manage personas', onClick: () => nav('/personas') } });
      return;
    }
    timers.current.forEach((t) => window.clearTimeout(t));
    setPrevResult(last);
    setJustRan(false);
    setTab('panel');
    setPhase('convening');
    setRevealed(0);
    window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);

    const snapshot: RunSnapshot = {
      id: uid('run'),
      at: new Date().toISOString(),
      fields: { ...draft },
      company: spar.company,
      mode: spar.mode,
      personaIds: enabled.map((p) => p.id),
    };
    const objections = generateObjections(spar.company, draft, spar.mode, enabled, weights);
    const delay = 1300 + Math.round(Math.random() * 500);
    timers.current.push(
      window.setTimeout(() => {
        setRun({ snapshot, objections, personas: enabled });
        setPhase('streaming');
        setRevealed(1);
        recordRun(spar.id, snapshot);
      }, delay),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, draft, spar.company, spar.mode, enabled, weights, last]);

  // Ctrl/Cmd+Enter starts a spar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        start();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [start]);

  const finish = () => {
    setPhase('done');
    setJustRan(true);
    const newScore = run ? scoreSnapshot(run.snapshot, weights).overall : 0;
    const delta = prevResult ? newScore - prevResult.overall : null;
    const deal = run?.objections.filter((o) => o.severity === 'dealbreaker').length ?? 0;
    toast({
      tone: 'success',
      title: `Spar complete: ${newScore}/100${delta !== null && delta !== 0 ? ` (${delta > 0 ? '+' : ''}${delta})` : ''}`,
      body: deal ? `${deal} deal-breaker${deal > 1 ? 's' : ''} to fix. Try Rewrite with Foil.` : 'No deal-breakers. Save it as a version.',
    });
    if (deal && prefs.dealbreakers) {
      pushNotification({ kind: 'objection', title: `${deal} deal-breaker${deal > 1 ? 's' : ''} on ${spar.company}`, body: run!.objections.find((o) => o.severity === 'dealbreaker')!.gut, href: `/spars/${spar.id}` });
    }
  };

  const onCardStreamed = (i: number) => {
    const total = run?.objections.length ?? 0;
    if (i + 1 >= total) finish();
    else timers.current.push(window.setTimeout(() => setRevealed((r) => Math.max(r, i + 2)), 260));
  };

  const skipAhead = () => {
    if (!run) return;
    setRevealed(run.objections.length);
    finish();
  };

  const makeReport = () => {
    if (!spar.lastRun) {
      toast({ tone: 'error', title: 'Run a spar first', body: 'Reports capture a completed spar.' });
      return;
    }
    const r = createReport(spar.id, spar.lastRun, `${spar.company} positioning report`);
    toast({ tone: 'success', title: 'Report created', body: r.title });
    nav(`/reports/${r.id}`);
  };

  const showing = phase === 'idle' ? staticRun : run ? { personas: run.personas, objections: run.objections } : null;
  const displayScore = busy ? null : last;
  const dealCount = showing?.objections.filter((o) => o.severity === 'dealbreaker').length ?? 0;
  const versionScores = spar.versions.map((v) => scoreSnapshot(v, weights).overall);

  return (
    <div className="mx-auto max-w-[1360px] px-4 pb-24 pt-6 sm:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <nav className="flex items-center gap-1 text-[13px] text-sand-500" aria-label="Breadcrumb">
            <Link to="/" className="hover:text-sand-900">
              Spars
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-sand-700">{spar.segment}</span>
          </nav>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <input
              value={spar.company}
              onChange={(e) => {
                updateSpar(spar.id, { company: e.target.value });
                setCompanyError(null);
              }}
              aria-label="Company or product name"
              placeholder="Company name"
              className={cx(
                'display -ml-1.5 w-auto min-w-[120px] max-w-[420px] rounded-md bg-transparent px-1.5 text-[30px] font-semibold text-sand-900 outline-none transition hover:bg-sand-200/50 focus:bg-white focus:ring-2 focus:ring-ember-200',
                companyError && 'ring-2 ring-red-300',
              )}
              size={Math.max(6, spar.company.length + 1)}
            />
            <Menu
              trigger={({ toggle }) => (
                <button onClick={toggle} className="flex items-center gap-1" aria-label="Change status">
                  <Badge tone={STATUS_TONE[spar.status]} dot>
                    {spar.status}
                  </Badge>
                  <ChevronDown className="h-3 w-3 text-sand-400" />
                </button>
              )}
              width="w-48"
              items={(Object.keys(STATUS_TONE) as SparStatus[]).map((s) => ({
                label: s,
                checked: s === spar.status,
                onSelect: () => {
                  updateSpar(spar.id, { status: s });
                  toast({ title: `Status set to ${s}` });
                },
              }))}
            />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-sand-500">
            <span className="flex items-center gap-1.5">
              <Avatar name={spar.owner} size={18} /> {spar.owner}
            </span>
            <span>{spar.product}</span>
            <span>{spar.lastRun ? `Last run ${relativeTime(spar.lastRun.at)}` : 'Not run yet'}</span>
            <span>{spar.versions.length} versions</span>
          </p>
          {companyError && <p className="mt-1 text-xs font-medium text-red-600">{companyError}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Menu
            align="right"
            width="w-80"
            trigger={({ toggle, open }) => (
              <Button onClick={toggle} aria-expanded={open} icon={<FlaskConical className="h-4 w-4" />}>
                Load example <ChevronDown className="h-3.5 w-3.5 text-sand-400" />
              </Button>
            )}
            items={[
              { label: 'Kestrel examples', heading: true },
              ...EXAMPLES.map((ex) => ({
                label: (
                  <span className="block">
                    <span className="flex items-center gap-2 font-medium">
                      {ex.label}
                      <Badge tone={ex.quality === 'Weak' ? 'red' : ex.quality === 'Okay' ? 'amber' : 'green'}>{ex.quality}</Badge>
                    </span>
                    <span className="mt-0.5 block text-xs text-sand-500">{ex.description}</span>
                  </span>
                ),
                onSelect: () => loadExample(ex.id),
              })),
              { divider: true, label: '' },
              { label: 'Clear all fields', icon: <Eraser className="h-4 w-4" />, onSelect: clearFields },
            ]}
          />
          <Menu
            align="right"
            width="w-56"
            trigger={({ toggle }) => (
              <IconButton label="More actions" onClick={toggle} className="border border-sand-200 bg-white shadow-card">
                <MoreHorizontal className="h-4 w-4" />
              </IconButton>
            )}
            items={[
              { label: 'Save as version', icon: <BookmarkPlus className="h-4 w-4" />, onSelect: () => setSaveOpen(true) },
              { label: 'Create report', icon: <FileText className="h-4 w-4" />, onSelect: makeReport },
              {
                label: 'Duplicate spar',
                icon: <CopyPlus className="h-4 w-4" />,
                onSelect: () => {
                  const nid = duplicateSpar(spar.id);
                  if (nid) {
                    toast({ tone: 'success', title: 'Spar duplicated' });
                    nav(`/spars/${nid}`);
                  }
                },
              },
              { label: 'Manage personas', icon: <Users className="h-4 w-4" />, onSelect: () => nav('/personas') },
              { divider: true, label: '' },
              { label: 'Delete spar', icon: <Trash2 className="h-4 w-4" />, danger: true, onSelect: () => setDeleteOpen(true) },
            ]}
          />
        </div>
      </div>

      {/* Main grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <section className="card p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold">Positioning</h2>
                <p className="text-[13px] text-sand-500">April Dunford’s five components, in order. Each one feeds a persona.</p>
              </div>
              <Segmented layoutId="mode" value={spar.mode} onChange={(m) => updateSpar(spar.id, { mode: m })} options={MODES} />
            </div>
            <FieldsEditor fields={draft} onChange={setField} score={live} errors={errors} disabled={busy} />
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-sand-200/80 pt-5">
              <p className="text-[12.5px] text-sand-500">
                {enabled.length} persona{enabled.length === 1 ? '' : 's'} on the panel · {MODES.find((m) => m.value === spar.mode)!.label} mode ·{' '}
                <Link to="/personas" className="font-medium text-sand-700 underline-offset-2 hover:underline">
                  change panel
                </Link>
              </p>
              <div className="flex items-center gap-2">
                <Button icon={<Wand2 className="h-4 w-4" />} onClick={() => { setTab('rewrite'); setRewriteTick((t) => t + 1); window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); }} disabled={busy}>
                  Rewrite with Foil
                </Button>
                <Button variant="primary" size="lg" icon={<Play className="h-4 w-4" />} onClick={start} loading={busy}>
                  {busy ? 'Sparring…' : 'Start spar'}
                  {!busy && <span className="ml-1 hidden rounded bg-white/20 px-1 font-mono text-[10px] sm:inline">{modKey}↵</span>}
                </Button>
              </div>
            </div>
          </section>

          {/* Results */}
          <section ref={resultsRef} className="scroll-mt-4">
            <Tabs
              layoutId="spar-tabs"
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'panel', label: 'Panel', count: showing ? showing.objections.length : undefined },
                { value: 'scorecard', label: 'Scorecard' },
                { value: 'rewrite', label: 'Rewrite' },
                { value: 'history', label: 'History', count: spar.versions.length },
              ]}
            />
            <div className="pt-5">
              <div hidden={tab !== 'panel'}>
                <PanelTab
                  phase={phase}
                  showing={showing}
                  revealed={revealed}
                  enabled={enabled}
                  onCardStreamed={onCardStreamed}
                  onSkip={skipAhead}
                  onStart={start}
                  dealCount={dealCount}
                  onRewrite={() => {
                    setTab('rewrite');
                    setRewriteTick((t) => t + 1);
                  }}
                />
              </div>
              <div hidden={tab !== 'scorecard'}>
                {displayScore ? (
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                    <div className="card p-5">
                      <p className="label">Shape of your positioning</p>
                      <ScoreRadar result={displayScore} previous={justRan ? prevResult : null} />
                      <p className="text-center text-xs text-sand-500">
                        {justRan && prevResult ? 'Dashed line: previous run' : 'Each axis is one Dunford component, 0–100'}
                      </p>
                    </div>
                    <div className="card p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <p className="label">Component scores</p>
                        <Link to="/settings/scoring" className="text-xs font-medium text-ember-600 hover:text-ember-700">
                          Adjust weights
                        </Link>
                      </div>
                      <ComponentBars result={displayScore} previous={justRan ? prevResult : null} weights={weights} />
                      <div className="mt-4 rounded-lg bg-sand-50 p-3 text-[12.5px] text-sand-600">
                        <span className="font-semibold text-sand-800">Readability {displayScore.readability.adjustment >= 0 ? '+' : ''}{displayScore.readability.adjustment}: </span>
                        {displayScore.readability.note}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card">
                    <EmptyState icon={<Gauge className="h-5 w-5" />} title={busy ? 'Scoring in progress…' : 'No scorecard yet'} body="Run a spar to score each component and see the radar." action={!busy && <Button variant="primary" onClick={start}>Start spar</Button>} />
                  </div>
                )}
              </div>
              <div hidden={tab !== 'rewrite'}>
                <RewritePanel
                  company={spar.company}
                  fields={draft}
                  mode={spar.mode}
                  weights={weights}
                  autoStart={rewriteTick}
                  busy={busy}
                  onApply={(f) => updateDraft(spar.id, f)}
                  onUndo={(f) => updateSpar(spar.id, { draft: f })}
                  onRerun={start}
                />
              </div>
              <div hidden={tab !== 'history'}>
                <HistoryPanel
                  spar={spar}
                  weights={weights}
                  onSave={() => setSaveOpen(true)}
                  onRestore={(v) => {
                    const before = { ...spar.draft };
                    updateSpar(spar.id, { draft: { ...v.fields }, mode: v.mode });
                    toast({ title: `Restored “${v.label || 'version'}” into your draft`, action: { label: 'Undo', onClick: () => updateSpar(spar.id, { draft: before }) } });
                  }}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Right rail */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="label">Positioning statement</p>
              <IconButton
                label="Copy statement"
                className="h-7 w-7"
                onClick={async () => toast((await copyText(statement)) ? { tone: 'success', title: 'Statement copied' } : { tone: 'error', title: 'Couldn’t access the clipboard' })}
              >
                <Copy className="h-3.5 w-3.5" />
              </IconButton>
            </div>
            <StatementPreview company={spar.company} fields={draft} />
            <div className="mt-4 space-y-2 border-t border-sand-200/80 pt-3">
              <PreviewLegend />
              <p className="text-[11.5px] text-sand-500">
                {wordCount(statement)} words · first line ≈ {readAloudSeconds(leadSentence(statement))}s out loud
              </p>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <p className="label">Spar score</p>
              {displayScore && prevResult && justRan && <DeltaChip delta={displayScore.overall - prevResult.overall} />}
            </div>
            <AnimatePresence mode="wait">
              {busy ? (
                <motion.div key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-4 py-4">
                  <div className="relative h-[112px] w-[112px]">
                    <div className="absolute inset-0 animate-spin rounded-full border-[10px] border-sand-200 border-t-ember-500" style={{ animationDuration: '1.4s' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">The panel is scoring…</p>
                    <p className="text-xs text-sand-500">
                      {phase === 'convening' ? 'Convening your panel' : `${Math.min(revealed, run?.objections.length ?? 0)} of ${run?.objections.length ?? 0} have spoken`}
                    </p>
                  </div>
                </motion.div>
              ) : displayScore ? (
                <motion.div key="score" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-2">
                  <div className="flex items-center gap-5">
                    <ScoreRing score={displayScore.overall} from={justRan ? prevResult?.overall ?? 0 : undefined} size={112} />
                    <ul className="flex-1 space-y-1.5">
                      {COMPONENT_KEYS.map((k) => (
                        <li key={k} className="flex items-center gap-2 text-[12px]">
                          <span className={cx('h-1.5 w-1.5 rounded-full', COMPONENT_COLORS[k].bg)} />
                          <span className="flex-1 text-sand-600">{COMPONENT_SHORT[k]}</span>
                          <span className="font-semibold tabular-nums">{displayScore.components[k].score}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {dirty && (
                    <div className="mt-4 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900 ring-1 ring-inset ring-amber-200">
                      <span>
                        Draft changed · live estimate <span className="font-semibold tabular-nums">{live.overall}</span>
                      </span>
                      <button onClick={start} className="font-semibold text-amber-900 underline-offset-2 hover:underline">
                        Re-run
                      </button>
                    </div>
                  )}
                  {justRan && !dirty && (
                    <Button className="mt-4 w-full" icon={<BookmarkPlus className="h-4 w-4" />} onClick={() => setSaveOpen(true)}>
                      Save as version
                    </Button>
                  )}
                </motion.div>
              ) : (
                <motion.div key="none" className="py-3">
                  <div className="flex items-center gap-4">
                    <ScoreRing score={live.overall} size={96} label={false} />
                    <div>
                      <p className="text-sm font-semibold">Live estimate</p>
                      <p className="text-xs text-sand-500">Updates as you type. Start a spar to hear the panel and lock in a score.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {versionScores.length > 0 && (
            <button onClick={() => { setTab('history'); resultsRef.current?.scrollIntoView({ behavior: 'smooth' }); }} className="card flex w-full items-center gap-4 p-4 text-left transition hover:border-sand-300">
              <div className="flex-1">
                <p className="label">Version trend</p>
                <p className="mt-0.5 text-sm text-sand-700">
                  {versionScores.length} saved · {versionScores[0]} → {versionScores[versionScores.length - 1]}
                </p>
              </div>
              <Sparkline values={versionScores} width={110} height={40} />
            </button>
          )}
        </aside>
      </div>

      <SaveVersionModal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        defaultLabel={`v${spar.versions.length + 1}${justRan ? ' · after spar' : ''}`}
        dirty={dirty}
        onSave={(label) => {
          const v = saveVersion(spar.id, label, { fields: { ...draft }, company: spar.company, mode: spar.mode, personaIds: enabled.map((p) => p.id) });
          setSaveOpen(false);
          if (v) {
            const s = scoreSnapshot(v, weights).overall;
            toast({ tone: 'success', title: `Saved “${label}”`, body: `Score ${s}. See the trend in History.`, action: { label: 'View', onClick: () => setTab('history') } });
          }
        }}
      />
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Delete ${spar.company}?`}
        description="This removes the spar, its versions and its reports for everyone in the workspace."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              data-autofocus
              onClick={() => {
                deleteSpar(spar.id);
                toast({ title: `${spar.company} deleted` });
                nav('/');
              }}
            >
              Delete spar
            </Button>
          </>
        }
      />
    </div>
  );
}

function PanelTab({
  phase,
  showing,
  revealed,
  enabled,
  onCardStreamed,
  onSkip,
  onStart,
  onRewrite,
  dealCount,
}: {
  phase: Phase;
  showing: { personas: Persona[]; objections: Objection[] } | null;
  revealed: number;
  enabled: Persona[];
  onCardStreamed: (i: number) => void;
  onSkip: () => void;
  onStart: () => void;
  onRewrite: () => void;
  dealCount: number;
}) {
  if (phase === 'convening') {
    return (
      <div className="card overflow-hidden">
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <div className="flex -space-x-2">
            {enabled.map((p, i) => (
              <motion.span key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}>
                <Avatar name={p.name} color={p.color} size={44} ring />
              </motion.span>
            ))}
          </div>
          <p className="display mt-5 text-xl font-semibold">Convening your panel…</p>
          <p className="mt-1 text-sm text-sand-500">Each persona is reading your statement through their own lens.</p>
          <div className="mt-5 h-1 w-56 overflow-hidden rounded-full bg-sand-200">
            <motion.div className="h-full bg-ember-500" initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: 1.5, ease: 'easeInOut' }} />
          </div>
        </div>
      </div>
    );
  }
  if (!showing) {
    return (
      <div className="card">
        <EmptyState
          icon={<Swords className="h-5 w-5" />}
          title="Your panel hasn’t seen this yet"
          body={`Start a spar and ${enabled.length} buyer-side personas will attack your positioning, one at a time.`}
          action={
            <Button variant="primary" icon={<Play className="h-4 w-4" />} onClick={onStart}>
              Start spar
            </Button>
          }
        />
      </div>
    );
  }
  const streaming = phase === 'streaming';
  const visible = streaming ? showing.objections.slice(0, revealed) : showing.objections;
  const waiting = streaming ? showing.personas.slice(revealed) : [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-sand-600">
          {streaming ? (
            <>The panel is responding…</>
          ) : (
            <>
              <span className="font-semibold text-sand-900">{dealCount}</span> deal-breaker{dealCount === 1 ? '' : 's'},{' '}
              <span className="font-semibold text-sand-900">{showing.objections.filter((o) => o.severity === 'serious').length}</span> serious,{' '}
              <span className="font-semibold text-sand-900">{showing.objections.filter((o) => o.severity === 'minor').length}</span> minor
              {phase === 'idle' && <span className="text-sand-400"> · from the last run</span>}
            </>
          )}
        </p>
        {streaming ? (
          <Button size="sm" variant="ghost" icon={<FastForward className="h-3.5 w-3.5" />} onClick={onSkip}>
            Show all now
          </Button>
        ) : (
          dealCount > 0 && (
            <Button size="sm" icon={<Sparkles className="h-3.5 w-3.5 text-ember-500" />} onClick={onRewrite}>
              Fix with a rewrite
            </Button>
          )
        )}
      </div>
      {visible.map((o, i) => {
        const p = showing.personas.find((x) => x.id === o.personaId)!;
        return <PersonaCard key={`${phase}-${o.personaId}-${i}`} persona={p} objection={o} stream={streaming} onStreamed={() => onCardStreamed(i)} />;
      })}
      {waiting.slice(0, 3).map((p) => (
        <PersonaCardSkeleton key={p.id} persona={p} />
      ))}
    </div>
  );
}

function SaveVersionModal({ open, onClose, onSave, defaultLabel, dirty }: { open: boolean; onClose: () => void; onSave: (label: string) => void; defaultLabel: string; dirty: boolean }) {
  const [label, setLabel] = useState(defaultLabel);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setLabel(defaultLabel);
      setErr(null);
    }
  }, [open, defaultLabel]);
  const submit = () => {
    if (!label.trim()) return setErr('Give this version a name');
    if (label.trim().length > 60) return setErr('Keep it under 60 characters');
    onSave(label.trim());
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Save as version"
      description={dirty ? 'Your draft has changed since the last spar. The version saves the draft as it is now.' : 'Saves the fields, pressure mode and score from this spar.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            Save version
          </Button>
        </>
      }
    >
      <Field label="Version name" error={err} hint="e.g. “After CFO interviews” or “Launch final”" htmlFor="version-label">
        <input
          id="version-label"
          className={cx('input', err && 'input-error')}
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            setErr(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </Field>
    </Modal>
  );
}
