import { motion } from 'framer-motion';
import { GitCompare, History, RotateCcw, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { composeStatement } from '../../logic/compose';
import { diffWords } from '../../logic/diff';
import { formatDateTime, relativeTime } from '../../logic/format';
import { scoreSnapshot } from '../../logic/scoring';
import type { RunSnapshot, Spar, Weights } from '../../logic/types';
import { Badge, Button, EmptyState, Modal, cx } from '../ui';
import { ScorePill } from './bits';
import { Sparkline } from './charts';
import { DiffView } from './panels';

const MODE_TONE = { friendly: 'green', tough: 'amber', brutal: 'red' } as const;

export function HistoryPanel({ spar, weights, onRestore, onSave }: { spar: Spar; weights: Weights; onRestore: (v: RunSnapshot) => void; onSave: () => void }) {
  const [compare, setCompare] = useState<RunSnapshot | null>(null);
  const scored = useMemo(() => spar.versions.map((v) => ({ v, score: scoreSnapshot(v, weights).overall })), [spar.versions, weights]);
  const values = scored.map((s) => s.score);
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;

  if (!spar.versions.length) {
    return (
      <div className="card">
        <EmptyState
          icon={<History className="h-5 w-5" />}
          title="No saved versions yet"
          body="Save a version after each spar to track how your positioning improves. Every version keeps its fields, pressure mode and score."
          action={
            <Button variant="primary" icon={<Save className="h-4 w-4" />} onClick={onSave}>
              Save current as version
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-6 p-5">
        <div>
          <p className="label">Score trend</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {first} → {last}{' '}
            <span className={cx('text-base', last - first >= 0 ? 'text-emerald-600' : 'text-red-600')}>
              ({last - first >= 0 ? '+' : ''}
              {last - first})
            </span>
          </p>
          <p className="text-xs text-sand-500">
            across {values.length} version{values.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="min-w-[200px] flex-1">
          <Sparkline values={values} height={64} width="100%" />
        </div>
        <Button icon={<Save className="h-4 w-4" />} onClick={onSave}>
          Save current as version
        </Button>
      </div>

      <ol className="card divide-y divide-sand-200/70">
        {[...scored].reverse().map(({ v, score }, idx) => {
          const i = scored.length - 1 - idx;
          const prev = i > 0 ? scored[i - 1].score : null;
          const delta = prev === null ? null : score - prev;
          return (
            <motion.li key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand-100 text-xs font-bold text-sand-600">v{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-sand-900">
                  {v.label || `Version ${i + 1}`}
                  <Badge tone={MODE_TONE[v.mode]}>{v.mode}</Badge>
                  {i === scored.length - 1 && <Badge tone="ember">Latest</Badge>}
                </p>
                <p className="mt-0.5 text-xs text-sand-500" title={formatDateTime(v.at)}>
                  Saved {relativeTime(v.at)} · {composeStatement(v.company, v.fields).slice(0, 90)}…
                </p>
              </div>
              {delta !== null && (
                <span className={cx('w-10 text-right text-xs font-semibold tabular-nums', delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-sand-400')}>
                  {delta > 0 ? '+' : ''}
                  {delta}
                </span>
              )}
              <ScorePill score={score} />
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" icon={<GitCompare className="h-3.5 w-3.5" />} onClick={() => setCompare(v)}>
                  Compare
                </Button>
                <Button size="sm" variant="ghost" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => onRestore(v)}>
                  Restore
                </Button>
              </div>
            </motion.li>
          );
        })}
      </ol>

      <Modal
        open={!!compare}
        onClose={() => setCompare(null)}
        width="max-w-2xl"
        title={compare ? `${compare.label || 'Version'} → current draft` : ''}
        description="Struck-through words exist only in the saved version; highlighted words are new in your current draft."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCompare(null)}>
              Close
            </Button>
            <Button
              variant="primary"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={() => {
                if (compare) onRestore(compare);
                setCompare(null);
              }}
            >
              Restore this version
            </Button>
          </>
        }
      >
        {compare && (
          <div className="rounded-xl bg-sand-50 p-4">
            <DiffView ops={diffWords(composeStatement(compare.company, compare.fields), composeStatement(spar.company, spar.draft))} />
          </div>
        )}
      </Modal>
    </div>
  );
}
