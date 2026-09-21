import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Copy, Play, RotateCcw, Sparkles, Wand2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { diffStats, diffWords } from '../../logic/diff';
import { rewritePositioning, type RewriteResult } from '../../logic/rewrite';
import { COMPONENT_LABELS, scorePositioning } from '../../logic/scoring';
import type { ComponentKey, Fields, PressureMode, Weights } from '../../logic/types';
import { copyText, toast } from '../../store/ui';
import { Button, Segmented, Skeleton, cx } from '../ui';
import { COMPONENT_COLORS, DeltaChip, Highlighted, StreamText } from './bits';
import { DiffView } from './panels';

type Phase = 'idle' | 'thinking' | 'streaming' | 'ready' | 'applied';

const THINKING = ['Reading your five components…', 'Stripping buzzwords…', 'Checking for a named alternative…', 'Marking the gaps…'];

interface Props {
  company: string;
  fields: Fields;
  mode: PressureMode;
  weights: Weights;
  autoStart: number; // bump to start a rewrite from outside
  onApply: (fields: Fields) => void;
  onUndo: (fields: Fields) => void;
  onRerun: () => void;
  busy: boolean;
}

export function RewritePanel({ company, fields, mode, weights, autoStart, onApply, onUndo, onRerun, busy }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<RewriteResult | null>(null);
  const [view, setView] = useState<'diff' | 'clean'>('diff');
  const [thinkIdx, setThinkIdx] = useState(0);
  const [base, setBase] = useState<Fields | null>(null); // fields the rewrite was generated from

  const hasContent = Object.values(fields).some((v) => v.trim());

  const start = () => {
    if (!hasContent) {
      toast({ tone: 'error', title: 'Nothing to rewrite yet', body: 'Fill in at least one component first.' });
      return;
    }
    const r = rewritePositioning(company, fields);
    setResult(r);
    setBase({ ...fields });
    setPhase('thinking');
    setThinkIdx(0);
    setView('diff');
  };

  useEffect(() => {
    if (autoStart > 0) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  useEffect(() => {
    if (phase !== 'thinking') return;
    const id = window.setInterval(() => setThinkIdx((i) => Math.min(THINKING.length - 1, i + 1)), 380);
    const done = window.setTimeout(() => setPhase('streaming'), 1500);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(done);
    };
  }, [phase]);

  const before = useMemo(() => scorePositioning(company, base ?? fields, mode, weights), [company, base, fields, mode, weights]);
  const after = useMemo(() => (result ? scorePositioning(company, result.fields, mode, weights) : null), [company, result, mode, weights]);
  const ops = useMemo(() => (result ? diffWords(result.before, result.statement) : []), [result]);
  const stats = diffStats(ops);

  const grouped = useMemo(() => {
    const g: Partial<Record<ComponentKey, string[]>> = {};
    result?.changes.forEach((c) => (g[c.component] ??= []).push(c.note));
    return g;
  }, [result]);

  if (phase === 'idle') {
    return (
      <div className="card flex flex-col items-center px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ember-50 text-ember-600 ring-1 ring-ember-200">
          <Wand2 className="h-5 w-5" />
        </div>
        <h3 className="mt-4 text-[15px] font-semibold">Rewrite with Foil</h3>
        <p className="mt-1 max-w-md text-sm text-sand-600">
          Foil rewrites your statement from your own five fields: it strips buzzwords, adds the specificity the panel asked for, and marks anything only you can
          supply as a <span className="hl-placeholder">[gap]</span>.
        </p>
        <Button variant="primary" className="mt-5" icon={<Sparkles className="h-4 w-4" />} onClick={start} disabled={!hasContent}>
          Rewrite with Foil
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sand-200/80 px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-ember-500" />
            {phase === 'thinking' ? 'Rewriting…' : phase === 'applied' ? 'Rewrite applied' : 'Suggested rewrite'}
          </div>
          {(phase === 'ready' || phase === 'applied') && (
            <Segmented
              size="sm"
              layoutId="rw-view"
              value={view}
              onChange={setView}
              options={[
                { value: 'diff', label: 'Changes' },
                { value: 'clean', label: 'Clean' },
              ]}
            />
          )}
        </div>
        <div className="px-5 py-5">
          {phase === 'thinking' && (
            <div className="space-y-3" aria-live="polite">
              <p className="text-sm text-sand-500">{THINKING[thinkIdx]}</p>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          )}
          {phase === 'streaming' && result && (
            <p className="display text-[18px] leading-[1.7] text-sand-900">
              <StreamText text={result.statement} speed={32} highlight onDone={() => setPhase('ready')} />
            </p>
          )}
          {(phase === 'ready' || phase === 'applied') && result && (
            <AnimatePresence mode="wait">
              <motion.div key={view} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                {view === 'diff' ? (
                  <DiffView ops={ops} />
                ) : (
                  <p className="display text-[18px] leading-[1.7] text-sand-900">
                    <Highlighted text={result.statement} />
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {(phase === 'ready' || phase === 'applied') && result && after && (
          <div className="grid gap-px border-t border-sand-200/80 bg-sand-200/80 sm:grid-cols-4">
            <Stat label="Words removed" value={stats.removed} tone="text-red-600" />
            <Stat label="Words added" value={stats.added} tone="text-emerald-600" />
            <Stat label="Gaps to fill" value={result.placeholders} tone="text-amber-700" />
            <div className="bg-[#fffdf9] px-5 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-sand-500">Projected score</p>
              <p className="mt-0.5 flex items-center gap-2 text-lg font-semibold tabular-nums">
                {before.overall} <ArrowRight className="h-3.5 w-3.5 text-sand-400" /> {after.overall}
                <DeltaChip delta={after.overall - before.overall} />
              </p>
            </div>
          </div>
        )}
      </div>

      {(phase === 'ready' || phase === 'applied') && result && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="card p-5">
            <p className="label mb-3">What Foil changed, and why</p>
            <ul className="space-y-3">
              {(Object.keys(grouped) as ComponentKey[]).map((k) => (
                <li key={k} className="flex gap-3">
                  <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', COMPONENT_COLORS[k].bg)} />
                  <div>
                    <p className="text-[13px] font-semibold text-sand-900">{COMPONENT_LABELS[k]}</p>
                    <ul className="mt-0.5 space-y-0.5">
                      {grouped[k]!.map((n, i) => (
                        <li key={i} className="text-[13px] leading-snug text-sand-600">
                          {n}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="card flex flex-col gap-2 p-5 lg:w-64">
            {phase === 'ready' ? (
              <>
                <Button
                  variant="primary"
                  icon={<Check className="h-4 w-4" />}
                  onClick={() => {
                    onApply(result.fields);
                    setPhase('applied');
                    toast({
                      tone: 'success',
                      title: 'Rewrite applied to your fields',
                      body: result.placeholders ? `Fill the ${result.placeholders} gaps, then re-run the spar.` : 'Re-run the spar to see the new score.',
                      action: { label: 'Undo', onClick: () => base && onUndo(base) },
                    });
                  }}
                >
                  Apply rewrite
                </Button>
                <Button
                  icon={<Copy className="h-4 w-4" />}
                  onClick={async () => toast((await copyText(result.statement)) ? { tone: 'success', title: 'Rewrite copied' } : { tone: 'error', title: 'Couldn’t access the clipboard' })}
                >
                  Copy text
                </Button>
                <Button variant="ghost" icon={<RotateCcw className="h-4 w-4" />} onClick={start}>
                  Regenerate
                </Button>
                <button onClick={() => setPhase('idle')} className="mt-1 text-xs text-sand-500 hover:text-sand-800">
                  Discard
                </button>
              </>
            ) : (
              <>
                <p className="text-[13px] leading-snug text-sand-600">
                  Applied. {result.placeholders ? <>Fill the highlighted gaps in your fields, then re-run to see how the panel reacts.</> : <>Re-run the spar to lock in the new score.</>}
                </p>
                <Button variant="primary" icon={<Play className="h-4 w-4" />} onClick={onRerun} loading={busy} className="relative">
                  {!busy && <span className="absolute inset-0 animate-ping rounded-lg bg-ember-400/30" />}
                  Re-run spar
                </Button>
                <Button
                  variant="ghost"
                  icon={<RotateCcw className="h-4 w-4" />}
                  onClick={() => {
                    if (base) onUndo(base);
                    setPhase('ready');
                    toast({ title: 'Rewrite undone', body: 'Your fields are back to how they were.' });
                  }}
                >
                  Undo rewrite
                </Button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="bg-[#fffdf9] px-5 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-sand-500">{label}</p>
      <p className={cx('mt-0.5 text-lg font-semibold tabular-nums', tone)}>{value}</p>
    </div>
  );
}
